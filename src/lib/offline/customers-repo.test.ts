import { describe, it, expect, beforeEach } from 'vitest'
import type { CustomerBalance } from '@/types/database'
import { getDB } from './db'
import { searchCustomersOffline } from './customers-repo'

function makeCustomer(overrides: Partial<CustomerBalance> = {}): CustomerBalance {
  return {
    id: crypto.randomUUID(),
    full_name: 'Cliente Teste',
    phone: '(11) 99999-0001',
    total_fiado: 0,
    total_paid: 0,
    current_debt: 0,
    last_payment_at: null,
    first_fiado_at: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

beforeEach(async () => {
  await getDB().customers.clear()
})

describe('searchCustomersOffline', () => {
  beforeEach(async () => {
    await getDB().customers.bulkAdd([
      makeCustomer({ full_name: 'Ana Silva',        phone: '(11) 99999-1234' }),
      makeCustomer({ full_name: 'Bruno Santos',     phone: '(21) 88888-5678' }),
      makeCustomer({ full_name: 'Ana Paula Costa',  phone: '(31) 77777-9999' }),
      makeCustomer({ full_name: 'Carlos Mendes',    phone: '(41) 66666-0000' }),
    ])
  })

  it('returns up to 20 customers when query is empty', async () => {
    const result = await searchCustomersOffline('')
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(20)
  })

  it('finds by name substring — case-insensitive', async () => {
    const result = await searchCustomersOffline('ana')
    expect(result).toHaveLength(2)
    const names = result.map((c) => c.full_name)
    expect(names).toContain('Ana Silva')
    expect(names).toContain('Ana Paula Costa')
  })

  it('finds by phone digit substring', async () => {
    const result = await searchCustomersOffline('88888')
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Bruno Santos')
  })

  it('returns empty array when nothing matches', async () => {
    // No digits, no name substring — guaranteed no match.
    expect(await searchCustomersOffline('xyz@nenhum')).toHaveLength(0)
  })

  it('matches a middle-of-name substring', async () => {
    const result = await searchCustomersOffline('paula')
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Ana Paula Costa')
  })

  it('matches by partial phone — partial DDD', async () => {
    const result = await searchCustomersOffline('41')
    expect(result.some((c) => c.full_name === 'Carlos Mendes')).toBe(true)
  })

  it('returns empty array when cache is empty and query is non-empty', async () => {
    await getDB().customers.clear()
    expect(await searchCustomersOffline('qualquer')).toHaveLength(0)
  })
})
