// components/select-input.tsx — the plain, non-form primitive. No Controller,
// no Label, no error — just value/onChange, for any non-form Select usage.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Option = { value: string; label: string }

type SelectInputProps = {
    value: string
    onValueChange: (value: string) => void
    options: readonly Option[]
    id?: string
    className?: string
}

export function SelectInput({ value, onValueChange, options, id, className }: SelectInputProps) {
    const selectedLabel = options.find((opt) => opt.value === value)?.label ?? value

    return (
        <Select value={value} 
                onValueChange={(newValue) => {
                    if (newValue !== null) onValueChange(newValue)
                }}
        >
            <SelectTrigger id={id} className={className}>
                <SelectValue>{selectedLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}