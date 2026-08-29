// components/text-field.tsx
import type { Path, FieldValues, UseFormRegister } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FieldError } from './field-error'

type TextFieldProps<T extends FieldValues> = {
    label: string
    id: Path<T>
    type?: string
    register: UseFormRegister<T>
    error?: string
}

export function TextField<T extends FieldValues>({
    label, id, type = 'text', register, error
}: TextFieldProps<T>) {
    return (
        <div className='space-y-1'>
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type={type} {...register(id)} />
            <FieldError message={error} />
        </div>
    )
}