// pages/google-callback-page.tsx
import { useEffect, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"
import { mapUserResponse } from "@/lib/map-user-response"

export function GoogleCallbackPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const setAuth = useAuthStore((state) => state.setAuth)
    const hasRun = useRef(false)

    useEffect(() => {
        if (hasRun.current) return
        hasRun.current = true
        
        const code = searchParams.get('code')
        if (!code) {
            navigate('/login')
            return
        }
        apiClient.post('/auth/google/', { code })
            .then((res) => {
                const { user, access } = res.data
                setAuth(mapUserResponse(user), access)
                navigate('/dashboard')
            })
            .catch(() => navigate('/login'))
    }, [searchParams, navigate, setAuth])

    return (
        <div className="flex min-h-screen items-center justify-center">
            <p>Signing in...</p>
        </div>
    )
}