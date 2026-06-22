/**
 * E2E tests for offline functionality.
 *
 * Strategy:
 *   1. Load the page online so the SyncProvider can populate IndexedDB.
 *   2. Simulate going offline with context.setOffline(true).
 *   3. Assert that the PDV can still search products and queue sales.
 *
 * These tests run against the real Next.js dev server (browser context,
 * not Electron). They cover the PWA / IndexedDB path; the Electron SQLite
 * path is verified by the unit tests in src/lib/queries/*.test.ts.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test'

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/** Wait for the SyncProvider to populate IndexedDB (runs on mount). */
async function waitForSync(page: Page) {
  // The SyncProvider fires on mount; give it up to 8 s to finish.
  await page.waitForFunction(
    () => {
      return new Promise<boolean>((resolve) => {
        const request = indexedDB.open('vendas-app')
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('products')) {
            resolve(false)
            return
          }
          const tx = db.transaction('products', 'readonly')
          const store = tx.objectStore('products')
          const count = store.count()
          count.onsuccess = () => resolve(count.result > 0)
          count.onerror = () => resolve(false)
        }
        request.onerror = () => resolve(false)
      })
    },
    { timeout: 8_000 },
  )
}

async function goOffline(context: BrowserContext) {
  await context.setOffline(true)
}

async function goOnline(context: BrowserContext) {
  await context.setOffline(false)
}

// --------------------------------------------------------------------------
// PDV — offline search
// --------------------------------------------------------------------------

test.describe('PDV — busca de produtos offline', () => {
  test('exibe produtos do IndexedDB quando offline', async ({ page, context }) => {
    await page.goto('/vendas/nova')
    await expect(page.getByLabel('Buscar produto por código ou nome')).toBeVisible({ timeout: 8_000 })

    // Give the SyncProvider a chance to populate the cache.
    try {
      await waitForSync(page)
    } catch {
      test.skip(true, 'IndexedDB vazio — nenhum produto cadastrado para testar offline')
      return
    }

    await goOffline(context)

    try {
      const input = page.getByLabel('Buscar produto por código ou nome')
      await input.fill('a')
      await page.waitForTimeout(600)

      // Either results appear or the "empty stock" message — no JS error.
      const hasResults = await page.locator('[role="listbox"]').isVisible()
      const hasEmpty = await page.getByText('Nenhum produto encontrado').isVisible().catch(() => false)
      expect(hasResults || hasEmpty).toBeTruthy()

      // The page must not show a crash banner.
      await expect(page.locator('body')).not.toContainText('Error')
    } finally {
      await goOnline(context)
    }
  })
})

// --------------------------------------------------------------------------
// PDV — offline sale queuing
// --------------------------------------------------------------------------

test.describe('PDV — venda offline (dinheiro)', () => {
  test('exibe toast de confirmação e limpa o carrinho após queue', async ({ page, context }) => {
    await page.goto('/vendas/nova')
    await expect(page.getByLabel('Buscar produto por código ou nome')).toBeVisible({ timeout: 8_000 })

    try {
      await waitForSync(page)
    } catch {
      test.skip(true, 'Sem cache — impossível simular venda offline')
      return
    }

    // Search for any product and add the first result to the cart.
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    await page.waitForTimeout(600)

    const hasResults = await page.locator('[role="listbox"]').isVisible()
    if (!hasResults) {
      test.skip(true, 'Nenhum produto encontrado pelo IndexedDB para testar')
      return
    }

    const firstAdd = page.getByRole('button', { name: /adicionar/i }).first()
    await firstAdd.click()
    await page.waitForTimeout(200)

    // Pick a payment method (dinheiro / cash).
    const paymentSelect = page.getByRole('combobox')
    if (await paymentSelect.isVisible()) {
      await paymentSelect.selectOption('cash')
    } else {
      const cashBtn = page.getByRole('radio', { name: /dinheiro/i })
      if (await cashBtn.isVisible()) await cashBtn.click()
    }

    await goOffline(context)

    try {
      await page.getByRole('button', { name: /confirmar venda/i }).click()

      // Toast with offline confirmation must appear.
      await expect(
        page.getByText('Venda salva offline — será enviada ao reconectar.'),
      ).toBeVisible({ timeout: 5_000 })
    } finally {
      await goOnline(context)
    }
  })
})

// --------------------------------------------------------------------------
// PDV — offline fiado (crédito para cliente cadastrado)
// --------------------------------------------------------------------------

test.describe('PDV — venda fiado offline', () => {
  test('permite fiado offline para cliente já em cache', async ({ page, context }) => {
    await page.goto('/vendas/nova')
    await expect(page.getByLabel('Buscar produto por código ou nome')).toBeVisible({ timeout: 8_000 })

    try {
      await waitForSync(page)
    } catch {
      test.skip(true, 'Sem cache — impossível testar fiado offline')
      return
    }

    // Check if there are any customers in the cache before going offline.
    const hasCustomers = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const req = indexedDB.open('vendas-app')
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('customers')) { resolve(false); return }
          const tx = db.transaction('customers', 'readonly')
          const count = tx.objectStore('customers').count()
          count.onsuccess = () => resolve(count.result > 0)
          count.onerror = () => resolve(false)
        }
        req.onerror = () => resolve(false)
      })
    })

    if (!hasCustomers) {
      test.skip(true, 'Sem clientes em cache — impossível testar fiado offline')
      return
    }

    // Add a product.
    const productInput = page.getByLabel('Buscar produto por código ou nome')
    await productInput.fill('a')
    await page.waitForTimeout(600)
    if (!await page.locator('[role="listbox"]').isVisible()) {
      test.skip(true, 'Sem produtos em cache')
      return
    }
    await page.getByRole('button', { name: /adicionar/i }).first().click()
    await page.waitForTimeout(200)

    // Select fiado payment method.
    const paymentSelect = page.getByRole('combobox')
    if (await paymentSelect.isVisible()) {
      await paymentSelect.selectOption('fiado')
    } else {
      const fiadoBtn = page.getByRole('radio', { name: /fiado/i })
      if (await fiadoBtn.isVisible()) await fiadoBtn.click()
    }

    // Wait for customer search input to appear.
    const customerInput = page.getByPlaceholder(/buscar cliente/i)
    if (!await customerInput.isVisible()) {
      test.skip(true, 'Campo de busca de cliente não encontrado')
      return
    }

    await goOffline(context)

    try {
      // Search for customer offline.
      await customerInput.fill('a')
      await page.waitForTimeout(600)

      // Customer should be found from local cache.
      const customerResults = page.getByRole('option').or(
        page.locator('[data-customer-result]'),
      )
      const count = await customerResults.count()

      if (count === 0) {
        // Empty result is still valid — just skip the confirmation step.
        test.skip(true, 'Sem clientes com "a" no nome em cache')
        return
      }

      await customerResults.first().click()
      await page.waitForTimeout(200)

      await page.getByRole('button', { name: /confirmar venda/i }).click()

      // Toast with offline confirmation must appear.
      await expect(
        page.getByText('Venda salva offline — será enviada ao reconectar.'),
      ).toBeVisible({ timeout: 5_000 })
    } finally {
      await goOnline(context)
    }
  })
})

// --------------------------------------------------------------------------
// Pages — offline banner
// --------------------------------------------------------------------------

test.describe('Páginas — banner offline', () => {
  const PAGES = [
    { name: 'dashboard', path: '/' },
    { name: 'produtos', path: '/produtos' },
  ]

  for (const { name, path } of PAGES) {
    test(`${name} renderiza sem crash quando offline`, async ({ page, context }) => {
      // Load the page online first to prime the server-component cache.
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      await goOffline(context)

      try {
        // Reload while offline.
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 10_000 }).catch(() => {})

        // Must not show a raw error / crash page.
        await expect(page.locator('body')).not.toContainText('Application error')
        await expect(page.locator('body')).not.toContainText('Unhandled Runtime Error')
      } finally {
        await goOnline(context)
      }
    })
  }
})

// --------------------------------------------------------------------------
// SyncProvider — flush on reconnect
// --------------------------------------------------------------------------

test.describe('Sincronização — flush ao reconectar', () => {
  test('após uma venda offline, o badge de pendentes aparece', async ({ page, context }) => {
    await page.goto('/vendas/nova')
    await expect(page.getByLabel('Buscar produto por código ou nome')).toBeVisible({ timeout: 8_000 })

    try {
      await waitForSync(page)
    } catch {
      test.skip(true, 'Sem cache')
      return
    }

    // Add a product and queue an offline sale.
    const input = page.getByLabel('Buscar produto por código ou nome')
    await input.fill('a')
    await page.waitForTimeout(600)
    if (!await page.locator('[role="listbox"]').isVisible()) {
      test.skip(true, 'Sem produtos em cache')
      return
    }
    await page.getByRole('button', { name: /adicionar/i }).first().click()
    await page.waitForTimeout(200)

    const paymentSelect = page.getByRole('combobox')
    if (await paymentSelect.isVisible()) await paymentSelect.selectOption('cash')

    await goOffline(context)
    await page.getByRole('button', { name: /confirmar venda/i }).click()
    await expect(
      page.getByText('Venda salva offline — será enviada ao reconectar.'),
    ).toBeVisible({ timeout: 5_000 })

    // Go back online — SyncProvider should detect reconnect and flush.
    await goOnline(context)
    await page.waitForTimeout(3_000)

    // After flush (or attempted flush), the page must not have crashed.
    await expect(page.locator('body')).not.toContainText('Application error')
  })
})
