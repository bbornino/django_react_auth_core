import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { RegisterPage } from "@/pages/register-page"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"

const mockNavigate = vi.fn()
vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react-router")>()
    return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock("@/lib/api-client", () => ({
    apiClient: { get: vi.fn(), post: vi.fn() },
}))

vi.mock("@/stores/auth-store", () => ({
    useAuthStore: vi.fn(),
}))

const mockSetAuth = vi.fn()

function renderRegisterPage() {
    return render(
        <MemoryRouter>
            <RegisterPage />
        </MemoryRouter>
    )
}

describe("RegisterPage", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useAuthStore).mockImplementation((selector) =>
            selector({ setAuth: mockSetAuth } as never)
        )
        vi.mocked(apiClient.get).mockResolvedValue({
            data: [
                "Your password must contain at least 8 characters.",
                "Your password can't be entirely numeric.",
            ],
        })
    })

    it("renders name, email, password, and confirm password fields", async () => {
        renderRegisterPage()
        await screen.findByText(/at least 8 characters/i)

        expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })

    it("fetches and displays the real password rules from the backend", async () => {
        renderRegisterPage()
        expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
        expect(apiClient.get).toHaveBeenCalledWith("/auth/password-rules")
    })

    it("on successful registration, maps the response and navigates to /dashboard", async () => {
        const user = userEvent.setup()
        vi.mocked(apiClient.post).mockResolvedValueOnce({
            data: {
                access: "fake-access-token",
                user: {
                    id: 4, email: "new@example.com", name: "New Person",
                    role: "user", avatar_url: "", dark_mode: false,
                },
            },
        })

        renderRegisterPage()
        await screen.findByText(/at least 8 characters/i)

        await user.type(screen.getByLabelText(/^name$/i), "New Person")
        await user.type(screen.getByLabelText(/^email$/i), "new@example.com")
        await user.type(screen.getByLabelText(/^password$/i), "a-real-password-1")
        await user.type(screen.getByLabelText(/confirm password/i), "a-real-password-1")
        await user.click(screen.getByRole("button", { name: /create account/i }))

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                "/auth/register/",
                expect.objectContaining({ email: "new@example.com", name: "New Person" })
            )
        })

        expect(mockSetAuth).toHaveBeenCalledWith(
            expect.objectContaining({ name: "New Person", avatarUrl: "" }),
            "fake-access-token"
        )
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
    })

    it("on a 409, shows the duplicate-email message and does not navigate", async () => {
        const user = userEvent.setup()
        vi.mocked(apiClient.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 409, data: {} },
        })

        renderRegisterPage()
        await screen.findByText(/at least 8 characters/i)

        await user.type(screen.getByLabelText(/^name$/i), "Someone")
        await user.type(screen.getByLabelText(/^email$/i), "dupe@example.com")
        await user.type(screen.getByLabelText(/^password$/i), "a-real-password-1")
        await user.type(screen.getByLabelText(/confirm password/i), "a-real-password-1")
        await user.click(screen.getByRole("button", { name: /create account/i }))

        expect(
            await screen.findByText(/account with that email already exists/i)
        ).toBeInTheDocument()
        expect(mockSetAuth).not.toHaveBeenCalled()
        expect(mockNavigate).not.toHaveBeenCalled()
    })
})
