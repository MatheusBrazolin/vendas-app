'use client'

import Link from 'next/link'
import { ArrowLeft, Printer, MessageCircle, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { buildReceiptText, shortSaleId } from '@/lib/utils/receipt'
import { formatCurrency, formatDate, PAYMENT_LABELS } from '@/lib/utils/format'
import type { SaleWithItems } from '@/types/database'

interface ReceiptViewProps {
  sale: SaleWithItems
  storeName?: string
}

export function ReceiptView({ sale, storeName = 'VendasApp' }: ReceiptViewProps) {
  function handlePrint() {
    window.print()
  }

  function handleWhatsApp() {
    const text = buildReceiptText(sale, storeName)
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildReceiptText(sale, storeName))
      toast.success('Recibo copiado para a área de transferência')
    } catch {
      toast.error('Não foi possível copiar. Tente imprimir.')
    }
  }

  return (
    <div className="receipt-screen">
      {/* Page-wide styles: 80mm layout + hide everything else during print */}
      <style jsx global>{`
        @media print {
          /* Hide the dashboard chrome (sidebar/header) */
          body > * {
            visibility: hidden;
          }
          .receipt-print-area,
          .receipt-print-area * {
            visibility: visible;
          }
          .receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 0;
            margin: 0;
          }
          .receipt-no-print {
            display: none !important;
          }
          @page {
            size: 80mm auto;
            margin: 4mm;
          }
        }
      `}</style>

      {/* Toolbar — visible on screen, hidden when printing */}
      <div className="receipt-no-print mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href={`/vendas/${sale.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar para a venda
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Printer className="h-4 w-4 mr-1.5" />
            Imprimir
          </Button>
          <Button onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
            <MessageCircle className="h-4 w-4 mr-1.5" />
            WhatsApp
          </Button>
          <Button onClick={handleCopy} variant="outline" className="border-slate-200">
            <Copy className="h-4 w-4 mr-1.5" />
            Copiar texto
          </Button>
        </div>
      </div>

      {/* Printable receipt — 80mm preview centered on screen */}
      <div className="receipt-print-area mx-auto bg-white shadow-sm border border-slate-200 print:shadow-none print:border-0">
        <ReceiptBody sale={sale} storeName={storeName} />
      </div>

      <p className="receipt-no-print mt-6 text-center text-xs text-slate-400">
        Dica: na hora de imprimir, escolha sua impressora térmica e papel 80mm.
        Para salvar como PDF, selecione &ldquo;Microsoft Print to PDF&rdquo; ou &ldquo;Salvar como PDF&rdquo;.
      </p>
    </div>
  )
}

function ReceiptBody({ sale, storeName }: { sale: SaleWithItems; storeName: string }) {
  return (
    <div
      className="font-mono text-[11px] leading-tight text-black p-3"
      style={{ width: '80mm', maxWidth: '100%' }}
    >
      <div className="text-center mb-2">
        <p className="text-sm font-bold uppercase tracking-wide">{storeName}</p>
        <p className="text-[10px] text-slate-700">Cupom não fiscal</p>
      </div>

      <Separator />

      <div className="space-y-0.5">
        <p>
          <span className="font-semibold">Venda:</span> {shortSaleId(sale.id)}
        </p>
        <p>
          <span className="font-semibold">Data:</span> {formatDate(sale.created_at)}
        </p>
      </div>

      <Separator />

      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left pb-1">Item</th>
            <th className="text-center pb-1">Qtd</th>
            <th className="text-right pb-1">Unit.</th>
            <th className="text-right pb-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.sale_items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="pr-1 py-0.5 break-words">{item.products.name}</td>
              <td className="text-center py-0.5">{item.quantity}</td>
              <td className="text-right py-0.5 whitespace-nowrap">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="text-right py-0.5 whitespace-nowrap font-semibold">
                {formatCurrency(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Separator />

      <div className="flex justify-between font-bold text-sm">
        <span>TOTAL</span>
        <span>{formatCurrency(sale.total_amount)}</span>
      </div>

      <div className="mt-1 text-[10px]">
        <span className="font-semibold">Pagamento:</span> {PAYMENT_LABELS[sale.payment_method]}
      </div>

      {sale.notes && (
        <>
          <Separator />
          <div className="text-[10px]">
            <p className="font-semibold">Observações:</p>
            <p className="break-words">{sale.notes}</p>
          </div>
        </>
      )}

      <Separator />

      <p className="text-center text-[10px] mt-1">Obrigado pela preferência!</p>
    </div>
  )
}

function Separator() {
  return (
    <div className="my-1.5 border-t border-dashed border-black" aria-hidden="true" />
  )
}
