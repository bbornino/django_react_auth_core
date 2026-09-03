import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'
import { testEmail } from './helpers'

const password = 'a-real-password-1'

function promoteToAdmin(email: string) {
    execSync(`python manage.py e2e_make_admin "${email}"`, {
        cwd: '../backend',
        stdio: 'inherit',
    })
}

async function registerAndLogout(page: import('@playwright/test').Page, name: string, email: string) {
    await page.goto('/register')
    await page.getByLabel(/^name$/i).fill(name)
    await page.getByLabel(/^email$/i).fill(email)
    await page.getByLabel(/^password$/i).fill(password)
    await page.getByLabel(/confirm password/i).fill(password)
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    // Dashboard's raw debug dump is the only place the real numeric id is
    // visible in the UI — pulling it here avoids hardcoding a guessed id.
    const id = JSON.parse(await page.locator('pre').innerText()).id

    await page.getByRole('button', { name: new RegExp(name, 'i') }).click()
    await page.getByText('Logout').click()
    await expect(page).toHaveURL(/\/login/)

    return id
}

async function login(page: import('@playwright/test').Page, email: string) {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)
}

test("a non-admin cannot view another user's profile by typing the URL directly, even though nothing stops them trying", async ({ page }) => {
    const victimEmail = testEmail()
    const victimId = await registerAndLogout(page, 'Victim User', victimEmail)

    const attackerEmail = testEmail()
    await registerAndLogout(page, 'Attacker User', attackerEmail)
    await login(page, attackerEmail)

    // The attacker manually navigates to a URL they were never given a link
    // to — this is the actual scenario: nothing in the UI prevents typing
    // this, so the guard has to be real, not just "no link exists."
    await page.goto(`/edit-profile/${victimId}`)

    // EditUserPage's own role check redirects client-side before any form
    // ever renders; even if that check were bypassed, the backend's
    // get_queryset() scoping would 404 on the fetch and redirect anyway —
    // this test can't tell which layer caught it, only that one did.
    await expect(page).toHaveURL(/\/dashboard/)
})

test("a promoted admin can view and edit another user's profile via a direct URL", async ({ page }) => {
    const targetEmail = testEmail()
    const targetId = await registerAndLogout(page, 'Target User', targetEmail)

    const adminEmail = testEmail()
    await registerAndLogout(page, 'Admin User', adminEmail)
    promoteToAdmin(adminEmail)
    await login(page, adminEmail)

    await page.goto(`/edit-profile/${targetId}`)
    await expect(page.getByLabel(/^name$/i)).toHaveValue('Target User')

    // role is the field that actually controls authorization in this app —
    // is_staff/is_superuser gate Django's own admin site, a separate concern
    // from this page's admin-tier access. Changing role is the meaningful
    // proof that admin write access genuinely works.
    await page.getByRole('combobox', { name: /role/i }).click()
    await page.getByRole('option', { name: /^admin$/i }).click()
    await page.getByRole('button', { name: /update user/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    // Don't trust the redirect alone — re-fetch and confirm the change
    // actually persisted server-side, not just that the request didn't error.
    await page.goto(`/edit-profile/${targetId}`)
    await expect(page.getByRole('combobox', { name: /role/i })).toHaveText(/admin/i)
})

test("admin editing another user's profile does not corrupt the admin's own identity", async ({ page }) => {
    const targetEmail = testEmail()
    const targetId = await registerAndLogout(page, 'Corruption Target', targetEmail)

    const adminEmail = testEmail()
    await registerAndLogout(page, 'Corruption Admin', adminEmail)
    promoteToAdmin(adminEmail)
    await login(page, adminEmail)

    // Admin's own identity, as shown in the navbar, before touching anyone else's data.
    await expect(page.getByRole('button', { name: /Corruption Admin/i })).toBeVisible()

    await page.goto(`/edit-profile/${targetId}`)
    await page.getByLabel(/^name$/i).fill('Renamed Target')
    await page.getByRole('button', { name: /update user/i }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    // The real risk: EditUserPage only calls setCurrentUser when editing SELF
    // (currentUser.id === effectiveUserId) — if that guard ever broke, an
    // admin editing someone else could silently overwrite their own identity
    // in the store. This is the check that would catch that regression.
    await expect(page.getByRole('button', { name: /Corruption Admin/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Renamed Target/i })).not.toBeVisible()
})
