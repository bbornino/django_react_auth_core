import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { EditorField } from "@/components/editor-field"
import userEvent from "@testing-library/user-event"

type FormValues = { about_me: string }

function TestForm({ initialValue = "<p>Hello world</p>" }: { initialValue?: string }) {
    const { control } = useForm<FormValues>({ defaultValues: { about_me: initialValue } })
    return <EditorField label="About Me" id="about_me" control={control} />
}

// Real typing/selection inside Tiptap's contenteditable surface isn't
// reliably reproducible in jsdom — that's Playwright's job. What's tested
// here is everything else: toolbar rendering, word/char count, and the
// HTML-toggle resync logic specifically, since that's hand-wired state
// (seed on toggle-on, setContent + onChange on toggle-off) with real risk
// of silently diverging from the visual editor.
describe("EditorField", () => {
    it("renders the toolbar", () => {
        render(<TestForm />)
        expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument()
        expect(screen.getByRole("button", { name: "View HTML Source" })).toBeInTheDocument()
    })

    it("shows word and character counts based on the initial content", () => {
        render(<TestForm initialValue="<p>Hello world</p>" />)
        expect(screen.getByText(/2 words/i)).toBeInTheDocument()
        expect(screen.getByText(/11 characters/i)).toBeInTheDocument()
    })

    it("toggling to HTML view shows the real underlying markup", async () => {
        const user = userEvent.setup()
        render(<TestForm initialValue="<p>Hello world</p>" />)
        await user.click(screen.getByRole("button", { name: "View HTML Source" }))
        expect(screen.getByRole("textbox")).toHaveValue("<p>Hello world</p>")
    })

    it("editing raw HTML and toggling back resyncs the visual editor to it", async () => {
        const user = userEvent.setup()
        render(<TestForm initialValue="<p>Hello world</p>" />)
        await user.click(screen.getByRole("button", { name: "View HTML Source" }))
        const source = screen.getByRole("textbox")
        await user.clear(source)
        await user.type(source, "<p>Edited content</p>")
        await user.click(screen.getByRole("button", { name: "View HTML Source" }))
        expect(screen.getByText("Edited content")).toBeInTheDocument()
    })

    it("disables formatting buttons while in HTML source mode", async () => {
        const user = userEvent.setup()
        render(<TestForm />)
        await user.click(screen.getByRole("button", { name: "View HTML Source" }))
        expect(screen.getByRole("button", { name: "Bold" })).toBeDisabled()
    })
})
