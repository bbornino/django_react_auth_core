import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { UserAvatar } from "@/components/user-avatar"

describe("UserAvatar", () => {
    it("renders an image when avatarUrl is present", () => {
        render(<UserAvatar avatarUrl="https://example.com/pic.jpg" name="Briana" />)

        const img = screen.getByRole("img")
        expect(img).toHaveAttribute("src", "https://example.com/pic.jpg")
    })

    it("falls back to initials when avatarUrl is an empty string", () => {
        render(<UserAvatar avatarUrl="" name="Briana" />)

        expect(screen.queryByRole("img")).not.toBeInTheDocument()
        expect(screen.getByText("B")).toBeInTheDocument()
    })

    it("falls back to initials when avatarUrl is undefined", () => {
        render(<UserAvatar name="Briana" />)

        expect(screen.queryByRole("img")).not.toBeInTheDocument()
        expect(screen.getByText("B")).toBeInTheDocument()
    })

    it("falls back to initials when avatarUrl is null", () => {
        render(<UserAvatar avatarUrl={null} name="Briana" />)

        expect(screen.queryByRole("img")).not.toBeInTheDocument()
        expect(screen.getByText("B")).toBeInTheDocument()
    })

    it("uppercases the initial, regardless of the name's original casing", () => {
        render(<UserAvatar name="briana" />)
        expect(screen.getByText("B")).toBeInTheDocument()
    })

    it("falls back to '?' when name is missing entirely", () => {
        render(<UserAvatar />)
        expect(screen.getByText("?")).toBeInTheDocument()
    })

    it("falls back to '?' when name is an empty or whitespace-only string", () => {
        render(<UserAvatar name="   " />)
        expect(screen.getByText("?")).toBeInTheDocument()
    })

    it("applies the size prop to both the image and the fallback", () => {
        const { rerender } = render(<UserAvatar avatarUrl="https://example.com/pic.jpg" name="Briana" size={64} />)
        expect(screen.getByRole("img")).toHaveStyle({ width: "64px", height: "64px" })

        rerender(<UserAvatar name="Briana" size={64} />)
        expect(screen.getByText("B")).toHaveStyle({ width: "64px", height: "64px" })
    })

    it("defaults to size 40 when not specified", () => {
        render(<UserAvatar avatarUrl="https://example.com/pic.jpg" name="Briana" />)
        expect(screen.getByRole("img")).toHaveStyle({ width: "40px", height: "40px" })
    })

    it("uses the name as alt text, falling back to a generic label when name is missing", () => {
        const { rerender } = render(<UserAvatar avatarUrl="https://example.com/pic.jpg" name="Briana" />)
        expect(screen.getByRole("img")).toHaveAttribute("alt", "Briana")

        rerender(<UserAvatar avatarUrl="https://example.com/pic.jpg" />)
        expect(screen.getByRole("img")).toHaveAttribute("alt", "User avatar")
    })
})
