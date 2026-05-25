import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  /** Base path, e.g. "/produtos" — current searchParams are merged in */
  basePath: string
  page: number
  totalPages: number
  total: number
  pageSize: number
  /** All current query params as a flat record */
  searchParams: Record<string, string | undefined>
}

/**
 * Server-rendered pagination using regular <Link> so navigation does not
 * require a client component. Builds URLs by merging the current
 * searchParams with the target page number.
 */
export function Pagination({
  basePath,
  page,
  totalPages,
  total,
  pageSize,
  searchParams,
}: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="px-6 py-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
        <span>
          {total} {total === 1 ? 'resultado' : 'resultados'}
        </span>
      </div>
    )
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)

  return (
    <div className="px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600 border-t border-slate-100">
      <span>
        Mostrando <strong className="tabular-nums text-slate-900">{start}–{end}</strong>{' '}
        de <strong className="tabular-nums text-slate-900">{total}</strong>
      </span>
      <div className="flex items-center gap-2">
        <PageLink
          basePath={basePath}
          page={page - 1}
          searchParams={searchParams}
          disabled={page <= 1}
          ariaLabel="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </PageLink>
        <span className="px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <PageLink
          basePath={basePath}
          page={page + 1}
          searchParams={searchParams}
          disabled={page >= totalPages}
          ariaLabel="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </PageLink>
      </div>
    </div>
  )
}

function PageLink({
  basePath,
  page,
  searchParams,
  disabled,
  ariaLabel,
  children,
}: {
  basePath: string
  page: number
  searchParams: Record<string, string | undefined>
  disabled: boolean
  ariaLabel: string
  children: React.ReactNode
}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && key !== 'page') params.set(key, value)
  }
  params.set('page', String(page))
  const href = `${basePath}?${params.toString()}`

  if (disabled) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="h-8 w-8 p-0 border-slate-200"
        aria-label={ariaLabel}
      >
        {children}
      </Button>
    )
  }

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="h-8 w-8 p-0 border-slate-200 hover:bg-slate-50"
    >
      <Link href={href} aria-label={ariaLabel}>
        {children}
      </Link>
    </Button>
  )
}
