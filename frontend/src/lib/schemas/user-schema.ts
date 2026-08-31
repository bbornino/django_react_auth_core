import { z as zod } from 'zod'
import { ROLES } from '../constants'

export const userSchema = zod.object({
    name: zod.string().min(1, 'Name is required'),
    email_opt_out: zod.boolean(),
    dark_mode: zod.boolean(),
    about_me: zod.string()
})

export type UserFormValues = zod.infer<typeof userSchema>

export const adminUserSchema = userSchema.extend({
    is_active: zod.boolean(),
    is_staff: zod.boolean(),
    role: zod.enum(ROLES).optional(),
})

export type AdminUserFormValues = zod.infer<typeof adminUserSchema>

// Full shape of a GET /users/:id/ response — includes read-only fields
// (role, is_active, is_staff, date_joined) that UserFormValues deliberately
// excludes, since those can never be submitted through this form.
export interface UserDetail extends UserFormValues {
    id: number
    email: string
    role: string
    is_active: boolean
    is_staff: boolean
    date_joined: string
    avatar_url: string
}