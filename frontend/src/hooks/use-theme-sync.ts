// hooks/use-theme-sync.ts
import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth-store"

export function useThemeSync() {
    const darkMode = useAuthStore((state) => state.user?.darkMode)

    useEffect(() => {
        if (darkMode !== undefined) {
            document.documentElement.classList.toggle('dark', !darkMode)
            localStorage.setItem('theme-hint', darkMode ? 'dark' : 'light')
        }
        
    }, [darkMode])
}