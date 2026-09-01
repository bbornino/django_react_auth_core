// pylint-equivalent note: test names carry the documentation here.
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { LoginPage } from "@/pages/login-page"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"

// react-router's Link/MemoryRouter work fine unmocked — only useNavigate
// needs a spy, since we can't observe an in-app navigation any other way
// from outside a real browser.
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

const mockSetAuth = vi.fn()

function renderLoginPage() {
    return render(
        <MemoryRouter>
            <LoginPage />
        </MemoryRouter>
    )
}

describe("LoginPage", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // useAuthStore is called as a selector: useAuthStore(state => state.setAuth).
        // Feeding the selector a fake state object keeps this test decoupled
        // from the store's real internals — it only needs to know setAuth exists.
        vi.mocked(useAuthStore).mockImplementation((selector) =>
            selector({ setAuth: mockSetAuth } as never)
        )
    })

    it("renders email, password, and a submit button", () => {
        renderLoginPage()
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument()
    })

    it("on successful login, maps the response and navigates to /dashboard", async () => {
        const user = userEvent.setup()
        vi.mocked(apiClient.post).mockResolvedValueOnce({
            data: {
                access: "fake-access-token",
                user: {
                    id: 1,
                    email: "brian@example.com",
                    name: "Brian",
                    role: "user",
                    avatar_url: "",
                    dark_mode: false,
                },
            },
        })

        renderLoginPage()
        await user.type(screen.getByLabelText(/email/i), "brian@example.com")
        await user.type(screen.getByLabelText(/password/i), "correct-password-1")
        await user.click(screen.getByRole("button", { name: /log in/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                "/auth/login/",
                expect.objectContaining({ email: "brian@example.com" })
            )
        })

        // The real assertion: the raw snake_case response actually got
        // translated before reaching the store — not just "setAuth was called."
        expect(mockSetAuth).toHaveBeenCalledWith(
            expect.objectContaining({ avatarUrl: "", darkMode: false, name: "Brian" }),
            "fake-access-token"
        )
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
    })

    it("on a 401, shows 'Incorrect email or password' and does not navigate", async () => {
        const user = userEvent.setup()
        vi.mocked(apiClient.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 401, data: {} },
        })

        renderLoginPage()
        await user.type(screen.getByLabelText(/email/i), "brian@example.com")
        await user.type(screen.getByLabelText(/password/i), "wrong-password")
        await user.click(screen.getByRole("button", { name: /log in/i }))

        expect(await screen.findByText(/incorrect email or password/i)).toBeInTheDocument()
        expect(mockSetAuth).not.toHaveBeenCalled()
        expect(mockNavigate).not.toHaveBeenCalled()
    })
})
