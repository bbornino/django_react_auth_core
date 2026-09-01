import { describe, it, expect } from "vitest"
import { parseApiError } from "@/lib/parse-api-error"

describe("parseApiError", () => {
    it("returns a generic message for a non-axios error", () => {
        const result = parseApiError(new Error("network exploded"))
        expect(result).toBe("Something went wrong. Please try again.")
    })

    it("uses the caller-supplied message for a matching status code", () => {
        const fakeError = { isAxiosError: true, response: { status: 409, data: {} } }
        const result = parseApiError(fakeError, { 409: "An account with that email already exists" })
        expect(result).toBe("An account with that email already exists")
    })

    it("ignores the status map for a status code with no matching entry", () => {
        const fakeError = { isAxiosError: true, response: { status: 500, data: {} } }
        const result = parseApiError(fakeError, { 409: "conflict message" })
        expect(result).toBe("Something went wrong. Please try again.")
    })

    it("flattens a single field-keyed validation error into 'field: message'", () => {
        const fakeError = {
            isAxiosError: true,
            response: { status: 400, data: { email: ["This field is required."] } },
        }
        const result = parseApiError(fakeError)
        expect(result).toBe("email: This field is required.")
    })

    it("flattens multiple field errors onto separate lines", () => {
        const fakeError = {
            isAxiosError: true,
            response: {
                status: 400,
                data: {
                    email: ["This field is required."],
                    password1: ["This password is too common."],
                },
            },
        }
        const result = parseApiError(fakeError)
        expect(result).toBe(
            "email: This field is required.\npassword1: This password is too common."
        )
    })

    it("handles a bare string value (not wrapped in an array) for a field", () => {
        // DRF's non_field_errors and some nested serializers can return a
        // plain string instead of a list — the Array.isArray guard in
        // parseApiError exists specifically for this shape.
        const fakeError = {
            isAxiosError: true,
            response: { status: 400, data: { detail: "Malformed request." } },
        }
        const result = parseApiError(fakeError)
        expect(result).toBe("detail: Malformed request.")
    })

    it("returns a raw string response body verbatim", () => {
        // e.g. Django's own DEBUG=True error page, which isn't JSON at all —
        // the real-world case that originally exposed this bug this session.
        const fakeError = {
            isAxiosError: true,
            response: { status: 500, data: "RuntimeError at /auth/register" },
        }
        const result = parseApiError(fakeError)
        expect(result).toBe("RuntimeError at /auth/register")
    })

    it("falls back to the generic message when there's no response data at all", () => {
        const fakeError = { isAxiosError: true, response: { status: 500, data: undefined } }
        const result = parseApiError(fakeError)
        expect(result).toBe("Something went wrong. Please try again.")
    })
})
