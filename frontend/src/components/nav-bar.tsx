import { useNavigate } from 'react-router'
import { NavLink } from "./nav-link"
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu'

export function NavBar() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
    const logout = useAuthStore((state) => state.logout)
    const user = useAuthStore((state) => state.user)
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
            <div className='flex items-center gap-6'>
                <NavLink to="/" variant='dark' >Welcome</NavLink>

                {isAuthenticated && <NavLink to="/dashboard" variant='dark' >Dashboard</NavLink>}
            </div>
            
            
            <div className='flex gap-4'>
                {isAuthenticated ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger className="text-sm text-white hover:text-gray-300">
                            {user?.name || user?.email}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem render={<NavLink to="/edit-profile" />}>
                                Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleLogout}>
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
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