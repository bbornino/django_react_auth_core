import { useEffect, useState } from "react"
import { useNavigate, Link } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { registerSchema, type RegisterFormValues } from "@/lib/schemas/auth-schema"
import { apiClient } from "@/lib/api-client"
import { useAuthStore } from "@/stores/auth-store"
import { GoogleAuthButton } from "@/components/google-auth-button"
import { SystemError } from "@/components/system-error"
import { parseApiError } from "@/lib/parse-api-error"
import { TextField } from "@/components/text-field"
import { PageHeading } from "@/components/page-heading"
import { mapUserResponse } from "@/lib/map-user-response"

export function RegisterPage() {
    const navigate = useNavigate()
    const setAuth = useAuthStore((state) => state.setAuth)
    const [serverError, setServerError] = useState<string | null>(null)
    const [passwordRules, setPasswordRules] = useState<string[]>([])

    useEffect(() => {
        apiClient.get('/auth/password-rules').then((res) => setPasswordRules(res.data))
    }, [])    // empty array: run once on mount.

    const {
        register, handleSubmit, formState: {errors, isSubmitting },
    } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema)})

    const onSubmit = async (data: RegisterFormValues) => {
        setServerError(null)
        try {
            const response = await apiClient.post('/auth/register/', data)
            const{ user, access } = response.data
            setAuth(mapUserResponse(user), access)
            navigate('/dashboard')
        } catch (err) {
            setServerError(parseApiError(err, { 409: 'An account with that email already exists'}))
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-xl space-y-4 p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6" noValidate>
                    <PageHeading>Create an account</PageHeading>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField label="Name" id="name" register={register} error={errors.name?.message} />
                        <TextField label="Email" id="email" type="email" register={register} error={errors.email?.message} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextField label="Password" id="password1" type="password" register={register} error={errors.password1?.message} />
                        <TextField label="Confirm Password" id="password2" type="password" register={register} error={errors.password2?.message} />
                    </div>
            
                    
                    {passwordRules.length > 0 && (
                        <div className="text-xs text-muted-foregroud text-left space-y-1">
                            <p className="font-medium">Password rules</p>
                            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 text-left leading-snug">
                                {passwordRules.map((rule) => <li key={rule}>{rule}</li>)}
                            </ul>
                        </div>
                        
                    )}

                    <SystemError message={serverError} />

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating account...' : 'Create account'}
                    </Button>
                </form>

                <GoogleAuthButton mode="signup" />

                <p className="text-sm text-center text-muted-foreground">
                    Already have an account? {' '}
                    <Link to="/login" className="underline text-foreground">Log in</Link>
                </p>

            </div>
        </div>
    )
}