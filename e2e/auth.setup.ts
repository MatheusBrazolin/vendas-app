import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/admin.json')

// Logs in once and saves session state to e2e/.auth/admin.json.
// All tests in the chromium/mobile projects reuse this state so login
// only happens one time per test run.
setup('autenticar como admin', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD no .env.test.local para rodar os testes E2E.'
    )
  }

  await page.goto('/login')
  await page.getByLabel('Usuário').fill(email)
  // Use the password input directly to avoid strict-mode collision with the
  // "Mostrar senha" toggle button that also carries an aria-label containing "Senha".
  await page.locator('input#password').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Admin pode ser redirecionado para /dashboard ou /vendas/nova após login.
  await page.waitForURL(/\/(dashboard|vendas\/nova)/, { timeout: 10_000 })
  await expect(page).not.toHaveURL(/login/)

  await page.context().storageState({ path: authFile })
})
