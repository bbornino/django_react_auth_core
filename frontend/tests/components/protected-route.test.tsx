import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route, useLocation } from "react-router"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuthStore } from "@/stores/auth-store"

vi.mock("@/stores/auth-store", () => ({
    useAuthStore: vi.fn(),
}))

function mockAuthenticated(isAuthenticated: boolean) {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({ isAuthenticated } as never)
    )
}

// Stand-in for the real login page, just enough to prove (a) we actually
// landed here and (b) the attempted route survived the redirect in
// location.state — that's the piece ProtectedRoute is responsible for
// handing off, so it's worth asserting on directly, not just "we got here."
function LoginStandIn() {
    const location = useLocation()
    const from = (location.state as { from?: { pathname: string } } | null)?.from
    return <div>Login page (from: {from?.pathname ?? "none"})</div>
}

function renderAt(path: string) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/login" element={<LoginStandIn />} />
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<div>Dashboard content</div>} />
                </Route>
            </Routes>
        </MemoryRouter>
    )
}

describe("ProtectedRoute", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("renders the protected child route when authenticated", () => {
        mockAuthenticated(true)
        renderAt("/dashboard")

        expect(screen.getByText("Dashboard content")).toBeInTheDocument()
        expect(screen.queryByText(/login page/i)).not.toBeInTheDocument()
    })

    it("redirects to /login when not authenticated", () => {
        mockAuthenticated(false)
        renderAt("/dashboard")

        expect(screen.getByText(/login page/i)).toBeInTheDocument()
        expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument()
    })

    it("preserves the originally-attempted path in navigation state, for redirect-back after login", () => {
        mockAuthenticated(false)
        renderAt("/dashboard")

        expect(screen.getByText("Login page (from: /dashboard)")).toBeInTheDocument()
    })
})
