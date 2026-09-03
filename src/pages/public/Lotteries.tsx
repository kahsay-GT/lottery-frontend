import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Search, Ticket, Calendar, DollarSign, Trophy,
  ArrowRight, Zap, Users, Clock, X,
  ChevronLeft, ChevronRight, Sparkles, TrendingUp,
} from 'lucide-react'
import { lotteriesApi } from '../../lib/api'
import { fmt$, fmtDate, daysLeft } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { PublicNav } from '../../components/layout/PublicNav'
import { useLang } from '../../context/LangContext'
import { CardSlider, type SliderImage } from '../../components/ui/ImageSlider'

function LotteryCard({ lot, idx }: { lot: Record<string, unknown>; idx: number }) {
  const { t } = useLang()
  const total  = Number(lot.totalTickets ?? 0)
  const sold   = Number(lot.ticketsSold  ?? 0)
  const pct    = total ? Math.round((sold / total) * 100) : 0
  const prizes = (lot.prizes ?? []) as Record<string, unknown>[]
  const dl     = lot.drawDate ? daysLeft(lot.drawDate as string) : 0
  const urgent = pct >= 80 || dl <= 3

  const gradients = [
    'from-indigo-900/80 via-purple-900/60',
    'from-teal-900/80 via-cyan-900/60',
    'from-rose-900/80 via-pink-900/60',
    'from-amber-900/80 via-orange-900/60',
    'from-violet-900/80 via-fuchsia-900/60',
    'from-emerald-900/80 via-green-900/60',
  ]
  const grad = gradients[idx % gradients.length]

  // Build slider images — use lottery_images array, fall back to banner
  const rawImages = (lot.images ?? []) as { id: string; url: string }[]
  const sliderImages: SliderImage[] = rawImages.length > 0
    ? rawImages
    : lot.banner
      ? [{ id: '__banner__', url: lot.banner as string }]
      : []

  return (
    <Link
      to={`/lotteries/${lot.slug}`}
      className="group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary-900/30"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20 }}
    >
      {/* Image / Banner area */}
      <div className="relative h-44 overflow-hidden" style={{ flexShrink: 0 }}>
        {/* Slider fills the container; CardSlider renders gradient fallback when no images */}
        <CardSlider images={sliderImages} gradientClass={grad} alt={lot.name as string} />

        {/* Fallback icon shown only when no images AND no banner */}
        {sliderImages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 1 }}>
            <Ticket className="w-20 h-20 opacity-10 group-hover:opacity-20 transition-opacity duration-300" style={{ color: '#fff' }} />
          </div>
        )}

        {/* Urgency badges — top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5" style={{ zIndex: 4 }}>
          {urgent && pct >= 80 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}>
              <Zap className="w-3 h-3" /> {t('lotteries', 'almostFull')}
            </span>
          )}
          {urgent && dl <= 3 && dl > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(245,158,11,0.85)', color: '#fff' }}>
              <Clock className="w-3 h-3" /> {t('lotteries', 'dLeft').replace('{d}', String(dl))}
            </span>
          )}
        </div>

        {/* Status badge — top right */}
        <div className="absolute top-3 right-3" style={{ zIndex: 4 }}>
          <StatusBadge status={lot.status as string} />
        </div>

        {/* Price chip — bottom left */}
        <div
          className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ zIndex: 4, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-white text-sm font-bold">{fmt$(Number(lot.ticketPrice ?? 0))}</span>
          <span className="text-gray-400 text-xs">{t('lotteries', 'perTicket')}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <h3 className="font-bold text-white leading-tight line-clamp-1 group-hover:text-indigo-300 transition-colors" style={{ fontSize: 15 }}>
            {lot.name as string}
          </h3>
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#6b7280' }}>
            {(lot.client as Record<string, unknown>)?.businessName as string ?? 'Operator'}
          </p>
        </div>

        {prizes.length > 0 && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
            <Trophy className="w-3.5 h-3.5 shrink-0" style={{ color: '#facc15' }} />
            <span className="text-xs font-semibold truncate" style={{ color: '#fde68a' }}>
              🏆 {prizes[0].title as string} — {fmt$(Number(prizes[0].prizeValue ?? 0))}
            </span>
            {prizes.length > 1 && (
              <span className="text-xs shrink-0" style={{ color: '#6b7280' }}>+{prizes.length - 1}</span>
            )}
          </div>
        )}

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: '#6b7280' }}>
            <span className="font-medium" style={{ color: pct > 80 ? '#f87171' : '#9ca3af' }}>{pct}{t('lotteries', 'pctSold')}</span>
            <span>{sold.toLocaleString()} / {total.toLocaleString()} {t('lotteries', 'tickets')}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: pct > 80 ? 'linear-gradient(to right, #ef4444, #f97316)' : 'linear-gradient(to right, #6366f1, #8b5cf6)' }} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto" style={{ fontSize: 12, color: '#6b7280' }}>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('lotteries', 'draw')} {lot.drawDate ? fmtDate(lot.drawDate as string) : '—'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{total.toLocaleString()} {t('lotteries', 'tickets')}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-2 rounded-xl font-semibold text-sm transition-all duration-200 group-hover:gap-3"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
          {t('lotteries', 'buyTickets')} <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  )
}

export function PublicLotteries() {
  const { t } = useLang()
  const [search, setSearch]      = useState('')
  const [debouncedSearch, setDs] = useState('')
  const [page, setPage]          = useState(1)
  const [sort, setSort]          = useState('createdAt_desc')
  const searchRef  = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const SORT = [
    { value: 'createdAt_desc',   label: t('lotteries', 'sortNewest')    },
    { value: 'ticketPrice_asc',  label: t('lotteries', 'sortPriceLow')  },
    { value: 'ticketPrice_desc', label: t('lotteries', 'sortPriceHigh') },
    { value: 'drawDate_asc',     label: t('lotteries', 'sortDrawSoon')  },
  ]

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setDs(search); setPage(1) }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public-lotteries', page, debouncedSearch, sort],
    queryFn: () => {
      const [sortBy, sortOrder] = sort.split('_')
      return lotteriesApi.publicList({ page, limit: 12, search: debouncedSearch || undefined, sortBy, sortOrder })
        .then(r => {
          const payload = r.data?.data
          if (payload && typeof payload === 'object' && 'data' in payload) {
            return payload as { data: Record<string, unknown>[]; meta: { total: number; page: number; limit: number; totalPages: number } }
          }
          return { data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } }
        })
    },
    staleTime: 30_000,
  })

  const lotteries = data?.data ?? []
  const meta      = data?.meta
  const total     = meta?.total ?? 0

  const clearSearch = () => { setSearch(''); setDs(''); setPage(1); searchRef.current?.focus() }

  return (
    <div style={{ minHeight: '100vh', background: '#08090f' }}>
      <PublicNav />

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '64px 24px 40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 99, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', marginBottom: 20 }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#818cf8' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.05em' }}>
              {total > 0 ? t('lotteries', 'activePill').replace('{n}', String(total)) : t('lotteries', 'browsePill')}
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px,6vw,64px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.05, margin: '0 0 16px' }}>
            {t('lotteries', 'headline').replace(t('lotteries', 'gradientWord'), '')}{' '}
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('lotteries', 'gradientWord')}
            </span>
          </h1>

          {/* Search */}
          <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              <Search className="w-5 h-5 shrink-0" style={{ color: '#6b7280', margin: '0 0 0 18px' }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('lotteries', 'searchPlaceholder')}
                style={{ flex: 1, height: 52, padding: '0 12px', background: 'transparent', border: 'none', outline: 'none', fontSize: 15, color: '#fff', fontFamily: 'inherit' }}
                onFocus={e => (e.currentTarget.parentElement!.style.borderColor = 'rgba(99,102,241,0.6)')}
                onBlur={e  => (e.currentTarget.parentElement!.style.borderColor = 'rgba(255,255,255,0.12)')}
              />
              {search && (
                <button onClick={clearSearch} style={{ padding: '0 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                  <X className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => {}} className="btn-primary" style={{ margin: 6, padding: '10px 20px', borderRadius: 10, fontSize: 14, flexShrink: 0 }}>
                {t('lotteries', 'searchBtn')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isFetching && !isLoading && <Spinner size={16} style={{ color: '#6b7280' }} />}
            <p style={{ fontSize: 13.5, color: '#6b7280', margin: 0 }}>
              {isLoading ? t('lotteries', 'loading') : (
                <>
                  <span style={{ color: '#e2e4ea', fontWeight: 700 }}>{total}</span>{' '}
                  {total !== 1 ? t('lotteries', 'lotteries') : t('lotteries', 'lottery')}
                  {debouncedSearch && <> {t('lotteries', 'matching')} <span style={{ color: '#818cf8' }}>"{debouncedSearch}"</span></>}
                </>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp className="w-4 h-4" style={{ color: '#6b7280' }} />
            <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }} className="input-dark" style={{ height: 36, width: 180, fontSize: 13 }}>
              {SORT.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 380, borderRadius: 20, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : lotteries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Ticket className="w-10 h-10" style={{ color: '#374151' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#e2e4ea', margin: '0 0 8px' }}>
              {debouncedSearch ? t('lotteries', 'noResultsSearch').replace('{q}', debouncedSearch) : t('lotteries', 'noResults')}
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
              {debouncedSearch ? t('lotteries', 'tryDifferent') : t('lotteries', 'checkBack')}
            </p>
            {debouncedSearch && (
              <button onClick={() => { setSearch(''); setDs(''); setPage(1) }} className="btn-secondary" style={{ fontSize: 13 }}>
                <X className="w-4 h-4" /> {t('lotteries', 'clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {lotteries.map((lot, i) => <LotteryCard key={lot.id as string} lot={lot} idx={i} />)}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 48 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronLeft className="w-4 h-4" /> {t('lotteries', 'previous')}
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, meta.totalPages - 4)) + i
                return (
                  <button key={p} onClick={() => setPage(p)} style={{ width: 36, height: 36, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', background: p === page ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)', color: p === page ? '#818cf8' : '#6b7280', outline: p === page ? '1px solid rgba(99,102,241,0.4)' : 'none' }}>
                    {p}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              {t('lotteries', 'next')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#4b5563', margin: 0 }}>
          © {new Date().getFullYear()} LotterySaaS ·{' '}
          <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none' }}>{t('lotteries', 'operatorLogin')}</Link>
        </p>
      </footer>
    </div>
  )
}
