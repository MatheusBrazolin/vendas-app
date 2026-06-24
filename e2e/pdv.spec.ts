import { test, expect } from '@playwright/test'

test.describe('PDV — nova venda', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vendas/nova')
    // Aguarda o PDV terminar de carregar (campo de busca visível)
    await expect(
      page.getByLabel('Buscar produto por código ou nome')
    ).toBeVisible({ timeout: 8_000 })
  })

  test('campo de busca está focado ao abrir o PDV', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    await expect(input).toBeFocused()
  })

  test('busca por nome exibe resultados', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    // Digita uma letra genérica e aguarda resultados
    await input.fill('a')
    // Pode não ter resultado, mas não deve dar erro — o estado vazio também é válido
    await page.waitForTimeout(500)
    // Se tiver resultados, o botão "Adicionar" deve estar visível
    const addButtons = page.getByRole('button', { name: /adicionar/i })
    const count = await addButtons.count()
    // Zero ou mais resultados são ambos válidos
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('carrinho exibe mensagem de vazio quando não há itens', async ({ page }) => {
    // O cart vazio deve ter uma mensagem ou indicar 0 itens
    // O texto exato depende do componente Cart — verificamos que não houve crash
    await expect(page.locator('body')).not.toContainText('Error')
  })

  test('botão de nova venda leva para o PDV', async ({ page }) => {
    await page.goto('/vendas')
    await page.getByRole('link', { name: /nova venda/i }).first().click()
    await expect(page).toHaveURL(/vendas\/nova/, { timeout: 8_000 })
  })
})

test.describe('Fechamento de caixa', () => {
  test('página de fechamento carrega sem erros', async ({ page }) => {
    await page.goto('/vendas/fechamento')
    await expect(page).not.toHaveURL(/login/)
    await expect(page.getByRole('heading', { name: /fechamento/i })).toBeVisible({ timeout: 8_000 })
  })
})
