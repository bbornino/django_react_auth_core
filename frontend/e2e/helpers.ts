// Every user any E2E test creates must use this exact prefix — it's the
// only thing e2e_cleanup.py can use to tell a test account apart from a
// real one.
export function testEmail() {
    return `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`
}
