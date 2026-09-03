import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useThemeSync } from "@/hooks/use-theme-sync"
import { useAuthStore } from "@/stores/auth-store"

vi.mock("@/stores/auth-store", () => ({
    useAuthStore: vi.fn(),
}))

function mockDarkMode(darkMode: boolean | undefined) {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
        selector({ user: darkMode === undefined ? undefined : { darkMode } } as never)
    )
}

describe("useThemeSync", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        document.documentElement.classList.remove("dark")
        localStorage.clear()
    })

    it("adds the dark class and stores the hint when darkMode is true", () => {
        mockDarkMode(true)
        renderHook(() => useThemeSync())

        expect(document.documentElement.classList.contains("dark")).toBe(true)
        expect(localStorage.getItem("theme-hint")).toBe("dark")
    })

    it("removes the dark class and stores the hint when darkMode is false", () => {
        // This is the exact regression this test exists to catch: an earlier
        // version of useThemeSync had an inverted `!darkMode` check in its
        // classList.toggle call, which meant a brand-new user (darkMode
        // defaults to false on the backend) got dark mode silently forced ON
        // immediately after registering. Playwright caught it live; this
        // test would have caught it before it ever shipped.
        document.documentElement.classList.add("dark") // start dark, prove it gets removed
        mockDarkMode(false)
        renderHook(() => useThemeSync())

        expect(document.documentElement.classList.contains("dark")).toBe(false)
        expect(localStorage.getItem("theme-hint")).toBe("light")
    })

    it("does nothing while darkMode is still unknown (user not yet loaded)", () => {
        mockDarkMode(undefined)
        renderHook(() => useThemeSync())

        expect(document.documentElement.classList.contains("dark")).toBe(false)
        expect(localStorage.getItem("theme-hint")).toBeNull()
    })
})
