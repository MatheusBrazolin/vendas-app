'use client'

import { motion } from 'framer-motion'
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  type LucideIcon,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface KpiCardsProps {
  todayTotal: number
  monthTotal: number
  avgTicket: number
  lowStockCount: number
  todayCount: number
  monthCount: number
}

type Trend = 'up' | 'down' | 'flat'

interface KpiCard {
  title: string
  value: string
  sub: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
  accentColor: string
  trend: Trend
  trendLabel: string
}

function TrendBadge({ trend, label }: { trend: Trend; label: string }) {
  const config = {
    up: {
      Icon: ArrowUp,
      className: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/15 dark:ring-emerald-500/20',
    },
    down: {
      Icon: ArrowDown,
      className: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/15 dark:ring-red-500/20',
    },
    flat: {
      Icon: Minus,
      className: 'bg-slate-100 dark:bg-white/8 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-600/15 dark:ring-white/10',
    },
  }[trend]
  const { Icon, className } = config

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
}

export function KpiCards({
  todayTotal,
  monthTotal,
  avgTicket,
  lowStockCount,
  todayCount,
  monthCount,
}: KpiCardsProps) {
  const cards: KpiCard[] = [
    {
      title: 'Vendas Hoje',
      value: formatCurrency(todayTotal),
      sub: `${todayCount} venda${todayCount !== 1 ? 's' : ''} registrada${todayCount !== 1 ? 's' : ''}`,
      icon: DollarSign,
      iconColor: 'text-violet-600 dark:text-violet-400',
      iconBg: 'bg-violet-50 dark:bg-violet-500/10',
      accentColor: '#7c3aed',
      trend: 'up',
      trendLabel: '+12% vs ontem',
    },
    {
      title: 'Vendas no Mês',
      value: formatCurrency(monthTotal),
      sub: `${monthCount} venda${monthCount !== 1 ? 's' : ''} no período`,
      icon: TrendingUp,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      accentColor: '#059669',
      trend: 'up',
      trendLabel: '+8% vs mês anterior',
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(avgTicket),
      sub: 'Valor médio por venda',
      icon: ShoppingBag,
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBg: 'bg-cyan-50 dark:bg-cyan-500/10',
      accentColor: '#0891b2',
      trend: 'flat',
      trendLabel: 'estável',
    },
    {
      title: 'Estoque Baixo',
      value: String(lowStockCount),
      sub: lowStockCount > 0 ? 'produto(s) abaixo do mínimo' : 'tudo em ordem',
      icon: AlertTriangle,
      iconColor: lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500',
      iconBg: lowStockCount > 0 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-slate-100 dark:bg-white/8',
      accentColor: lowStockCount > 0 ? '#d97706' : '#94a3b8',
      trend: lowStockCount > 0 ? 'down' : 'flat',
      trendLabel: lowStockCount > 0 ? 'requer atenção' : 'sem alertas',
    },
  ]

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.title}
            variants={cardVariants}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-white/8 bg-white/80 dark:bg-slate-800/70 backdrop-blur-sm shadow-sm dark:shadow-black/30 hover:shadow-md dark:hover:shadow-black/40 transition-shadow cursor-default"
          >
            {/* Accent top bar */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl"
              style={{ backgroundColor: card.accentColor }}
            />
            {/* Subtle glow in top-right */}
            <div
              aria-hidden
              className="absolute -top-8 -right-8 h-20 w-20 rounded-full blur-2xl opacity-20"
              style={{ backgroundColor: card.accentColor }}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {card.title}
                  </p>
                  <p className="mt-2 text-[26px] font-bold text-slate-900 dark:text-slate-50 leading-none tabular-nums">
                    {card.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${card.iconBg} shrink-0`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <TrendBadge trend={card.trend} label={card.trendLabel} />
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{card.sub}</span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
