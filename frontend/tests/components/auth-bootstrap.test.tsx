import { StrictMode } from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import axios from "axios"
import { AuthBootstrap } from "@/components/auth-bootstrap"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"

vi.mock("axios", async (importOriginal) => {
    const actual = await importOriginal<typeof import("axios")>()
    return { ...actual, default: { ...actual.default, post: vi.fn() } }
})

vi.mock("@/lib/api-client", () => ({
    apiClient: { get: vi.fn() },
}))

vi.mock("@/stores/auth-store", () => ({
    useAuthStore: vi.fn(),
}))

const mockSetAuth = vi.fn()
const mockSetAccessToken = vi.fn()
const mockFinishBootstrapping = vi.fn()

// AuthBootstrap reads isBootstrapping from the store to decide whether to
// show a loading state or render children. Each test sets this directly,
// standing in for the real store's reactivity without wiring up an actual
// Zustand instance — the real store's own behavior isn't this file's concern.
function mockStore(isBootstrapping: boolean) {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({
            setAuth: mockSetAuth,
            setAccessToken: mockSetAccessToken,
            finishBootstrapping: mockFinishBootstrapping,
            isBootstrapping,
        } as never)
    )
}

describe("AuthBootstrap", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("shows a loading state and does not render children while bootstrapping", () => {
        vi.mocked(axios.post).mockReturnValue(new Promise(() => {})) // never resolves
        mockStore(true)

        render(<AuthBootstrap><div>Protected content</div></AuthBootstrap>)

        expect(screen.getByText(/loading/i)).toBeInTheDocument()
        expect(screen.queryByText("Protected content")).not.toBeInTheDocument()
    })

    it("renders children once bootstrapping has finished", () => {
        vi.mocked(axios.post).mockResolvedValue({ status: 401, data: {} })
        mockStore(false)

        render(<AuthBootstrap><div>Protected content</div></AuthBootstrap>)

        expect(screen.getByText("Protected content")).toBeInTheDocument()
    })

    it("on a valid refresh (200), sets the access token, fetches /me, and maps the response into the store", async () => {
        vi.mocked(axios.post).mockResolvedValueOnce({
            status: 200,
            data: { access: "fresh-access-token" },
        })
        vi.mocked(apiClient.get).mockResolvedValueOnce({
            data: {
                id: 3, email: "b@example.com", name: "Briana",
                role: "user", avatar_url: "", dark_mode: true,
            },
        })
        mockStore(true)

        render(<AuthBootstrap><div>Protected content</div></AuthBootstrap>)

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining("/auth/token/refresh/"),
                {},
                expect.objectContaining({ withCredentials: true })
            )
        })
        await waitFor(() => expect(mockSetAccessToken).toHaveBeenCalledWith("fresh-access-token"))
        await waitFor(() =>
            expect(mockSetAuth).toHaveBeenCalledWith(
                expect.objectContaining({ darkMode: true, name: "Briana" }),
                "fresh-access-token"
            )
        )
        expect(mockFinishBootstrapping).toHaveBeenCalled()
    })

    it("on a 401 (no valid cookie), never sets auth, but still finishes bootstrapping", async () => {
        // This is the normal "not logged in yet" case, not an error — the
        // validateStatus config on the real axios.post call means a 401
        // resolves rather than rejects, so this exercises the `res.status
        // !== 200` early-return branch specifically, not the .catch().
        vi.mocked(axios.post).mockResolvedValueOnce({ status: 401, data: {} })
        mockStore(true)

        render(<AuthBootstrap><div>Protected content</div></AuthBootstrap>)

        await waitFor(() => expect(mockFinishBootstrapping).toHaveBeenCalled())
        expect(mockSetAccessToken).not.toHaveBeenCalled()
        expect(mockSetAuth).not.toHaveBeenCalled()
        expect(apiClient.get).not.toHaveBeenCalled()
    })

    it("a genuine network failure is swallowed silently, and still finishes bootstrapping", async () => {
        vi.mocked(axios.post).mockRejectedValueOnce(new Error("network down"))
        mockStore(true)

        render(<AuthBootstrap><div>Protected content</div></AuthBootstrap>)

        await waitFor(() => expect(mockFinishBootstrapping).toHaveBeenCalled())
        expect(mockSetAuth).not.toHaveBeenCalled()
    })

    it("only calls the refresh endpoint once, even under StrictMode's mount/unmount/remount double-invoke", async () => {
        // This is the actual behavior the useRef guard exists to prevent —
        // without it, StrictMode would fire the effect twice on mount, and
        // since the refresh cookie is single-use-ish in spirit (rotation
        // aside), a duplicate call here is exactly the class of bug that
        // cost real debugging time earlier in this project's history.
        vi.mocked(axios.post).mockResolvedValue({ status: 401, data: {} })
        mockStore(true)

        render(
            <StrictMode>
                <AuthBootstrap><div>Protected content</div></AuthBootstrap>
            </StrictMode>
        )

        await waitFor(() => expect(mockFinishBootstrapping).toHaveBeenCalled())
        expect(axios.post).toHaveBeenCalledTimes(1)
    })
})
