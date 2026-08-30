// components/select-field.tsx
import { Controller, type Control, type FieldValues, type Path } from "react-hook-form"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
                    <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={id} className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError message={error} />
                </div>
            )}
        />
    )
}