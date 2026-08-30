import { Button } from '@/components/ui/button'

interface GoogleAuthButtonProps {
    mode: 'signin' | 'signup'
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GOOGLE_REDIRECT_URI = `${window.location.origin}/auth/google/callback`

export function GoogleAuthButton({ mode }: GoogleAuthButtonProps) {
    const handleClick = () => {
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: GOOGLE_REDIRECT_URI,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'online'
        })
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    }
    return (
        <>
            <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                    <span className='w-full border-t' />
                </div>
                <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-background px-2 text-muted-foreground'>Or</span>
                </div>
            </div>

            <Button type='button' variant='outline' className='w-full' onClick={handleClick} >
                { mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
            </Button>
        </>
    )
}