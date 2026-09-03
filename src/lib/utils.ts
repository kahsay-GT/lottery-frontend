import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...c: ClassValue[]) => twMerge(clsx(c))

/** Format a number as Ethiopian Birr — used everywhere in the app */
export const fmt$ = (n: number) => {
  const formatted = new Intl.NumberFormat('en-ET', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
  return `${formatted}`
}

export const fmtDate = (d: string | Date | null | undefined): string => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(dt)
}

export const fmtDateTime = (d: string | Date | null | undefined): string => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(dt)
}

export const daysLeft = (d: string | Date | null | undefined): number => {
  if (!d) return 0
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return 0
  return Math.max(0, Math.ceil((dt.getTime() - Date.now()) / 86_400_000))
}

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

export const statusColor: Record<string, string> = {
  ACTIVE:          'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  APPROVED:        'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  SOLD:            'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  SELLING:         'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  COMPLETED:       'bg-teal-500/20 text-teal-300 border-teal-500/30',
  PUBLISHED:       'bg-blue-500/20 text-blue-300 border-blue-500/30',
  PENDING:         'bg-amber-500/20 text-amber-300 border-amber-500/30',
  AWAITING_PAYMENT:'bg-amber-500/20 text-amber-300 border-amber-500/30',
  SUBMITTED:       'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  UNDER_REVIEW:    'bg-orange-500/20 text-orange-300 border-orange-500/30',
  DRAFT:           'bg-gray-500/20 text-gray-300 border-gray-500/30',
  INACTIVE:        'bg-gray-500/20 text-gray-300 border-gray-500/30',
  SUSPENDED:       'bg-red-500/20 text-red-300 border-red-500/30',
  REJECTED:        'bg-red-500/20 text-red-300 border-red-500/30',
  CANCELLED:       'bg-red-500/20 text-red-300 border-red-500/30',
  EXPIRED:         'bg-gray-600/20 text-gray-400 border-gray-600/30',
  CLOSED:          'bg-red-500/20 text-red-300 border-red-500/30',
  DRAWING:         'bg-purple-500/20 text-purple-300 border-purple-500/30',
  ARCHIVED:        'bg-gray-700/20 text-gray-500 border-gray-700/30',
  REFUNDED:        'bg-violet-500/20 text-violet-300 border-violet-500/30',
}
