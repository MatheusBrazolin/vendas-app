import { formatCurrency, formatDate } from './format'

/** A single line of a printable receipt. */
export interface PrintReceiptItem {
  name: string
  quantity: number
  unit_price: number
}

/** Everything needed to render an 80mm thermal receipt without a server. */
export interface PrintReceiptData {
  storeName?: string
  items: PrintReceiptItem[]
  total: number
  paymentLabel: string
  notes?: string
  /** When the sale happened. Defaults to now if omitted. */
  date?: Date
  /**
   * Marks the receipt as not-yet-confirmed by the server (offline sale).
   * Adds a visible "PROVISÓRIO" warning so the customer/cashier knows the
   * official receipt comes after sync.
   */
  provisional?: boolean
}

/**
 * Opens a self-contained print window and triggers the browser print dialog
 * with an 80mm thermal layout. Works fully offline: the HTML is written inline
 * (no network, no routing, no server round-trip), so a cashier can print a
 * receipt for a sale that only exists in the local offline queue.
 *
 * Returns `false` when the print window could not be opened (e.g. a popup
 * blocker), so the caller can surface a fallback message.
 */
export function printReceipt(data: PrintReceiptData): boolean {
  const win = window.open('', '_blank', 'width=380,height=600')
  if (!win) return false

  win.document.open()
  win.document.write(buildReceiptHtml(data))
  win.document.close()
  return true
}

/** Builds the full standalone HTML document for the receipt. */
function buildReceiptHtml(data: PrintReceiptData): string {
  const storeName = data.storeName ?? 'VendasApp'
  const dateLabel = formatDate(data.date ?? new Date())

  const rows = data.items
    .map((item) => {
      const lineTotal = item.unit_price * item.quantity
      return `
        <tr>
          <td class="name">${escapeHtml(item.name)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${escapeHtml(formatCurrency(item.unit_price))}</td>
          <td class="num strong">${escapeHtml(formatCurrency(lineTotal))}</td>
        </tr>`
    })
    .join('')

  const provisionalBanner = data.provisional
    ? `<div class="provisional">RECIBO PROVISÓRIO<br/><span>Aguardando envio ao servidor</span></div>`
    : ''

  const notesBlock = data.notes
    ? `<div class="sep"></div><div class="notes"><strong>Obs:</strong> ${escapeHtml(data.notes)}</div>`
    : ''

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Recibo</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Courier New", ui-monospace, monospace;
    font-size: 11px;
    line-height: 1.3;
    color: #000;
    margin: 0;
    padding: 8px;
    width: 80mm;
  }
  .center { text-align: center; }
  .store { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .sep { border-top: 1px dashed #000; margin: 6px 0; }
  .meta p { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead th { border-bottom: 1px dashed #000; padding-bottom: 2px; text-align: left; }
  thead th.num { text-align: right; }
  td { padding: 2px 0; vertical-align: top; }
  td.num { text-align: right; white-space: nowrap; }
  td.name { padding-right: 4px; word-break: break-word; }
  td.strong { font-weight: 700; }
  .total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; }
  .pay { font-size: 10px; margin-top: 2px; }
  .notes { font-size: 10px; }
  .thanks { text-align: center; font-size: 10px; margin-top: 4px; }
  .provisional {
    text-align: center;
    border: 1px dashed #000;
    padding: 4px;
    margin-bottom: 6px;
    font-weight: 700;
    font-size: 11px;
  }
  .provisional span { font-weight: 400; font-size: 9px; }
</style>
</head>
<body>
  ${provisionalBanner}
  <div class="center"><span class="store">${escapeHtml(storeName)}</span></div>
  <div class="sep"></div>
  <div class="meta">
    <p><strong>Data:</strong> ${escapeHtml(dateLabel)}</p>
  </div>
  <div class="sep"></div>
  <table>
    <thead>
      <tr><th>Item</th><th class="num">Qtd</th><th class="num">Unit.</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="sep"></div>
  <div class="total"><span>TOTAL</span><span>${escapeHtml(formatCurrency(data.total))}</span></div>
  <div class="pay"><strong>Pagamento:</strong> ${escapeHtml(data.paymentLabel)}</div>
  ${notesBlock}
  <div class="sep"></div>
  <p class="thanks">Obrigado pela preferência!</p>
  <script>
    window.addEventListener('load', function () {
      window.focus();
      window.print();
      window.addEventListener('afterprint', function () { window.close(); });
    });
  </script>
</body>
</html>`
}

/** Escapes the five HTML-significant characters to prevent markup injection. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
