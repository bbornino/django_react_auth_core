import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SelectInput } from "@/components/select-input"

const options = [
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "all", label: "All" },
]

// value and label deliberately differ here — this is the exact shape that
// exposed the real bug: SelectValue was echoing the raw value ("2") instead
// of looking up its matching option's label ("Heading 2"). Options where
// value === label (like the set above) can't catch that regression at all,
// since the wrong behavior and the right behavior look identical.
const headingOptions = [
    { value: "paragraph", label: "Paragraph" },
    { value: "1", label: "Heading 1" },
    { value: "2", label: "Heading 2" },
]

describe("SelectInput", () => {
    it("displays the currently selected option's label", () => {
        render(<SelectInput value="20" onValueChange={() => {}} options={options} />)
        expect(screen.getByText("20")).toBeInTheDocument()
    })

    it("displays the option's LABEL, not its raw value, when they differ", () => {
        render(<SelectInput value="2" onValueChange={() => {}} options={headingOptions} />)
        expect(screen.getByText("Heading 2")).toBeInTheDocument()
        expect(screen.queryByText("2")).not.toBeInTheDocument()
    })

    it("selecting a different option calls onValueChange with that option's value", async () => {
        const user = userEvent.setup()
        const handleChange = vi.fn()
        render(<SelectInput value="10" onValueChange={handleChange} options={options} />)

        await user.click(screen.getByRole("combobox"))
        await user.click(screen.getByRole("option", { name: "All" }))

        expect(handleChange).toHaveBeenCalledWith("all")
        expect(handleChange).not.toHaveBeenCalledWith(null)
    })

    it("passes the id prop through to the trigger for label association", () => {
        render(<SelectInput id="page-size" value="10" onValueChange={() => {}} options={options} />)
        expect(screen.getByRole("combobox")).toHaveAttribute("id", "page-size")
    })

    it("applies a custom className to the trigger", () => {
        render(<SelectInput value="10" onValueChange={() => {}} options={options} className="w-20" />)
        expect(screen.getByRole("combobox")).toHaveClass("w-20")
    })
})
