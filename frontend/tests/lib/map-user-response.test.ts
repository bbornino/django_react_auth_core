import { describe, it, expect } from "vitest"
import { mapUserResponse } from "@/lib/map-user-response"

describe("mapUserResponse", () => {
    it("renames avatar_url and dark_mode to avatarUrl and darkMode", () => {
        const apiUser = {
            id: 3,
            email: "briana@example.com",
            name: "Briana",
            role: "user",
            avatar_url: "https://example.com/pic.jpg",
            dark_mode: true,
        }

        const result = mapUserResponse(apiUser)

        expect(result.avatarUrl).toBe("https://example.com/pic.jpg")
        expect(result.darkMode).toBe(true)
    })

    it("passes through same-named fields unchanged", () => {
        const apiUser = {
            id: 3,
            email: "briana@example.com",
            name: "Briana",
            role: "admin",
            avatar_url: "",
            dark_mode: false,
        }

        const result = mapUserResponse(apiUser)

        expect(result.id).toBe(3)
        expect(result.email).toBe("briana@example.com")
        expect(result.name).toBe("Briana")
        expect(result.role).toBe("admin")
    })

    it("preserves an empty avatar_url as an empty string, not null/undefined", () => {
        // The whole point of UserAvatar's fallback logic is treating "" as
        // falsy-but-defined — this mapper shouldn't quietly turn "" into
        // something else on the way through.
        const apiUser = {
            id: 1, email: "a@example.com", name: "A", role: "user",
            avatar_url: "", dark_mode: false,
        }

        const result = mapUserResponse(apiUser)

        expect(result.avatarUrl).toBe("")
    })

    it("preserves dark_mode's boolean type rather than stringifying it", () => {
        const apiUser = {
            id: 1, email: "a@example.com", name: "A", role: "user",
            avatar_url: "", dark_mode: false,
        }

        const result = mapUserResponse(apiUser)

        expect(result.darkMode).toBe(false)
        expect(typeof result.darkMode).toBe("boolean")
    })

    it("does not leak the original snake_case keys onto the mapped object", () => {
        const apiUser = {
            id: 1, email: "a@example.com", name: "A", role: "user",
            avatar_url: "https://example.com/pic.jpg", dark_mode: true,
        }

        const result = mapUserResponse(apiUser)

        expect(result).not.toHaveProperty("avatar_url")
        expect(result).not.toHaveProperty("dark_mode")
    })
})
