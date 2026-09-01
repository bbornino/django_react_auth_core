import { execSync } from 'child_process'

export default async function globalTeardown() {
    // cwd is relative to wherever `playwright test` is actually invoked from
    // (frontend/), so '../backend' resolves to the Django project root.
    // Requires the backend's venv to be the active Python on PATH in
    // whatever terminal runs this — same gotcha as running `manage.py`
    // directly from an unactivated shell earlier in this project's history.
    execSync('python manage.py e2e_cleanup', {
        cwd: '../backend',
        stdio: 'inherit',
    })
}