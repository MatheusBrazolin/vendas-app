import { Mail, MailCheck, Info, Send } from 'lucide-react'
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
import { SendReportNow } from './send-report-now'

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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          Relatório por email
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie quem recebe o relatório diário de fechamento de caixa.
        </p>
      </div>

      {/* Manual send */}
      <Card className="border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/8 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Enviar relatório agora
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manda por email o que foi vendido hoje até este momento, para todos
              os destinatários ativos.
            </p>
          </div>
        </div>
        <SendReportNow />
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-slate-200/80 dark:border-white/8 dark:bg-slate-800/60 p-3 flex flex-col items-center text-center gap-1.5">
          <div className="h-8 w-8 rounded-lg bg-primary/5 dark:bg-primary/10 text-primary flex items-center justify-center">
            <Mail className="h-4 w-4" />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">
            Cadastrados
          </p>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums leading-none">
            {recipients.length}
          </p>
        </Card>
        <Card className="border-slate-200/80 dark:border-white/8 dark:bg-slate-800/60 p-3 flex flex-col items-center text-center gap-1.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <MailCheck className="h-4 w-4" />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">
            Ativos
          </p>
          <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums leading-none">
            {activeCount}
          </p>
        </Card>
      </div>

      <Card className="border-slate-200/80 dark:border-white/8 dark:bg-slate-800/60 shadow-sm p-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Adicionar destinatário
        </p>
        <AddRecipientForm />
      </Card>

      <Card className="border-slate-200/80 dark:border-white/8 dark:bg-slate-800/60 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-6 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/20">
            Erro ao carregar destinatários: {error.message}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-white/5">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 h-11">
                  Email
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Status
                </TableHead>
                <TableHead className="hidden sm:table-cell text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Adicionado em
                </TableHead>
                <TableHead className="text-right pr-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="text-center py-12 text-slate-400 dark:text-slate-500">
                    Nenhum destinatário cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                recipients.map((r, idx) => (
                  <TableRow
                    key={r.id}
                    className={`border-slate-100 dark:border-white/5 hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors ${
                      idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-white/2' : ''
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {r.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${
                          r.active
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-600/15 dark:ring-emerald-500/20'
                            : 'bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-slate-400 ring-slate-500/20 dark:ring-white/10'
                        }`}
                      >
                        {r.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-slate-500 dark:text-slate-400 tabular-nums">
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

        <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/3 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400 dark:text-slate-500" />
          <span>
            Administradores com email real e os endereços de <strong className="text-slate-700 dark:text-slate-300">REPORT_EMAIL</strong>{' '}
            já recebem o relatório automaticamente. Use esta lista para incluir
            outros destinatários.
          </span>
        </div>
      </Card>
    </div>
  )
}
