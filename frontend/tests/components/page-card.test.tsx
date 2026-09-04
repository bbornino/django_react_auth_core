import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { PageCard } from "@/components/page-card"

// PageCard is pure layout with no interactive behavior, so these tests
// necessarily check rendered classes rather than user actions — a
// legitimate but different flavor of test than the rest of this suite.
describe("PageCard", () => {
    it("renders its children", () => {
        render(<PageCard><p>Hello</p></PageCard>)
        expect(screen.getByText("Hello")).toBeInTheDocument()
    })

    it("renders a title header when title is provided", () => {
        render(<PageCard title="Edit User"><p>Hello</p></PageCard>)
        expect(screen.getByText("Edit User")).toBeInTheDocument()
    })

    it("omits the header entirely when no title is provided", () => {
        const { container } = render(<PageCard><p>Hello</p></PageCard>)
        expect(container.querySelector('[data-slot="card-header"]')).not.toBeInTheDocument()
    })

    it("defaults to max-w-xl when maxWidth isn't specified", () => {
        const { container } = render(<PageCard><p>Hello</p></PageCard>)
        expect(container.querySelector(".max-w-xl")).toBeInTheDocument()
    })

    it("applies a custom maxWidth when provided, instead of the default", () => {
        const { container } = render(<PageCard maxWidth="max-w-4xl"><p>Hello</p></PageCard>)
        expect(container.querySelector(".max-w-4xl")).toBeInTheDocument()
        expect(container.querySelector(".max-w-xl")).not.toBeInTheDocument()
    })

    it("always applies horizontal padding on the outer wrapper, regardless of centering", () => {
        const { container: centered } = render(<PageCard center><p>Hello</p></PageCard>)
        const { container: topAligned } = render(<PageCard center={false}><p>Hello</p></PageCard>)
        expect(centered.querySelector(".px-4")).toBeInTheDocument()
        expect(topAligned.querySelector(".px-4")).toBeInTheDocument()
    })

    it("uses full-height centering when center is true (the default)", () => {
        const { container } = render(<PageCard><p>Hello</p></PageCard>)
        expect(container.querySelector(".min-h-screen")).toBeInTheDocument()
    })

    it("uses top-aligned layout when center is false", () => {
        const { container } = render(<PageCard center={false}><p>Hello</p></PageCard>)
        expect(container.querySelector(".min-h-screen")).not.toBeInTheDocument()
        expect(container.querySelector(".pt-12")).toBeInTheDocument()
    })
})
