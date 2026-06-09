import type { CashCloseSummary } from '@/lib/queries/cash-close'
import { formatCurrency, PAYMENT_LABELS } from '@/lib/utils/format'
import { formatBRDateTime } from '@/lib/utils/datetime'

export interface BuiltEmail {
  subject: string
  html: string
  text: string
}

/** "08/06/2026" from a YYYY-MM-DD string, without TZ surprises. */
function formatDayLabel(isoDay: string): string {
  const [y, m, d] = isoDay.split('-')
  return `${d}/${m}/${y}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Builds the daily cash-close report email (subject + HTML + plain text).
 * Pure function — no I/O — so it's easy to unit-test the content.
 */
export function buildCashCloseEmail(
  summary: CashCloseSummary,
  storeName = 'VendasApp',
): BuiltEmail {
  const dayLabel = formatDayLabel(summary.date)
  const subject = `${storeName} — Fechamento de ${dayLabel}: ${formatCurrency(summary.total)} em ${summary.count} ${summary.count === 1 ? 'venda' : 'vendas'}`

  const byPaymentRowsHtml = summary.byPayment
    .map(
      (b) => `
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;">${escapeHtml(PAYMENT_LABELS[b.method] ?? b.method)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center;">${b.count}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${escapeHtml(formatCurrency(b.total))}</td>
        </tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="pt-BR"><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:560px;margin:0 auto;padding:16px;">
  <h2 style="margin:0 0 4px;">Fechamento de caixa</h2>
  <p style="margin:0 0 16px;color:#64748b;">${escapeHtml(storeName)} · ${dayLabel}</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    <tr>
      <td style="padding:12px;background:#f1f5f9;border-radius:8px;">
        <div style="font-size:12px;color:#64748b;">Total do dia</div>
        <div style="font-size:24px;font-weight:700;">${escapeHtml(formatCurrency(summary.total))}</div>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 4px;"><strong>${summary.count}</strong> ${summary.count === 1 ? 'venda' : 'vendas'} · Ticket médio <strong>${escapeHtml(formatCurrency(summary.averageTicket))}</strong></p>

  <h3 style="margin:16px 0 8px;font-size:14px;">Por forma de pagamento</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead>
      <tr style="text-align:left;color:#64748b;">
        <th style="padding:4px 8px;">Forma</th>
        <th style="padding:4px 8px;text-align:center;">Qtd</th>
        <th style="padding:4px 8px;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>${byPaymentRowsHtml || '<tr><td colspan="3" style="padding:8px;color:#94a3b8;">Sem vendas neste dia.</td></tr>'}</tbody>
  </table>

  <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">
    Relatório automático gerado em ${escapeHtml(formatBRDateTime(new Date()))}.
  </p>
</body></html>`

  const textLines = [
    `${storeName} — Fechamento de caixa · ${dayLabel}`,
    '',
    `Total do dia: ${formatCurrency(summary.total)}`,
    `Vendas: ${summary.count}`,
    `Ticket médio: ${formatCurrency(summary.averageTicket)}`,
    '',
    'Por forma de pagamento:',
    ...summary.byPayment.map(
      (b) =>
        `  - ${PAYMENT_LABELS[b.method] ?? b.method}: ${b.count} × → ${formatCurrency(b.total)}`,
    ),
  ]
  if (summary.byPayment.length === 0) textLines.push('  (sem vendas neste dia)')

  return { subject, html, text: textLines.join('\n') }
}
