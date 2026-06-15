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
  const isFiado = sale.payment_method === 'fiado'
  const customerName = sale.customers?.full_name

  return (
    <div
      className="font-mono text-[11px] leading-tight text-black p-3"
      style={{ width: '80mm', maxWidth: '100%' }}
    >
      {/* Cabeçalho */}
      <div className="text-center mb-1">
        <p className="text-[10px]">{'* * * * * * * * * * * * * * * * * *'}</p>
        <p className="text-sm font-bold uppercase tracking-widest mt-0.5">{storeName}</p>
        {isFiado && (
          <p className="text-[10px] font-semibold tracking-wide mt-0.5">— COMPRA FIADA —</p>
        )}
        <p className="text-[10px] mt-0.5">{'* * * * * * * * * * * * * * * * * *'}</p>
      </div>

      <Separator />

      {/* Dados da venda */}
      <div className="space-y-0.5">
        <p>
          <span className="font-semibold">Venda :</span> {shortSaleId(sale.id)}
        </p>
        <p>
          <span className="font-semibold">Data  :</span> {formatDate(sale.created_at)}
        </p>
        {isFiado && customerName && (
          <p>
            <span className="font-semibold">Cliente:</span> {customerName}
          </p>
        )}
      </div>

      <Separator />

      {/* Itens */}
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left pb-1 font-semibold">ITEM</th>
            <th className="text-center pb-1 font-semibold">QTD</th>
            <th className="text-right pb-1 font-semibold">UNIT.</th>
            <th className="text-right pb-1 font-semibold">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {sale.sale_items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="pr-1 py-0.5 break-words">
                <span className="block font-medium">{item.products.name}</span>
                <span className="text-[9px] text-slate-400">{item.products.code}</span>
              </td>
              <td className="text-center py-0.5">{item.quantity}</td>
              <td className="text-right py-0.5 whitespace-nowrap">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="text-right py-0.5 whitespace-nowrap font-bold">
                {formatCurrency(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Separator />

      {/* Total */}
      <div className="flex justify-between font-bold text-sm">
        <span>TOTAL</span>
        <span>{formatCurrency(sale.total_amount)}</span>
      </div>

      <div className="mt-1 text-[10px]">
        <span className="font-semibold">Pagamento:</span>{' '}
        <span className="uppercase">{PAYMENT_LABELS[sale.payment_method]}</span>
      </div>

      {/* Observações */}
      {sale.notes && (
        <>
          <Separator />
          <div className="text-[10px]">
            <p className="font-semibold">Obs.:</p>
            <p className="break-words">{sale.notes}</p>
          </div>
        </>
      )}

      {/* Assinatura do comprador (somente fiado) */}
      {isFiado && (
        <>
          <Separator />
          <div className="text-[10px] space-y-3 pt-1">
            <p className="font-semibold">Declaro que recebi os itens acima:</p>
            <div className="mt-4 pt-1 border-t border-black">
              <p className="text-center text-[9px] mt-0.5">
                Assinatura do comprador
              </p>
              {customerName && (
                <p className="text-center text-[9px] mt-0.5">{customerName}</p>
              )}
            </div>
          </div>
        </>
      )}

      <Separator />

      <p className="text-center text-[10px] mt-0.5">Obrigado pela preferencia!</p>
      <p className="text-center text-[10px]">{'- - - - - - - - - - - - - - - -'}</p>
    </div>
  )
}

function Separator() {
  return (
    <div className="my-1.5 border-t border-dashed border-black" aria-hidden="true" />
  )
}
