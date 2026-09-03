import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ListUsersPage } from "@/pages/list-users-page"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"

const mockNavigate = vi.fn()
vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react-router")>()
    return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock("@/lib/api-client", () => ({
    apiClient: { get: vi.fn() },
}))

vi.mock("@/stores/auth-store", () => ({
    useAuthStore: vi.fn(),
}))

function mockCurrentUser(role: string) {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({ user: { id: 1, role } } as never)
    )
}

const fakeUsers = [
    { id: 3, email: "briana@example.com", name: "Briana", is_active: true, avatar_url: "" },
    { id: 7, email: "brian@example.com", name: "Brian", is_active: true, avatar_url: "" },
]

function renderListUsersPage() {
    return render(
        <MemoryRouter>
            <ListUsersPage />
        </MemoryRouter>
    )
}

describe("ListUsersPage", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(apiClient.get).mockResolvedValue({ data: fakeUsers })
    })

    it("redirects a non-admin away, without ever fetching the user list", async () => {
        // Same guard pattern as EditUserPage's — separate code path, so it
        // could silently diverge and break independently even though
        // EditUserPage's own version is already proven correct elsewhere.
        mockCurrentUser("user")
        renderListUsersPage()

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard"))
        expect(apiClient.get).not.toHaveBeenCalled()
    })

    it("fetches and renders the real user list for an admin, through the real DataTable", async () => {
        mockCurrentUser("admin")
        renderListUsersPage()

        expect(await screen.findByText("Briana")).toBeInTheDocument()
        expect(screen.getByText("Brian")).toBeInTheDocument()
        expect(screen.getByText("briana@example.com")).toBeInTheDocument()
        expect(apiClient.get).toHaveBeenCalledWith("/users/")
    })

    it("clicking a row navigates to that user's edit-profile page", async () => {
        const user = userEvent.setup()
        mockCurrentUser("admin")
        renderListUsersPage()

        const row = await screen.findByText("Briana")
        await user.click(row)

        expect(mockNavigate).toHaveBeenCalledWith("/edit-profile/3")
    })

    it("redirects to /dashboard if the fetch itself fails", async () => {
        mockCurrentUser("admin")
        vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("network down"))
        renderListUsersPage()

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard"))
    })
})
