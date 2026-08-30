export const API_BASE_URL = 'http://localhost:8000/'

export const ROLES = ['admin', 'user', 'guest'] as const
export const ROLE_OPTIONS = [
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'User' },
    { value: 'guest', label: 'Guest' },
] as const