import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { NavBar } from "@/components/nav-bar"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"

const mockNavigate = vi.fn()
vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react-router")>()
    return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock("@/lib/api-client", () => ({
    apiClient: { post: vi.fn() },
}))

vi.mock("@/stores/auth-store", () => ({
    useAuthStore: vi.fn(),
}))

const mockLogout = vi.fn()

function mockAuthState(overrides: { isAuthenticated: boolean; user?: Record<string, unknown> }) {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
            isAuthenticated: overrides.isAuthenticated,
            logout: mockLogout,
            user: overrides.user ?? null,
        } as never)
    )
}

function renderNavBar() {
    return render(
        <MemoryRouter>
            <NavBar />
        </MemoryRouter>
    )
}

describe("NavBar", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("shows Login/Register and hides Dashboard/account menu when logged out", () => {
        mockAuthState({ isAuthenticated: false })
        renderNavBar()

        expect(screen.getByText("Login")).toBeInTheDocument()
        expect(screen.getByText("Register")).toBeInTheDocument()
        expect(screen.queryByText("Dashboard")).not.toBeInTheDocument()
    })

    it("shows Dashboard and the account menu, hides Login/Register, when logged in", () => {
        mockAuthState({ isAuthenticated: true, user: { name: "Briana", email: "b@example.com" } })
        renderNavBar()

        expect(screen.getByText("Dashboard")).toBeInTheDocument()
        expect(screen.getByText("Briana")).toBeInTheDocument()
        expect(screen.queryByText("Login")).not.toBeInTheDocument()
        expect(screen.queryByText("Register")).not.toBeInTheDocument()
    })

    it("falls back to email in the account menu trigger when name is blank", () => {
        mockAuthState({ isAuthenticated: true, user: { name: "", email: "b@example.com" } })
        renderNavBar()

        expect(screen.getByText("b@example.com")).toBeInTheDocument()
    })

    it("logout: calls the API, clears the store, and navigates to /login even if the API call fails", async () => {
        const user = userEvent.setup()
        mockAuthState({ isAuthenticated: true, user: { name: "Briana", email: "b@example.com" } })
        vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("network down"))

        renderNavBar()
        await user.click(screen.getByText("Briana"))
        await user.click(await screen.findByText("Logout"))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith("/auth/logout")
        })
        // The whole point of the try/catch in handleLogout: a failed network
        // call must never block the client-side logout from completing.
        expect(mockLogout).toHaveBeenCalled()
        expect(mockNavigate).toHaveBeenCalledWith("/login")
    })
})
