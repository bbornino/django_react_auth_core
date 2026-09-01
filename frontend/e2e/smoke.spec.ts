import { test, expect } from '@playwright/test'

test('the app loads and shows the Welcome page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Welcome to the App')).toBeVisible()
})

test('the navbar shows Login and Register when logged out', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Login')).toBeVisible()
    await expect(page.getByText('Register')).toBeVisible()
})

test('navigating to /login renders the login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
})

test('navigating to a protected route while logged out redirects to /login', async ({ page }) => {
    // No mocked store here — this is the real ProtectedRoute, the real
    // (empty) auth state, and a real client-side redirect, not a
    // MemoryRouter standing in for one.
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
})
