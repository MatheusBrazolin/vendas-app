'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  ShoppingBag,
  Users,
  Menu,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import type { UserRole } from '@/types/database'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** When true, only visible to admins. */
  adminOnly?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
      { href: '/produtos', label: 'Produtos', icon: Package, adminOnly: true },
      { href: '/produtos/categorias', label: 'Categorias', icon: Tags, adminOnly: true },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { href: '/vendas/nova', label: 'Nova Venda', icon: ShoppingBag },
      { href: '/vendas', label: 'Histórico', icon: ShoppingCart },
    ],
  },
  {
    title: 'Administração',
    items: [
      { href: '/configuracoes/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
    ],
  },
]

function isItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  if (href === '/vendas') {
    return pathname === '/vendas' || /^\/vendas\/[^/]+$/.test(pathname)
  }
  if (href === '/produtos') {
    return (
      pathname === '/produtos' ||
      (pathname.startsWith('/produtos/') && !pathname.startsWith('/produtos/categorias'))
    )
  }
  return pathname.startsWith(href)
}

interface NavListProps {
  role: UserRole
  onNavigate?: () => void
}

/**
 * Shared list of nav links rendered both in the desktop sidebar and the
 * mobile drawer. `onNavigate` is called after a link click so the drawer
 * can close itself.
 */
function NavList({ role, onNavigate }: NavListProps) {
  const pathname = usePathname()

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || role === 'admin'),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
      {visibleSections.map((section) => (
        <div key={section.title}>
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] uppercase text-slate-500">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = isItemActive(item.href, pathname)

              return (
                <li key={item.href} className="relative">
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-blue-500"
                    />
                  )}
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-800/80 text-white'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-colors',
                        isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                      )}
                    />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SidebarBrand() {
  return (
    <div className="px-6 py-5 border-b border-slate-800">
      <Link href="/dashboard" className="flex items-center gap-2.5 group">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-900/30 ring-1 ring-white/10 group-hover:bg-blue-500 transition-colors">
          <ShoppingBag className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-white text-base tracking-tight">VendasApp</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Gestão</span>
        </div>
      </Link>
    </div>
  )
}

function SidebarFooter({ role }: { role: UserRole }) {
  return (
    <div className="px-4 py-4 border-t border-slate-800">
      <div className="rounded-lg bg-slate-800/50 px-3 py-2.5 text-xs text-slate-400">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-slate-300">VendasApp v1.0</p>
          <span
            className={cn(
              'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset',
              role === 'admin'
                ? 'bg-blue-500/10 text-blue-300 ring-blue-400/20'
                : 'bg-slate-700/50 text-slate-300 ring-slate-500/20'
            )}
          >
            {role === 'admin' ? 'Admin' : 'Funcionário'}
          </span>
        </div>
        <p className="text-slate-500 mt-0.5">Operacional</p>
      </div>
    </div>
  )
}

interface SidebarProps {
  role: UserRole
}

export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-64 min-h-screen bg-slate-900 text-slate-100 flex-col border-r border-slate-800">
      <SidebarBrand />
      <NavList role={role} />
      <SidebarFooter role={role} />
    </aside>
  )
}

/**
 * Mobile-only hamburger button that opens a drawer with the same nav.
 * Rendered inside the Header on screens smaller than `md`.
 */
export function MobileSidebar({ role }: SidebarProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir menu"
        className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 max-w-[80vw] bg-slate-900 text-slate-100 p-0 border-r border-slate-800"
      >
        <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
        <SidebarBrand />
        <NavList role={role} onNavigate={() => setOpen(false)} />
        <SidebarFooter role={role} />
      </SheetContent>
    </Sheet>
  )
}
