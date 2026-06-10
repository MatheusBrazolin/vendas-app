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
  await page.getByLabel('Senha').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Admin é redirecionado para /vendas/nova após login bem-sucedido
  await page.waitForURL('**/vendas/nova', { timeout: 10_000 })
  await expect(page).toHaveURL(/vendas\/nova/)

  await page.context().storageState({ path: authFile })
})
