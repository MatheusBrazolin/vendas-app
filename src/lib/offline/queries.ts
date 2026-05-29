/**
 * Read-side helpers for the local IndexedDB cache.
 *
 * The PDV calls these instead of Supabase so it works offline. When online
 * they're also faster than a network roundtrip — useful for the PDV's
 * keystroke-by-keystroke search.
 *
 * Writes still go through Supabase server actions (Phase 3 will add an
 * offline mutation queue).
 */

import { getDB, type CachedProduct } from './db'

/**
 * Case-insensitive partial match against `name` OR `code`. Mirrors the old
 * Supabase `ilike` behavior the PDV used.
 *
 * Limited to in-stock active products and capped at `limit` results so the
 * dropdown stays usable. Dexie has indexes on `name` and `code`, but it
 * doesn't natively support OR + substring — for a few-hundred-row catalog
 * a filter() walk is plenty fast (microseconds) and clearer than a join.
 */
export async function searchProductsLocal(
  query: string,
  limit = 10,
): Promise<CachedProduct[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const needle = trimmed.toLowerCase()

  const matches = await getDB()
    .products.filter(
      (p) =>
        p.is_active &&
        p.stock_quantity > 0 &&
        (p.name.toLowerCase().includes(needle) ||
          p.code.toLowerCase().includes(needle)),
    )
    .limit(limit)
    .toArray()

  return matches
}

/**
 * Exact match by `code`. Used by the barcode scanner flow — the USB reader
 * types the full code + Enter, and we want to identify the product before
 * deciding whether to add it to the cart.
 *
 * Active products only. The caller is responsible for checking stock_quantity
 * separately so it can show a different toast for "sem estoque" vs "não encontrado".
 */
export async function findProductByCodeLocal(
  code: string,
): Promise<CachedProduct | undefined> {
  const trimmed = code.trim()
  if (!trimmed) return undefined
  const match = await getDB().products.where('code').equals(trimmed).first()
  return match?.is_active ? match : undefined
}
