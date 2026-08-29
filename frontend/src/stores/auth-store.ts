import { create } from 'zustand'

export interface User {
    id: number
    email: string
    name: string
    role: string
    avatarUrl: string | null
    darkMode: boolean
}

type AuthState = {
    user: User | null
    accessToken: string | null
    isAuthenticated: boolean
    isBootstrapping: boolean
    setAuth: (user: User, accessToken: string) => void
    setAccessToken: (accessToken: string) => void
    setUser: (updates: Partial<User>) => void
    logout: () => void
    finishBootstrapping: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isBootstrapping: true,
    
    setAuth: (user, accessToken) => 
        set({user, accessToken, isAuthenticated: true}),

    setAccessToken: (accessToken) =>
        set({ accessToken }),

    setUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates} : null})),

    logout: () => 
        set({user: null, accessToken: null, isAuthenticated: false}),
   
    finishBootstrapping: () =>
        set({isBootstrapping: false})
}))