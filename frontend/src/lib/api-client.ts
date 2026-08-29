import axios from 'axios'
import { useAuthStore } from '../stores/auth-store'
import { API_BASE_URL } from './constants'

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
    const accessToken = useAuthStore.getState().accessToken
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
})

// On a 401, try to silently refresh the token, then retry the original request
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error)
        }

        if (isRefreshing) {
            return new Promise((resolve) => {
                refreshQueue.push((newAccessToken: string) => {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
                    resolve(apiClient(originalRequest))
                })
            })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/token/refresh`,
                {},
                { withCredentials: true}
            )
            const { access } = response.data
            useAuthStore.getState().setAccessToken(access)
            refreshQueue.forEach((cb) => cb(access))
            refreshQueue = []
            originalRequest.headers.Authorization = `Bearer ${access}`
            return apiClient(originalRequest)
        } catch (refreshError) {
            useAuthStore.getState().logout()
            return Promise.reject(refreshError)
        } finally {
            isRefreshing = false
        }
    }
)