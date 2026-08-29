import { z as zod } from 'zod'

export const loginSchema = zod.object({
    email: zod.email('Enter a valid email address'),
    password: zod.string().min(8, 'Password is required'),
})

export type LoginFormValues = zod.infer<typeof loginSchema>

export const registerSchema = zod.object({
    name: zod.string().min(1, 'Name is required'),
    email: zod.email('Enter a valid email address'),
    password1: zod.string().min(8, 'Password must be at least 8 characters'),
    password2: zod.string().min(8, 'Password must be at least 8 characters'),
})

export type RegisterFormValues = zod.infer<typeof registerSchema>