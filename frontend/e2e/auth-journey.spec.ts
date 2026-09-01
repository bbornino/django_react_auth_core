import { test, expect} from '@playwright/test'
import { testEmail } from './helpers'

test('register, land on dashboard, log out, then log back in', async ({ page }) => {
    const email = testEmail()
    const password = 'a-rea-password-1'

    // -- register --------------------------------------------------------
    await page.goto('/register')
    await page.getByLabel(/^name$/i).fill('E2E Test User')
    await page.getByLabel(/^email$/i).fill(email)
    await page.getByLabel(/^password$/i).fill(password)
    await page.getByLabel(/confirm password/i).fill(password)
    await page.getByRole('button', { name: /create account/i }).click()
 
    // Real redirect, driven by the real backend's response — nothing here
    // is mocked, unlike every equivalent Vitest test.
    await expect(page).toHaveURL(/\/dashboard/)
 
    // -- log out -----------------------------------------------------------
    await page.getByRole('button', { name: /E2E Test User/i }).click()
    await page.getByText('Logout').click()
    await expect(page).toHaveURL(/\/login/)
 
    // Confirm the session is genuinely gone, not just the UI navigating —
    // a stale cookie would let this back in without re-entering credentials.
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
 
    // -- log back in -------------------------------------------------------
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /log in/i }).click()
 
    await expect(page).toHaveURL(/\/dashboard/)
    await page.getByRole('button', { name: /E2E Test User/i }).click()
})
 
test('a session survives a real page reload', async ({ page }) => {
    // This is the one thing no Vitest test can prove: AuthBootstrap's
    // refresh-on-mount actually working against a real httpOnly cookie set
    // by the real backend, not a mocked axios.post response.
    const email = testEmail()
    const password = 'a-real-password-1'
 
    await page.goto('/register')
    await page.getByLabel(/^name$/i).fill('Reload Test User')
    await page.getByLabel(/^email$/i).fill(email)
    await page.getByLabel(/^password$/i).fill(password)
    await page.getByLabel(/confirm password/i).fill(password)
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
 
    const cookies = await page.context().cookies('http://localhost:8000')
console.log('refresh_token present:', cookies.some(c => c.name === 'refresh_token'))
console.log('all backend cookies:', cookies.map(c => c.name))

    await page.reload()
 
    // If the cookie/refresh flow is broken, this would bounce to /login
    // instead — same failure mode this project hit for real earlier on.
    
    await expect(page.getByRole('button', { name: /Reload Test User/i })).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard/)

})