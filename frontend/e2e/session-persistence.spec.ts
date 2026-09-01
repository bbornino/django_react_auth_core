import { test, expect } from '@playwright/test'
import { testEmail } from './helpers'

test('a session set in one tab is usable in a second tab sharing the same browser context', async ({ context }) => {
    const email = testEmail()
    const password = 'a-real-password-1'

    const page1 = await context.newPage()
    await page1.goto('/register')
    await page1.getByLabel(/^name$/i).fill('Multi Tab User')
    await page1.getByLabel(/^email$/i).fill(email)
    await page1.getByLabel(/^password$/i).fill(password)
    await page1.getByLabel(/confirm password/i).fill(password)
    await page1.getByRole('button', { name: /create account/i }).click()
    await expect(page1).toHaveURL(/\/dashboard/)

    // A second, independent page — but sharing `context`, so it shares the
    // same cookie jar. This is the actual claim the README makes ("multiple
    // tabs each independently redeeming the same refresh cookie is safe"),
    // proven directly rather than just reasoned about.
    const page2 = await context.newPage()
    await page2.goto('/dashboard')

    await expect(page2).toHaveURL(/\/dashboard/)
    await expect(page2.getByRole('button', { name: /Multi Tab User/i })).toBeVisible()

    await page1.close()
    await page2.close()
})

test('dark mode persists across a real reload after saving', async ({ page }) => {
    const email = testEmail()
    const password = 'a-real-password-1'

    await page.goto('/register')
    await page.getByLabel(/^name$/i).fill('Dark Mode User')
    await page.getByLabel(/^email$/i).fill(email)
    await page.getByLabel(/^password$/i).fill(password)
    await page.getByLabel(/confirm password/i).fill(password)
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.goto('/edit-profile')
    await page.getByRole('checkbox', { name: /dark mode/i }).click()
    await page.getByRole('button', { name: /update user/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.reload()

    // Real DOM check against the real <html> element — this is what the
    // index.html pre-paint script and useThemeSync are actually for.
    // Nothing here is mocked; a broken save, a broken /me response, or a
    // broken pre-paint script would all show up as a failure here.
    await expect(page.locator('html')).toHaveClass(/dark/)
})

test('turning dark mode back off also persists across a reload', async ({ page }) => {
    const email = testEmail()
    const password = 'a-real-password-1'

    await page.goto('/register')
    await page.getByLabel(/^name$/i).fill('Light Mode Again User')
    await page.getByLabel(/^email$/i).fill(email)
    await page.getByLabel(/^password$/i).fill(password)
    await page.getByLabel(/confirm password/i).fill(password)
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto('/edit-profile')
    await page.getByRole('checkbox', { name: /dark mode/i }).click()
    await page.getByRole('button', { name: /update user/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto('/edit-profile')
    await page.getByRole('checkbox', { name: /dark mode/i }).click() // toggle back off
    await page.getByRole('button', { name: /update user/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.reload()

    await expect(page.locator('html')).not.toHaveClass(/dark/)
})
