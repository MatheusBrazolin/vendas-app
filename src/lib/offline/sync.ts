/**
 * Sync layer: pulls the canonical Supabase tables into the local IndexedDB
 * cache so the app can read them offline.
 *
 * Strategy (Phase 2):
 *   - Full refresh per entity. We clear the local table and bulk-insert the
 *     latest rows from Supabase. Cheap for the small catalogs this PDV
 *     handles (hundreds of products, not millions).
 *   - Each successful sync stamps the `syncMeta` row with the timestamp
 *     and row count, so the UI can render "last synced X minutes ago".
 *
 * Phase 3 will add incremental sync (filter by `updated_at > lastSyncAt`)
 * and conflict handling for offline mutations.
 */

import { createClient } from '@/lib/supabase/client'
import { getDB, type CachedCategory, type CachedProduct, type SyncMeta } from './db'

export interface SyncResult {
  /** How many rows were written to the local cache. */
  synced: number
  /** ISO timestamp of when the sync started — also stored in syncMeta. */
  at: string
}

/**
 * Full refresh of `products`. Active products only — inactive ones aren't
 * useful in the PDV and would bloat the local cache for no reason.
 */
export async function syncProducts(): Promise<SyncResult> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)

  if (error) throw error
  const rows = (data ?? []) as CachedProduct[]
  const at = new Date().toISOString()

  const db = getDB()
  await db.transaction('rw', db.products, db.syncMeta, async () => {
    await db.products.clear()
    if (rows.length > 0) await db.products.bulkAdd(rows)
    await db.syncMeta.put({ key: 'products', lastSyncAt: at, count: rows.length })
  })

  return { synced: rows.length, at }
}

/** Full refresh of `categories`. Small table, always replaced wholesale. */
export async function syncCategories(): Promise<SyncResult> {
  const supabase = createClient()
  const { data, error } = await supabase.from('categories').select('*')

  if (error) throw error
  const rows = (data ?? []) as CachedCategory[]
  const at = new Date().toISOString()

  const db = getDB()
  await db.transaction('rw', db.categories, db.syncMeta, async () => {
    await db.categories.clear()
    if (rows.length > 0) await db.categories.bulkAdd(rows)
    await db.syncMeta.put({ key: 'categories', lastSyncAt: at, count: rows.length })
  })

  return { synced: rows.length, at }
}

/**
 * Run all syncs in parallel. Failures are caught per-entity so a transient
 * outage in one table doesn't poison the others.
 */
export async function syncAll(): Promise<{
  products: SyncResult | { error: string }
  categories: SyncResult | { error: string }
}> {
  const [products, categories] = await Promise.all([
    syncProducts().catch((err: unknown) => ({
      error: err instanceof Error ? err.message : 'Erro ao sincronizar produtos',
    })),
    syncCategories().catch((err: unknown) => ({
      error: err instanceof Error ? err.message : 'Erro ao sincronizar categorias',
    })),
  ])
  return { products, categories }
}

/** Read a sync timestamp from the local cache. Returns null if never synced. */
export async function getLastSync(
  key: SyncMeta['key'],
): Promise<SyncMeta | undefined> {
  return getDB().syncMeta.get(key)
}
