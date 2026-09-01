import { StrictMode } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { GoogleCallbackPage } from "@/pages/google-callback-page"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"

const mockNavigate = vi.fn()
const mockUseSearchParams = vi.fn()

vi.mock("react-router", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react-router")>()
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useSearchParams: () => mockUseSearchParams(),
    }
})

vi.mock("@/lib/api-client", () => ({
    apiClient: { post: vi.fn() },
}))

vi.mock("@/stores/auth-store", () => ({
    useAuthStore: vi.fn(),
}))

const mockSetAuth = vi.fn()

function mockCode(code: string | null) {
    mockUseSearchParams.mockReturnValue([
        { get: (key: string) => (key === "code" ? code : null) },
    ])
}

function renderCallbackPage() {
    return render(
        <MemoryRouter>
            <GoogleCallbackPage />
        </MemoryRouter>
    )
}

describe("GoogleCallbackPage", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useAuthStore).mockImplementation((selector) =>
            selector({ setAuth: mockSetAuth } as never)
        )
    })

    it("shows a 'Signing in...' state", () => {
        mockCode(null)
        renderCallbackPage()
        expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })

    it("redirects to /login immediately if there's no code in the URL, without calling the API", async () => {
        mockCode(null)
        renderCallbackPage()

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"))
        expect(apiClient.post).not.toHaveBeenCalled()
    })

    it("on a valid code, exchanges it, maps the response into the store, and navigates to /dashboard", async () => {
        mockCode("real-auth-code-123")
        vi.mocked(apiClient.post).mockResolvedValueOnce({
            data: {
                access: "fresh-access-token",
                user: {
                    id: 3, email: "b@example.com", name: "Briana",
                    role: "user", avatar_url: "https://example.com/pic.jpg", dark_mode: false,
                },
            },
        })

        renderCallbackPage()

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith("/auth/google/", { code: "real-auth-code-123" })
        })
        expect(mockSetAuth).toHaveBeenCalledWith(
            expect.objectContaining({ name: "Briana", avatarUrl: "https://example.com/pic.jpg" }),
            "fresh-access-token"
        )
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard")
    })

    it("on a failed exchange (e.g. an already-used or expired code), redirects to /login without setting auth", async () => {
        mockCode("stale-or-reused-code")
        vi.mocked(apiClient.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 400, data: {} },
        })

        renderCallbackPage()

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"))
        expect(mockSetAuth).not.toHaveBeenCalled()
    })

    it("only exchanges the code once, even under StrictMode's double-invoke — a duplicate POST would burn a single-use code", async () => {
        mockCode("real-auth-code-123")
        vi.mocked(apiClient.post).mockResolvedValue({
            data: {
                access: "fresh-access-token",
                user: {
                    id: 3, email: "b@example.com", name: "Briana",
                    role: "user", avatar_url: "", dark_mode: false,
                },
            },
        })

        render(
            <StrictMode>
                <MemoryRouter>
                    <GoogleCallbackPage />
                </MemoryRouter>
            </StrictMode>
        )

        await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/dashboard"))
        expect(apiClient.post).toHaveBeenCalledTimes(1)
    })
})
