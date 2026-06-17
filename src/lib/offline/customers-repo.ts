'use client'

import { getDB, type CachedCustomer } from './db'

/**
 * Search cached customers by name or phone.
 * Used in the PDV when `navigator.onLine === false`.
 *
 * Normalises the query to lower-case and does a substring match on
 * `full_name` (case-insensitive via `toLowerCase()`) and an exact prefix
 * match on digits-only `phone` — good enough for a store with hundreds of
 * customers.
 */
export async function searchCustomersOffline(query: string): Promise<CachedCustomer[]> {
  const q = query.trim()
  if (!q) {
    return getDB().customers.orderBy('full_name').limit(20).toArray()
  }

  const qLower = q.toLowerCase()
  const digitsOnly = q.replace(/\D/g, '')

  const all = await getDB().customers.toArray()
  return all
    .filter((c) => {
      const nameMatch = c.full_name.toLowerCase().includes(qLower)
      const phoneMatch =
        digitsOnly.length > 0 && (c.phone ?? '').replace(/\D/g, '').includes(digitsOnly)
      return nameMatch || phoneMatch
    })
    .slice(0, 20)
}
