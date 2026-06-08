/**
 * Offline-first product reads for the PDV.
 *
 * The point of sale must work with no network, so it reads exclusively from
 * the local IndexedDB cache (kept fresh by `SyncProvider` → `sync.ts`).
 * Catalogs here are small (hundreds of rows), so a full `.filter()` scan for
 * substring matches is cheap and mirrors the previous Supabase `ilike %q%`
 * semantics exactly — no need for prefix-only Dexie index queries.
 *
 * Browser-only: `getDB()` throws on the server, so only import from client
 * components.
 */

import { getDB } from './db'
import { syncProducts } from './sync'
import type { Product } from '@/types/database'

const DEFAULT_LIMIT = 10

/**
 * Substring search by name OR code, case-insensitive. Only active products
 * with stock are returned — same filter the PDV always applied.
 */
export async function searchProducts(
  query: string,
  limit = DEFAULT_LIMIT,
): Promise<Product[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const db = getDB()
  const matches = await db.products
    .filter(
      (p) =>
        p.is_active &&
        p.stock_quantity > 0 &&
        (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)),
    )
    .limit(limit)
    .toArray()

  // Stable, predictable ordering for the dropdown.
  return matches.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/** Exact barcode/SKU lookup. Returns null when there's no active match. */
export async function getByCode(code: string): Promise<Product | null> {
  const trimmed = code.trim()
  if (!trimmed) return null

  const db = getDB()
  const product = await db.products.where('code').equals(trimmed).first()
  if (!product || !product.is_active) return null
  return product
}

/**
 * First-load safety net: if the local cache is empty and we're online, pull
 * products once so the PDV isn't blank before the background sync lands.
 * No-op offline or when the cache is already populated. Best-effort —
 * swallows errors since the PDV must keep working regardless.
 */
export async function ensureProductsCached(): Promise<void> {
  try {
    const db = getDB()
    const count = await db.products.count()
    if (count > 0) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    await syncProducts()
  } catch {
    // Best-effort; the empty-state UI handles a still-empty cache.
  }
}
