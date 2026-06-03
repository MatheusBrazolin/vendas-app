/**
 * Local IndexedDB cache for offline reads.
 *
 * Mirrors the shape of `products` and `categories` from Supabase so the same
 * server types flow through the UI whether the data came from the network
 * or from the local cache. A small `syncMeta` table records the last-sync
 * timestamp for each entity, so we can show "last updated X minutes ago"
 * and decide when a background refresh is needed.
 *
 * This file is import-safe on the server (it only constructs the Dexie
 * instance when running in the browser) — Dexie itself is a thin wrapper
 * around `window.indexedDB`, which doesn't exist on the server.
 */

import Dexie, { type Table } from 'dexie'
import type { Product, Category } from '@/types/database'

/** Mirror of `public.products.Row`. Same shape so server types reuse cleanly. */
export type CachedProduct = Product

/** Mirror of `public.categories.Row`. */
export type CachedCategory = Category

/**
 * One row per entity (`products`, `categories`), tracking the last time a
 * full refresh completed. Used by the sync layer to debounce refreshes
 * and by the UI to render "última sincronização há X".
 */
export interface SyncMeta {
  key: 'products' | 'categories'
  lastSyncAt: string // ISO timestamp
  count: number
}

class VendasAppDB extends Dexie {
  products!: Table<CachedProduct, string>
  categories!: Table<CachedCategory, string>
  syncMeta!: Table<SyncMeta, string>

  constructor() {
    super('vendas-app')
    // v1 — initial offline cache schema. Bump and add `.upgrade(...)` blocks
    // here when the local schema changes; never edit a past version.
    this.version(1).stores({
      // Index `code` + `name` so the PDV search (by barcode or fuzzy name)
      // hits IndexedDB indexes instead of full scans. `is_active` indexed
      // so we can filter inactive products without a scan.
      products: 'id, code, name, is_active',
      categories: 'id, name',
      syncMeta: 'key',
    })
  }
}

/**
 * Singleton Dexie instance. Lazily constructed on the client so that
 * importing this module on the server (e.g. accidentally from a Server
 * Component) doesn't crash on `window.indexedDB` being undefined.
 */
let _db: VendasAppDB | null = null

export function getDB(): VendasAppDB {
  if (typeof window === 'undefined') {
    throw new Error(
      'getDB() called on the server. Offline cache is browser-only — guard the import with a "use client" boundary or a typeof window check.',
    )
  }
  if (!_db) _db = new VendasAppDB()
  return _db
}
