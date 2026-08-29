// components/field-error.tsx
export function FieldError ({ message }: { message?: string | null }) {
    if (!message) return null
    return <p className="text-sm text-destructive break-words">{message}</p>
}