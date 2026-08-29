import { useNavigate } from 'react-router'
import { NavLink } from "./nav-link"
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'


export function NavBar() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
    const logout = useAuthStore((state) => state.logout)
    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            await apiClient.post('/auth/logout')
        } catch {
            // Cookie may already be invalid/expired - proceed with client-side logout
        }
        logout()
        navigate('/login')
    }

    return (
        <nav className='w-full flex items-center justify-between px-6 py-4 bg-slate-900 text-white'>
            <NavLink to="/" variant='dark' >Welcome</NavLink>
            
            <div className='flex gap-4'>
                {isAuthenticated ? (
                    <>
                        <NavLink to="/dashboard" variant='dark' >Dashboard</NavLink>
                        <button onClick={handleLogout}
                            className='text-sm text-white hover:text-gray-300'>
                                Logout
                        </button>
                    </>
                ) : (
                    <>
                        <NavLink to="/login" variant='dark' >Login</NavLink>
                        <NavLink to="/register" variant='dark' >Register</NavLink>
                    </>
                )}
            </div>
        </nav>
    )
}