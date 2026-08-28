// components/NavLink.tsx
import { Link, type LinkProps } from 'react-router'
import { cn } from '@/lib/utils'

export function NavLink({ className, ...props }: LinkProps) {
  return <Link className={cn("text-sm text-gray-600 hover:text-black", className)} {...props} />
}