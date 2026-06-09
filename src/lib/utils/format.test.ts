import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, PAYMENT_LABELS } from './format'

/** Intl inserts a non-breaking space (U+00A0); normalize it for readable asserts. */
function normalize(value: string): string {
  return value.replace(/ /g, ' ')
}

describe('formatCurrency', () => {
  it('formats a value as Brazilian Real', () => {
    expect(normalize(formatCurrency(1234.56))).toBe('R$ 1.234,56')
  })

  it('formats zero', () => {
    expect(normalize(formatCurrency(0))).toBe('R$ 0,00')
  })

  it('rounds to two decimal places', () => {
    expect(normalize(formatCurrency(9.999))).toBe('R$ 10,00')
  })

  it('formats thousands with a dot separator', () => {
    expect(normalize(formatCurrency(1000000))).toBe('R$ 1.000.000,00')
  })
})

describe('formatDate', () => {
  // formatDate always renders in BRT (America/Sao_Paulo) regardless of where
  // the code runs — CI is UTC, dev machines vary. Use absolute timestamps
  // (with explicit offset) so the expectation is the same everywhere.
  it('formats a BRT timestamp as dd/MM/yyyy às HH:mm', () => {
    expect(formatDate('2026-06-08T14:30:00-03:00')).toBe('08/06/2026 às 14:30')
  })

  it('converts a UTC instant to BRT before formatting', () => {
    // 09:05 UTC = 06:05 BRT
    expect(formatDate('2026-01-05T09:05:00Z')).toBe('05/01/2026 às 06:05')
  })

  it('ignores the machine TZ — a late-evening BRT timestamp does not roll over', () => {
    // The whole reason this helper exists: at 22:00 BRT it is already the
    // next day in UTC, but the operator-facing string must still say 08/06.
    expect(formatDate('2026-06-08T22:00:00-03:00')).toBe('08/06/2026 às 22:00')
  })
})

describe('PAYMENT_LABELS', () => {
  it('maps every payment method to a pt-BR label', () => {
    expect(PAYMENT_LABELS.cash).toBe('Dinheiro')
    expect(PAYMENT_LABELS.credit).toBe('Cartão de Crédito')
    expect(PAYMENT_LABELS.debit).toBe('Cartão de Débito')
    expect(PAYMENT_LABELS.pix).toBe('PIX')
  })
})
