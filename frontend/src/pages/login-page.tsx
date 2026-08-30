import { useState } from "react"
import { useNavigate, Link } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from '@/components/ui/button'
import { loginSchema, type LoginFormValues } from "@/lib/schemas/auth-schema"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"
import { GoogleAuthButton } from '@/components/google-auth-button'
import { PageHeading } from "@/components/page-heading"
import { TextField } from "@/components/text-field"
import { SystemError } from "@/components/system-error"
import { parseApiError } from "@/lib/parse-api-error"
import { mapUserResponse } from "@/lib/map-user-response"


export function LoginPage() {
    const navigate = useNavigate()
    const setAuth = useAuthStore((state => state.setAuth))
    const [serverError, setServerError] = useState<string | null>(null)

    const {
        register, handleSubmit, formState: { errors, isSubmitting },        
    } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema)})

    const onSubmit = async (data: LoginFormValues) => {
        setServerError(null)
        try {
            const response = await apiClient.post('/auth/login/', data)
            const { user, access } = response.data
            setAuth(mapUserResponse(user), access)
            navigate('/dashboard')
        } catch (err) {
            setServerError(parseApiError(err, {401: 'Incorrect email or password'}))
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-sm space-y-4 p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <PageHeading>Log in</PageHeading>

                    <TextField label="Email" id="email" type="email" 
                            register={register} error={errors.email?.message} />
                    <TextField label="Password" id="password" type="password" 
                            register={register} error={errors.password?.message} />

                    <SystemError message={serverError} />

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Logging in...' : 'Log in'}
                    </Button>

                    <GoogleAuthButton mode="signin" />

                    <p className="text-sm text-center text-muted-foreground">
                        Not registered?{' '}
                        <Link to="/register" className="underline text-foreground">
                            Create an account
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    )
}