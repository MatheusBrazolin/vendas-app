import { describe, it, expect } from 'vitest'
import { buildCashCloseEmail } from './cash-close-email'
import type { CashCloseSummary } from '@/lib/queries/cash-close'

const summary: CashCloseSummary = {
  date: '2026-06-08',
  count: 3,
  total: 42.5,
  averageTicket: 14.17,
  byPayment: [
    { method: 'cash', count: 2, total: 30 },
    { method: 'pix', count: 1, total: 12.5 },
  ],
  sales: [],
}

describe('buildCashCloseEmail', () => {
  it('puts the formatted day and total in the subject', () => {
    const { subject } = buildCashCloseEmail(summary)
    expect(subject).toContain('08/06/2026')
    expect(subject).toContain('R$')
    expect(subject).toContain('3 vendas')
  })

  it('uses singular "venda" when there is exactly one', () => {
    const { subject } = buildCashCloseEmail({ ...summary, count: 1 })
    expect(subject).toContain('1 venda')
    expect(subject).not.toContain('1 vendas')
  })

  it('lists each payment method with its Portuguese label in the text body', () => {
    const { text } = buildCashCloseEmail(summary)
    expect(text).toContain('Dinheiro')
    expect(text).toContain('PIX')
  })

  it('renders an empty-day note when there are no sales', () => {
    const { html, text } = buildCashCloseEmail({
      ...summary,
      count: 0,
      total: 0,
      averageTicket: 0,
      byPayment: [],
    })
    expect(html).toContain('Sem vendas neste dia')
    expect(text).toContain('sem vendas neste dia')
  })

  it('produces a valid HTML document', () => {
    const { html } = buildCashCloseEmail(summary)
    expect(html).toContain('<!doctype html>')
  })
})
