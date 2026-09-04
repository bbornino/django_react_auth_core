import { test, expect } from '@playwright/test'
import { testEmail } from './helpers'

test('rich text editing: typing, formatting, the HTML toggle, and persistence all work against the real editor', async ({ page }) => {
    const email = testEmail()
    const password = 'a-real-password-1'

    await page.goto('/register')
    await page.getByLabel(/^name$/i).fill('Editor Test User')
    await page.getByLabel(/^email$/i).fill(email)
    await page.getByLabel(/^password$/i).fill(password)
    await page.getByLabel(/confirm password/i).fill(password)
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto('/edit-profile')

    // Tiptap's editable surface is a real contenteditable region, not a
    // native input — exactly the interaction jsdom can't reliably
    // reproduce, which is why this test exists here instead of in Vitest.
    const editor = page.locator('[contenteditable="true"]')
    await editor.click()
    await editor.type('Hello world')

    await page.getByRole('button', { name: 'Bold' }).click()
    await editor.type(' bold text')

    await page.getByRole('button', { name: 'View HTML Source' }).click()
    const htmlSource = page.getByTestId('editor-html-source')
    await expect(htmlSource).toBeVisible()  // separate assertion: did the toggle even work?
    await expect(htmlSource).toHaveValue(/<strong>/)

    await page.getByRole('button', { name: 'View HTML Source' }).click()
    await expect(editor).toContainText('bold text')

    await page.getByRole('button', { name: /update user/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    // Confirm it actually persisted server-side, not just looked right
    // before the save round-trip.
    await page.goto('/edit-profile')
    const reloadedEditor = page.locator('[contenteditable="true"]')
    await expect(reloadedEditor).toContainText('bold text')
})
