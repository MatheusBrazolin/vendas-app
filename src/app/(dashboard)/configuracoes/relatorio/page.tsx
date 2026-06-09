import { Mail, MailCheck, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/roles'
import { AddRecipientForm } from './add-recipient-form'
import { RecipientActions } from './recipient-actions'

export const metadata = {
  title: 'Relatório por email',
}

interface RecipientRow {
  id: string
  email: string
  active: boolean
  created_at: string
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default async function RelatorioPage() {
  await requireAdmin()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('report_recipients')
    .select('id, email, active, created_at')
    .order('created_at', { ascending: false })

  const recipients: RecipientRow[] = (data ?? []) as RecipientRow[]
  const activeCount = recipients.filter((r) => r.active).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Relatório por email
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie quem recebe o relatório diário de fechamento de caixa.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-slate-200/80 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Cadastrados
            </p>
            <p className="text-xl font-semibold text-slate-900 tabular-nums">
              {recipients.length}
            </p>
          </div>
        </Card>
        <Card className="border-slate-200/80 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Ativos
            </p>
            <p className="text-xl font-semibold text-slate-900 tabular-nums">
              {activeCount}
            </p>
          </div>
        </Card>
      </div>

      <Card className="border-slate-200/80 shadow-sm p-4">
        <p className="text-sm font-medium text-slate-700 mb-2">
          Adicionar destinatário
        </p>
        <AddRecipientForm />
      </Card>

      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-6 text-sm text-red-700 bg-red-50 border-b border-red-100">
            Erro ao carregar destinatários: {error.message}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 h-11">
                  Email
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Adicionado em
                </TableHead>
                <TableHead className="text-right pr-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="text-center py-12 text-slate-400">
                    Nenhum destinatário cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                recipients.map((r, idx) => (
                  <TableRow
                    key={r.id}
                    className={`border-slate-100 hover:bg-slate-50/70 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/30' : ''
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-900 truncate">
                          {r.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${
                          r.active
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15'
                            : 'bg-slate-100 text-slate-500 ring-slate-500/20'
                        }`}
                      >
                        {r.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 tabular-nums">
                      {formatDate(r.created_at)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <RecipientActions
                        id={r.id}
                        email={r.email}
                        active={r.active}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
          <span>
            Administradores com email real e os endereços de <strong>REPORT_EMAIL</strong>{' '}
            já recebem o relatório automaticamente. Use esta lista para incluir
            outros destinatários.
          </span>
        </div>
      </Card>
    </div>
  )
}
