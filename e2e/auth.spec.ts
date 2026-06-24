import { test, expect } from '@playwright/test'

test.describe('proteção de rotas', () => {
  // Esses testes rodam SEM a sessão salva para verificar os redirects.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('rota protegida redireciona para login sem sessão', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/)
  })

  test('vendas protegida redireciona para login sem sessão', async ({ page }) => {
    await page.goto('/vendas')
    await expect(page).toHaveURL(/login/)
  })

  test('produtos protegida redireciona para login sem sessão', async ({ page }) => {
    await page.goto('/produtos')
    await expect(page).toHaveURL(/login/)
  })

  test('relatorios protegida redireciona para login sem sessão', async ({ page }) => {
    await page.goto('/relatorios')
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('login autenticado', () => {
  test('usuário já autenticado é redirecionado para fora do login', async ({ page }) => {
    // storageState com sessão já está ativo (herdado do projeto chromium/mobile)
    await page.goto('/login')
    // Deve sair do /login para o app
    await expect(page).not.toHaveURL(/login/)
  })

  test('página de nova venda carrega após login', async ({ page }) => {
    await page.goto('/vendas/nova')
    await expect(page).toHaveURL(/vendas\/nova/)
    // O campo de busca do PDV deve estar visível
    await expect(
      page.getByLabel('Buscar produto por código ou nome')
    ).toBeVisible({ timeout: 8_000 })
  })
})
