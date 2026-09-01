import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    globalTeardown: './e2e/global-teardown.ts',
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
    },
    use: {
        baseURL: 'http://localhost:5173',
    },
})