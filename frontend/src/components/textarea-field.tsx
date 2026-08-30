// components/textarea-field.tsx
import type { Path, FieldValues, UseFormRegister } from 'react-hook-form'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { FieldError } from './field-error';

type TextareaFieldProps<T extends FieldValues> = {
    label: string
    id: Path<T>
    rows?: number
    register: UseFormRegister<T>
    error?: string
}

export function TextareaField<T extends FieldValues>({
    label, id, rows = 5, register, error
}: TextareaFieldProps<T>) {
    return(
        <div className='space-y-1'>
            <Label htmlFor={id}>{label}</Label>
            <Textarea id={id} rows={rows} {...register(id)} />
            <FieldError message={error} />
        </div>
    )
}