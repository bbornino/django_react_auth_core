// components/system-error.tsx
export function SystemError({ message } : { message?: string | null }) {
    if (!message) return null
    return (
        <textarea readOnly value={message}
            className="w-full h-40 resize rounded-md border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs destructive"
        />
    )
}