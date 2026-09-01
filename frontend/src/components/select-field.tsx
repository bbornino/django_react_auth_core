// components/select-field.tsx
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Label } from "./ui/label"
import { SelectInput } from "./select-input"
import { FieldError } from "./field-error"

type Option = { value: string; label: string }

type SelectFieldProps<T extends FieldValues> = {
    label: string
    id: Path<T>
    control: Control<T>
    options: readonly Option[]
    error?: string
}

export function SelectField<T extends FieldValues>({ label, id, control, options, error }: SelectFieldProps<T>) {
    return (
        <Controller
            name={id}
            control={control}
            render={({ field }) => (
                <div className="space-y-1">
                    <Label htmlFor={id}>{label}</Label>
                    <SelectInput id={id} value={field.value}
                        onValueChange={field.onChange}
                        options={options}
                        className="w-full"
                    />
                    <FieldError message={error} />
                </div>
            )}
        />
    )
}