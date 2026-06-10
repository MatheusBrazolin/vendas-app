import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

// Carrega .env.test.local (e demais arquivos .env do Next.js) para os testes E2E.
// NODE_ENV=test é definido automaticamente pelo Playwright.
loadEnvConfig(process.cwd())

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Fail the build on CI if you accidentally left test.only in the source.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Auth setup runs first — logs in and saves session state.
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],

  // In CI, start the already-built app. Locally, expect `npm run dev` to be running.
  webServer: process.env.CI
    ? {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
})
