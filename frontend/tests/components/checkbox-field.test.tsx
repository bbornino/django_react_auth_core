import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { CheckboxField } from "@/components/checkbox-field"

type FormValues = { agree: boolean }

function TestForm({ onSubmit = () => {} }: { onSubmit?: (data: FormValues) => void }) {
    const { control, handleSubmit } = useForm<FormValues>({ defaultValues: { agree: false } })
    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <CheckboxField label="I Agree" id="agree" control={control} />
            <button type="submit">Submit</button>
        </form>
    )
}

describe("CheckboxField", () => {
    it("renders the label and an unchecked checkbox by default", () => {
        render(<TestForm />)
        expect(screen.getByText("I Agree")).toBeInTheDocument()
        expect(screen.getByRole("checkbox")).not.toBeChecked()
    })

    it("the label is correctly associated with the checkbox", () => {
        // Only passes if htmlFor/id actually line up — same alignment fix
        // this component went through today depended on this association
        // staying correct while the layout was being restructured.
        render(<TestForm />)
        expect(screen.getByRole("checkbox", { name: "I Agree" })).toBeInTheDocument()
    })

    it("toggling the checkbox and submitting reflects the new value", async () => {
        const user = userEvent.setup()
        const handleSubmit = vi.fn()
        render(<TestForm onSubmit={handleSubmit} />)

        await user.click(screen.getByRole("checkbox"))
        await user.click(screen.getByText("Submit"))

        expect(handleSubmit).toHaveBeenCalledWith({ agree: true }, expect.anything())
    })

    it("clicking twice returns the checkbox to unchecked", async () => {
        const user = userEvent.setup()
        render(<TestForm />)
        const checkbox = screen.getByRole("checkbox")

        await user.click(checkbox)
        expect(checkbox).toBeChecked()
        await user.click(checkbox)
        expect(checkbox).not.toBeChecked()
    })

    it("displays an error message when provided", () => {
        function TestFormWithError() {
            const { control } = useForm<FormValues>({ defaultValues: { agree: false } })
            return <CheckboxField label="I Agree" id="agree" control={control} error="You must agree" />
        }
        render(<TestFormWithError />)
        expect(screen.getByText("You must agree")).toBeInTheDocument()
    })
})
