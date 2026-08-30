// lib/parse-api-error.ts
import axios from 'axios'

export function parseApiError(err: unknown, statusMessages: Record<number, string> = {}): string {
    if (!axios.isAxiosError(err)) {
        return 'Something went wrong.  Please try again.'
    }

    if (err.response?.status && statusMessages[err.response.status]) {
        return statusMessages[err.response.status]
    }

    if (typeof err.response?.data === 'object' && err.response.data) {
        const messages = Object.entries(err.response.data)
            .map(([field, msgs]) => `${field}: ${(Array.isArray(msgs) ? msgs : [msgs]).join(' ')}`)

        return messages.join('\n')
    }

    if (typeof err.response?.data === 'string') {
        return err.response.data
    }

    return 'Something went wrong.  Pleaes try again.'
}