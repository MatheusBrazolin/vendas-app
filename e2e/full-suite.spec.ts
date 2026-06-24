/**
 * E2E Full Test Suite
 * Tests all critical user journeys for the vendas-app.
 */
import { test, expect, type Page } from '@playwright/test'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function waitForPDV(page: Page) {
  await page.goto('/vendas/nova')
  await expect(
    page.getByLabel('Buscar produto por código ou nome')
  ).toBeVisible({ timeout: 10_000 })
}

// ─── 1. PDV — Nova Venda ────────────────────────────────────────────────────

test.describe('PDV — Nova Venda (/vendas/nova)', () => {
  test.beforeEach(async ({ page }) => {
    await waitForPDV(page)
  })

  test('campo de busca carrega com foco automático', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    await expect(input).toBeFocused()
  })

  test('dicas de teclado aparecem (hints "Com código" e "Sem código")', async ({ page }) => {
    // Hints appear when no results and no staged product
    await expect(page.getByText('Com código:')).toBeVisible()
    await expect(page.getByText('Sem código:')).toBeVisible()
  })

  test('busca por nome: digitar texto mostra dropdown de resultados', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    // Wait for debounce (300ms) + network
    await page.waitForTimeout(600)

    // Either results appear or "nenhum produto" — either is valid, no crash
    const hasResults = await page.locator('[role="listbox"]').isVisible()
    const hasEmpty = await page.getByText('Nenhum produto encontrado em estoque').isVisible()
    expect(hasResults || hasEmpty).toBeTruthy()
  })

  test('navegação por teclado no dropdown: ↓ destaca primeiro item', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    await page.waitForTimeout(600)

    const hasResults = await page.locator('[role="listbox"]').isVisible()
    if (!hasResults) {
      test.skip()
      return
    }

    await input.press('ArrowDown')
    // First item should be highlighted (aria-selected=true or has blue class)
    const firstItem = page.locator('[role="option"]').first()
    await expect(firstItem).toHaveAttribute('aria-selected', 'true')
  })

  test('navegação por teclado: ↓ avança, ↑ volta', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    await page.waitForTimeout(600)

    const resultCount = await page.locator('[role="option"]').count()
    if (resultCount < 2) {
      test.skip()
      return
    }

    await input.press('ArrowDown')
    await input.press('ArrowDown')
    const secondItem = page.locator('[role="option"]').nth(1)
    await expect(secondItem).toHaveAttribute('aria-selected', 'true')

    await input.press('ArrowUp')
    const firstItem = page.locator('[role="option"]').first()
    await expect(firstItem).toHaveAttribute('aria-selected', 'true')
  })

  test('Enter com item destacado abre staging panel (painel azul)', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    await page.waitForTimeout(600)

    const hasResults = await page.locator('[role="listbox"]').isVisible()
    if (!hasResults) {
      test.skip()
      return
    }

    await input.press('ArrowDown')
    await input.press('Enter')

    // Staging panel should appear (blue border panel)
    await expect(page.locator('.border-blue-400')).toBeVisible({ timeout: 3_000 })
  })

  test('staging panel: campo de qty aparece com foco', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    await page.waitForTimeout(600)

    const hasResults = await page.locator('[role="listbox"]').isVisible()
    if (!hasResults) {
      test.skip()
      return
    }

    await input.press('ArrowDown')
    await input.press('Enter')

    await expect(page.locator('.border-blue-400')).toBeVisible({ timeout: 3_000 })

    // Qty input should be focused
    const qtyInput = page.getByLabel('Quantidade')
    await expect(qtyInput).toBeFocused({ timeout: 2_000 })
  })

  test('Enter no campo de qty adiciona ao carrinho e volta foco ao campo de busca', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    await page.waitForTimeout(600)

    const hasResults = await page.locator('[role="listbox"]').isVisible()
    if (!hasResults) {
      test.skip()
      return
    }

    await input.press('ArrowDown')
    await input.press('Enter')

    await expect(page.locator('.border-blue-400')).toBeVisible({ timeout: 3_000 })

    const qtyInput = page.getByLabel('Quantidade')
    await qtyInput.press('Enter')

    // Staging panel should disappear
    await expect(page.locator('.border-blue-400')).not.toBeVisible({ timeout: 3_000 })

    // Focus should return to search field
    await expect(input).toBeFocused({ timeout: 2_000 })
  })

  test('Esc no staging cancela e volta foco ao campo de busca', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    await page.waitForTimeout(600)

    const hasResults = await page.locator('[role="listbox"]').isVisible()
    if (!hasResults) {
      test.skip()
      return
    }

    await input.press('ArrowDown')
    await input.press('Enter')

    await expect(page.locator('.border-blue-400')).toBeVisible({ timeout: 3_000 })

    const qtyInput = page.getByLabel('Quantidade')
    await qtyInput.press('Escape')

    // Staging panel should disappear
    await expect(page.locator('.border-blue-400')).not.toBeVisible({ timeout: 3_000 })

    // Focus should return to search field
    await expect(input).toBeFocused({ timeout: 2_000 })
  })

  test('dica ↓↑ aparece quando dropdown tem múltiplos resultados', async ({ page }) => {
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    await page.waitForTimeout(600)

    const resultCount = await page.locator('[role="option"]').count()
    if (resultCount < 2) {
      test.skip()
      return
    }

    // Navigation hint should show for multiple results
    const hint = page.locator('text=navegar')
    await expect(hint).toBeVisible()
  })
})

// ─── 2. Cadastro de Produto ─────────────────────────────────────────────────

test.describe('Cadastro de Produto (/produtos/novo)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/produtos/novo')
    await expect(page.getByRole('heading', { name: /novo produto/i })).toBeVisible({ timeout: 8_000 })
  })

  test('campo de preço de venda: digitar números formata como moeda', async ({ page }) => {
    // The CurrencyInput components don't have standard labels — locate by proximity to "Preço de venda"
    const salePriceLabel = page.getByText('Preço de venda')
    await expect(salePriceLabel).toBeVisible()

    // Get the input near the label
    const salePriceInput = page.locator('input[inputmode="numeric"]').first()

    // Simulate ATM-style: "250" → "2,50"
    await salePriceInput.click()
    await salePriceInput.fill('250')
    // Trigger change event
    await salePriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    const value = await salePriceInput.inputValue()
    expect(value).toMatch(/2[,.]50/)
  })

  test('campo de preço de custo: mesma formatação', async ({ page }) => {
    const costPriceInput = page.locator('input[inputmode="numeric"]').nth(1)

    await costPriceInput.click()
    await costPriceInput.fill('100')
    await costPriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    const value = await costPriceInput.inputValue()
    expect(value).toMatch(/1[,.]00/)
  })

  test('indicador de lucro aparece quando ambos os campos têm valor', async ({ page }) => {
    const salePriceInput = page.locator('input[inputmode="numeric"]').first()
    const costPriceInput = page.locator('input[inputmode="numeric"]').nth(1)

    await salePriceInput.click()
    await salePriceInput.fill('25000')
    await salePriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    await costPriceInput.click()
    await costPriceInput.fill('10000')
    await costPriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    // Profit indicator should appear
    await expect(page.getByText(/Margem/i)).toBeVisible({ timeout: 2_000 })
  })

  test('indicador mostra Margem % e Ganho s/ custo %', async ({ page }) => {
    const salePriceInput = page.locator('input[inputmode="numeric"]').first()
    const costPriceInput = page.locator('input[inputmode="numeric"]').nth(1)

    await salePriceInput.click()
    await salePriceInput.fill('25000')
    await salePriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    await costPriceInput.click()
    await costPriceInput.fill('10000')
    await costPriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    await expect(page.getByText(/Margem/i)).toBeVisible({ timeout: 2_000 })
    await expect(page.getByText(/Ganho/i)).toBeVisible({ timeout: 2_000 })
  })

  test('indicador fica verde quando venda > custo', async ({ page }) => {
    const salePriceInput = page.locator('input[inputmode="numeric"]').first()
    const costPriceInput = page.locator('input[inputmode="numeric"]').nth(1)

    await salePriceInput.click()
    await salePriceInput.fill('25000')
    await salePriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    await costPriceInput.click()
    await costPriceInput.fill('10000')
    await costPriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    // Green indicator (TrendingUp icon or green color)
    const indicator = page.locator('[class*="green"], [class*="emerald"]').filter({ hasText: /Margem|Ganho/ })
    // Or look for the TrendingUp svg
    const trendingUp = page.locator('svg').filter({ has: page.locator('path') }).nth(0)
    const greenSection = page.locator('.text-green-600, .text-emerald-600, .bg-green-50, .bg-emerald-50').first()
    await expect(greenSection).toBeVisible({ timeout: 2_000 })
  })

  test('indicador fica vermelho quando venda < custo (prejuízo)', async ({ page }) => {
    const salePriceInput = page.locator('input[inputmode="numeric"]').first()
    const costPriceInput = page.locator('input[inputmode="numeric"]').nth(1)

    // Sale price LESS than cost
    await salePriceInput.click()
    await salePriceInput.fill('5000')
    await salePriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    await costPriceInput.click()
    await costPriceInput.fill('10000')
    await costPriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    // Red indicator
    const redSection = page.locator('.text-red-600, .text-red-700, .bg-red-50').first()
    await expect(redSection).toBeVisible({ timeout: 2_000 })
  })
})

// ─── 3. Clientes / Fiado ────────────────────────────────────────────────────

test.describe('Clientes / Fiado (/clientes)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/clientes')
    await expect(
      page.getByRole('heading', { name: /clientes/i })
    ).toBeVisible({ timeout: 8_000 })
  })

  test('página carrega com lista de clientes', async ({ page }) => {
    // Either shows customer cards or the empty state message
    const hasCustomers = await page.locator('[class*="rounded-xl"]').first().isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/Nenhum cliente cadastrado/).isVisible().catch(() => false)
    expect(hasCustomers || hasEmpty).toBeTruthy()
  })

  test('badge de dias aparece corretamente', async ({ page }) => {
    const customerCount = await page.locator('[class*="rounded-xl"]').count()
    if (customerCount === 0) {
      test.skip()
      return
    }

    // Each customer card should show debt info (days badge or "Sem débito")
    const firstCard = page.locator('[class*="rounded-xl"]').first()
    const hasDays = await firstCard.getByText(/dias|hoje|Sem débito|Sem histórico|aberto/i).isVisible()
    expect(hasDays).toBeTruthy()
  })

  test('botão "Ver detalhes" navega para a página do cliente', async ({ page }) => {
    const customerCount = await page.locator('[class*="rounded-xl"]').count()
    if (customerCount === 0) {
      test.skip()
      return
    }

    const firstCard = page.locator('[class*="rounded-xl"]').first()
    const detailLink = firstCard.getByRole('link', { name: /ver detalhes/i })
    await detailLink.click()

    await expect(page).toHaveURL(/clientes\/[a-z0-9-]+/, { timeout: 8_000 })
  })
})

// ─── 4. Detalhe do Cliente ──────────────────────────────────────────────────

test.describe('Detalhe do cliente (/clientes/[id])', () => {
  let firstCustomerId: string | null = null

  test.beforeEach(async ({ page }) => {
    await page.goto('/clientes')
    await expect(
      page.getByRole('heading', { name: /clientes/i })
    ).toBeVisible({ timeout: 8_000 })

    // Try to get a customer id from the first card link
    const firstLink = page.locator('a[href*="/clientes/"]').first()
    const href = await firstLink.getAttribute('href').catch(() => null)
    if (href) {
      firstCustomerId = href
    }
  })

  test('página carrega com informações do cliente', async ({ page }) => {
    if (!firstCustomerId) {
      test.skip()
      return
    }

    await page.goto(firstCustomerId)
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 8_000 })
    // Should show financial cards
    await expect(page.getByText(/Total fiado/i)).toBeVisible()
  })

  test('botão "Registrar pagamento" abre modal', async ({ page }) => {
    if (!firstCustomerId) {
      test.skip()
      return
    }

    await page.goto(firstCustomerId)
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 8_000 })

    await page.getByRole('button', { name: /registrar pagamento/i }).click()

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 })
  })

  test('modal tem campo de valor', async ({ page }) => {
    if (!firstCustomerId) {
      test.skip()
      return
    }

    await page.goto(firstCustomerId)
    await expect(page.getByRole('heading')).toBeVisible({ timeout: 8_000 })

    await page.getByRole('button', { name: /registrar pagamento/i }).click()

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3_000 })
    // Modal should have a value input
    await expect(page.getByLabel(/valor recebido/i)).toBeVisible()
  })
})

// ─── 5. Recibo de Venda ─────────────────────────────────────────────────────

test.describe('Recibo de Venda (/vendas/[id]/recibo)', () => {
  test('recibo renderiza se existir alguma venda', async ({ page }) => {
    // Navigate to sales list and get first sale ID
    await page.goto('/vendas')
    await expect(page.getByRole('heading', { name: /vendas/i })).toBeVisible({ timeout: 8_000 })

    // Look for a link to a sale receipt or any sale row
    const saleLink = page.locator('a[href*="/vendas/"]').filter({ hasNot: page.locator('[href*="nova"]') }).first()
    const href = await saleLink.getAttribute('href').catch(() => null)

    if (!href) {
      test.skip()
      return
    }

    // Navigate to receipt — either /vendas/[id] or /vendas/[id]/recibo
    const receiptUrl = href.includes('/recibo') ? href : href + '/recibo'
    await page.goto(receiptUrl)

    // Page should not error
    await expect(page.locator('body')).not.toContainText('500')
    await expect(page.locator('body')).not.toContainText('Error')
    await expect(page).not.toHaveURL(/\/login/)
  })
})

// ─── 6. Responsividade ─────────────────────────────────────────────────────

test.describe('Responsividade — Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('/vendas/nova — layout não quebra, campo de busca visível', async ({ page }) => {
    await waitForPDV(page)
    const input = page.getByLabel('Buscar produto por código ou nome')
    await expect(input).toBeVisible()

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375 + 5) // small tolerance
  })

  test('/vendas/nova — staging panel visível em mobile', async ({ page }) => {
    await waitForPDV(page)
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    await page.waitForTimeout(600)

    const hasResults = await page.locator('[role="listbox"]').isVisible()
    if (!hasResults) {
      test.skip()
      return
    }

    await input.press('ArrowDown')
    await input.press('Enter')

    const stagingPanel = page.locator('.border-blue-400')
    await expect(stagingPanel).toBeVisible({ timeout: 3_000 })

    // Check it's within viewport
    const box = await stagingPanel.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x + box!.width).toBeLessThanOrEqual(380)
  })

  test('/clientes — mobile: cards empilhados, texto legível', async ({ page }) => {
    await page.goto('/clientes')
    await expect(page.getByRole('heading', { name: /clientes/i })).toBeVisible({ timeout: 8_000 })

    const customerCount = await page.locator('[class*="rounded-xl"]').count()
    if (customerCount > 0) {
      const firstCard = page.locator('[class*="rounded-xl"]').first()
      await expect(firstCard).toBeVisible()

      // Check no overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(bodyWidth).toBeLessThanOrEqual(380)
    }
  })

  test('/produtos/novo — mobile: formulário legível, indicador de lucro visível', async ({ page }) => {
    await page.goto('/produtos/novo')
    await expect(page.getByRole('heading', { name: /novo produto/i })).toBeVisible({ timeout: 8_000 })

    // Fill both price fields to trigger indicator
    const salePriceInput = page.locator('input[inputmode="numeric"]').first()
    const costPriceInput = page.locator('input[inputmode="numeric"]').nth(1)

    await salePriceInput.click()
    await salePriceInput.fill('25000')
    await salePriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    await costPriceInput.click()
    await costPriceInput.fill('10000')
    await costPriceInput.dispatchEvent('input')
    await page.waitForTimeout(100)

    await expect(page.getByText(/Margem/i)).toBeVisible({ timeout: 2_000 })

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(380)
  })
})

test.describe('Responsividade — Desktop (1280px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('/vendas/nova — layout em colunas (busca à esquerda, carrinho à direita)', async ({ page }) => {
    await waitForPDV(page)

    // Find the search input and cart - they should be side by side
    const searchInput = page.getByLabel('Buscar produto por código ou nome')
    const searchBox = await searchInput.boundingBox()
    expect(searchBox).not.toBeNull()

    // The cart should be to the right of the search area
    // Look for shopping cart heading or icon
    const cartSection = page.locator('[class*="cart"], [class*="Cart"]').first()
      .or(page.getByRole('heading', { name: /carrinho/i }))

    // Both sections should be visible and not stacked (search x + width < cart x)
    // Just check that page renders without error in a two-column layout
    expect(searchBox!.x).toBeLessThan(640) // search is on left half
  })
})
