import { useEffect, useRef, type ReactNode } from "react"
import axios from "axios"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"
import { API_BASE_URL } from "@/lib/constants"
import { mapUserResponse } from "@/lib/map-user-response"

export function AuthBootstrap({ children }: { children: ReactNode }) {
    const setAuth = useAuthStore((state) => state.setAuth)
    const setAccessToken = useAuthStore((state) => state.setAccessToken)
    const finishBootstrapping = useAuthStore((state) => state.finishBootstrapping)
    const isBootstrapping = useAuthStore((state) => state.isBootstrapping)
    const hasRun = useRef(false)

    useEffect(() => {
        if (hasRun.current) return
        hasRun.current = true

        axios.post(`${API_BASE_URL}/auth/refresh/`, {}, { withCredentials: true })
            .then((res) => {
                const { access } = res.data
                setAccessToken(access)
                return apiClient.get('/users/me/').then((meRes) => {
                    setAuth(mapUserResponse(meRes.data), access)
                })
            })
            .catch(() => {
                // No valid cookie, or refresh failed - user just isn't logged in.
            })
            .finally(() => finishBootstrapping())
    }, [setAuth, finishBootstrapping, setAccessToken])

    if (isBootstrapping) {
        return <div className="flex min-h-screen items-center justify-center"><p>Loading...</p></div>
    }

    return <>{children}</>
}