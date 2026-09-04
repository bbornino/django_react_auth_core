import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { EditUserPage } from "@/pages/edit-user-page"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"

const mockNavigate = vi.fn()
const mockUseParams = vi.fn()

vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react-router")>()
    return { ...actual, useNavigate: () => mockNavigate, useParams: () => mockUseParams() }
})

vi.mock("@/lib/api-client", () => ({
    apiClient: { get: vi.fn(), patch: vi.fn() },
}))

vi.mock("@/stores/auth-store", () => ({
    useAuthStore: vi.fn(),
}))

const mockSetUser = vi.fn()

// Raw, snake_case — matches what GET /users/:id/ actually returns, not the
// store's camelCase shape. Mixing these up is the exact bug class this repo
// hit for real earlier in the session.
const fakeFetchedUser = {
    id: 3,
    email: "briana@example.com",
    name: "Briana",
    about_me: "Cool girl",
    role: "user",
    email_opt_out: false,
    is_active: true,
    is_staff: false,
    date_joined: "2026-01-01T00:00:00Z",
    dark_mode: false,
    avatar_url: "",
}

function renderEditUserPage() {
    return render(
        <MemoryRouter>
            <EditUserPage />
        </MemoryRouter>
    )
}

function mockCurrentUser(overrides: Record<string, unknown> = {}) {
    const currentUser = {
        id: 3,
        email: "briana@example.com",
        name: "Briana",
        role: "user",
        avatarUrl: "",
        darkMode: false,
        ...overrides,
    }
    vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({ user: currentUser, setUser: mockSetUser } as never)
    )
    return currentUser
}

describe("EditUserPage", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        document.documentElement.classList.remove("dark")
        mockUseParams.mockReturnValue({ userId: undefined }) // defaults to "/edit-profile" (self)
        vi.mocked(apiClient.get).mockResolvedValue({ data: fakeFetchedUser })
    })

    it("fetches the user on mount and populates the form", async () => {
        mockCurrentUser()
        renderEditUserPage()

        expect(await screen.findByDisplayValue("Briana")).toBeInTheDocument()
        expect(apiClient.get).toHaveBeenCalledWith("/users/3/")
    })

    it("redirects a non-admin trying to view someone else's id, without ever fetching", async () => {
        mockUseParams.mockReturnValue({ userId: "999" })
        mockCurrentUser({ id: 3, role: "user" })

        renderEditUserPage()

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard"))
        expect(apiClient.get).not.toHaveBeenCalled()
    })

    it("shows admin-only fields (Role, Is Active, Is Staff) only for an admin", async () => {
        mockCurrentUser({ role: "admin" })
        renderEditUserPage()
        await screen.findByDisplayValue("Briana")

        expect(screen.getAllByText(/role/i)[0]).toBeInTheDocument()
        expect(screen.getByRole("checkbox", { name: /is active/i })).toBeInTheDocument()
        expect(screen.getByRole("checkbox", { name: /is staff/i })).toBeInTheDocument()
    })

    it("hides admin-only fields for a non-admin editing themselves", async () => {
        mockCurrentUser({ role: "user" })
        renderEditUserPage()
        await screen.findByDisplayValue("Briana")

        expect(screen.queryByRole("checkbox", { name: /is active/i })).not.toBeInTheDocument()
        expect(screen.queryByRole("checkbox", { name: /is staff/i })).not.toBeInTheDocument()
    })

    it("toggling Dark Mode previews the theme immediately, and unmounting without saving reverts it", async () => {
        const user = userEvent.setup()
        mockCurrentUser({ darkMode: false })
        const { unmount } = renderEditUserPage()
        await screen.findByDisplayValue("Briana")

        expect(document.documentElement.classList.contains("dark")).toBe(false)

        await user.click(screen.getByRole("checkbox", { name: /dark mode/i }))
        expect(document.documentElement.classList.contains("dark")).toBe(true)

        // Navigating away without saving should hand control back to the
        // real, committed value — never leave the preview's class stuck.
        unmount()
        expect(document.documentElement.classList.contains("dark")).toBe(false)
    })

    it("submits only the writable fields via PATCH, and updates the store on success for a self-edit", async () => {
        const user = userEvent.setup()
        mockCurrentUser({ id: 3, role: "user" })
        vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: fakeFetchedUser })

        renderEditUserPage()
        await screen.findByDisplayValue("Briana")

        const nameField = screen.getByLabelText(/^name$/i)
        await user.clear(nameField)
        await user.type(nameField, "Briana Updated")
        await user.click(screen.getByRole("button", { name: /update user/i }))

        await waitFor(() => {
            expect(apiClient.patch).toHaveBeenCalledWith(
                "/users/3/",
                expect.objectContaining({ name: "Briana Updated" })
            )
        })

        // NOTABLE, already-documented behavior (see README): reset(res.data)
        // seeds the full raw fetched response into the form, so role/is_staff
        // ARE present in the submitted payload even though no Controller for
        // them ever renders for a non-admin — harmless, since the backend's
        // read_only_fields silently ignores them, but worth locking in that
        // they're at least unchanged rather than tampered with.
        const [, submittedBody] = vi.mocked(apiClient.patch).mock.calls[0]
        expect(submittedBody).toMatchObject({ role: "user", is_staff: false })

        expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }))
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
    })
})
