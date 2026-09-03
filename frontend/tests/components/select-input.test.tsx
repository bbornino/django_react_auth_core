import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SelectInput } from "@/components/select-input"

const options = [
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "all", label: "All" },
]

describe("SelectInput", () => {
    it("displays the currently selected option's label", () => {
        render(<SelectInput value="20" onValueChange={() => {}} options={options} />)
        expect(screen.getByText("20")).toBeInTheDocument()
    })

    it("selecting a different option calls onValueChange with that option's value", async () => {
        const user = userEvent.setup()
        const handleChange = vi.fn()
        render(<SelectInput value="10" onValueChange={handleChange} options={options} />)

        await user.click(screen.getByRole("combobox"))
        await user.click(screen.getByRole("option", { name: "All" }))

        // Confirms the null-filtering fix holds under a real selection: a
        // genuine string value reaches the caller, never null, even though
        // Base UI's underlying onValueChange signature allows null.
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
