// components/NavLink.tsx
import { Link, type LinkProps } from 'react-router'
import { cn } from '@/lib/utils'

export function NavLink({ className, variant = 'light', ...props }: LinkProps & { variant?: 'light' | 'dark'}) {
  const styles = variant === 'dark'
    ? 'text-white hover:text-gray-300'
    : 'text-gray-600 hover:text-black'
  return <Link className={cn(styles, className)} {...props} />
}