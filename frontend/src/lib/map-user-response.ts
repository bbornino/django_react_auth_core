// lib/map-user-response.ts
import type { User } from '@/stores/auth-store'

type ApiUser = {
    id: number
    email: string
    name: string
    role: string
    avatar_url: string
    dark_mode: boolean
}

export function mapUserResponse(data: ApiUser): User {
    return {
        id: data.id,
        email:data.email,
        name: data.name,
        role: data.role,
        avatarUrl: data.avatar_url,
        darkMode: data.dark_mode,
    }
}