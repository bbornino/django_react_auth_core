import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuthStore } from "@/stores/auth-store"
import { type UserFormValues, type UserDetail, 
    adminUserSchema, type AdminUserFormValues } from "@/lib/schemas/user-schema"
import { SystemError } from "@/components/system-error"
import { parseApiError } from "@/lib/parse-api-error"
import { apiClient } from "@/lib/api-client"
import { mapUserResponse } from "@/lib/map-user-response"
import { PageCard } from "@/components/page-card"
import { TextField } from "@/components/text-field"
import { CheckboxField } from "@/components/checkbox-field"
import { TextareaField } from "@/components/textarea-field"
import { SelectField } from "@/components/select-field"
import { Button } from "@/components/ui/button"
import { ROLE_OPTIONS } from "@/lib/constants"
import { UserAvatar } from "@/components/user-avatar"


export function EditUserPage() {
    const { userId: paramUserId } = useParams()
    const navigate = useNavigate()
    const [user, setUser] = useState<UserDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const setCurrentUser = useAuthStore((state => state.setUser))
    const currentUser = useAuthStore((state => state.user))
    const effectiveUserId = paramUserId ?? String(currentUser?.id)
    const [serverError, setServerError] = useState<string | null>(null)
    const isAdmin = currentUser?.role === 'admin'
    
    const {
        register, control, handleSubmit, reset, formState: { errors, isSubmitting },
    } = useForm<AdminUserFormValues>({ 
        resolver: zodResolver(adminUserSchema)
    })

    const previewDarkMode = useWatch({ control, name: 'dark_mode'})

    useEffect(() => {
        document.documentElement.classList.toggle('dark', !!previewDarkMode)
    })

    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin' && String(currentUser.id) !== effectiveUserId) {
            navigate('/dashboard')
            return
        }

        apiClient.get(`/users/${effectiveUserId}/`)
            .then((res) => {
                setUser(res.data) 
                reset(res.data)
            })
            .catch(() => {
                // Backend's own get_queryset() scoping is the real enforcement - this
                // catch covers a non-admin somehow reaching this fetch anyway (stale
                // currentUser, race condition, etc.), not the primary defense.
                navigate('/dashboard')
            })
            .finally(() => setLoading(false))
    }, [effectiveUserId, reset, currentUser, navigate])

    const onSubmit = async (data: UserFormValues) => {
        setServerError(null)
        try {
            const response = await apiClient.patch(`/users/${effectiveUserId}/`, data)
            console.log(response)
            if (currentUser?.id === Number(effectiveUserId)) {
                setCurrentUser(mapUserResponse(response.data))  // to cover name change and dark mode...
            }
            navigate('/dashboard')
        } catch (err) {
            setServerError(parseApiError(err))
        }
    }

    if (loading) return <div className="p-4">Loading User...</div>

    return(
        <PageCard title="Edit User" center={false}>
            { user && !isAdmin &&  (
                <div className="text-sm text-muted-foreground space-y-1 grid grid cols-1 lg:grid-cols-4 gap-4">
                    <UserAvatar avatarUrl={user.avatar_url} name={user.name} size={48} />
                    <p>Role: {user.role}</p>
                    <p>Status: {user.is_active ? 'Active' : 'Inactive'}</p>
                    <p>Is Staff: {user.is_staff ? 'Yes': 'No'}</p>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

                { user && isAdmin && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-1">
                            <UserAvatar avatarUrl={user.avatar_url} name={user.name} size={48} />
                        </div>
                        <div className="lg:col-span-5">
                            <SelectField label="Role" id="role" control={control} options={ROLE_OPTIONS} error={errors.role?.message} />
                        </div>
                        <div className="lg:col-span-3">
                            <CheckboxField label="Is Active" id="is_active" control={control} error={errors.is_active?.message} />
                        </div>
                        <div className="lg:col-span-3">
                            <CheckboxField label="Is Staff" id="is_staff" control={control} error={errors.is_staff?.message} />
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-6">
                        <TextField label="Name" id="name" register={register} error={errors.name?.message} />
                    </div>
                    <div className="lg:col-span-3">
                        <CheckboxField label="Dark Mode" id="dark_mode" control={control} error={errors.dark_mode?.message} />
                    </div>
                    <div className="lg:col-span-3">
                        <CheckboxField label="Email Opt Out" id="email_opt_out" control={control} error={errors.email_opt_out?.message} />
                    </div>
                    
                </div>

                <TextareaField label="About Me" id="about_me" register={register} rows={4} error={errors.about_me?.message} />

                <SystemError message={serverError} />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Updating user...' : 'Update user'}
                </Button>
                
            </form>
        </PageCard>
    )
}