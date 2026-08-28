// import { Link, useNavigate } from 'react-router'
// import { Button } from '@/components/ui/button'
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeperator, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu'

import { NavLink } from './nav-link'

export function NavBar() {
    return (
        <nav className='border-b bg-white px-6 py-4'>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-6'>
                    <NavLink to="/">Welcome</NavLink>
                </div>

                <div>
                    <div className='flex items-center gap-4'>
                        <NavLink to="/login">Login</NavLink>
                        <NavLink to="/register">Register</NavLink>
                    </div>
                </div>
            </div>
        </nav>
    )
}