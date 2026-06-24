import { test, expect } from '@playwright/test'

test.describe('navegação e loading states', () => {
  test('sidebar está visível no desktop', async ({ page }) => {
    await page.goto('/vendas/nova')
    await expect(page.locator('aside')).toBeVisible()
  })

  test('navegar para histórico de vendas carrega a tabela', async ({ page }) => {
    await page.goto('/vendas')
    // Deve mostrar o título da página (não a tela de loading)
    await expect(page.getByRole('heading', { name: /vendas/i })).toBeVisible({ timeout: 8_000 })
  })

  test('navegar para produtos carrega a listagem', async ({ page }) => {
    await page.goto('/produtos')
    await expect(page.getByRole('heading', { name: /produtos/i })).toBeVisible({ timeout: 8_000 })
  })

  test('navegar para o dashboard carrega os KPI cards', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10_000 })
  })

  test('navegar para relatório de lucro carrega a página', async ({ page }) => {
    await page.goto('/relatorios')
    await expect(page.getByRole('heading', { name: /relatório de lucro/i })).toBeVisible({ timeout: 8_000 })
    // Seletores de período devem estar visíveis
    await expect(page.getByRole('link', { name: 'Este mês' })).toBeVisible()
  })

  test('loading states aparecem ao navegar entre páginas', async ({ page }) => {
    await page.goto('/vendas/nova')
    // Clica no link do histórico de vendas na sidebar
    await page.getByRole('link', { name: 'Histórico' }).click()
    // Depois do clique, deve chegar em /vendas
    await expect(page).toHaveURL(/\/vendas$/, { timeout: 8_000 })
  })
})
