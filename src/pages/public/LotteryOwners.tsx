import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search, X, Users, Globe, MapPin, Ticket,
  ChevronLeft, ChevronRight, Sparkles, ArrowRight, CheckCircle2,
} from 'lucide-react'
import { publicApi } from '../../lib/api'
import { fmtDate } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'
import { PublicNav } from '../../components/layout/PublicNav'
import { useLang } from '../../context/LangContext'

interface Operator {
  id: string
  username: string
  businessName: string
  name: string
  logo?: string
  city?: string
  website?: string
  isVerified?: boolean
  createdAt: string
  _count: { lotteries: number }
}

function OperatorCard({ op }: { op: Operator }) {
  const { t } = useLang()
  const initials = op.businessName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const activeLotteries = op._count?.lotteries ?? 0

  return (
    <Link to={`/${op.username}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '22px 20px',
          transition: 'all 0.2s', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          const light = document.documentElement.classList.contains('light')
          el.style.borderColor = 'rgba(99,102,241,0.45)'
          el.style.transform = 'translateY(-3px)'
          el.style.boxShadow = light ? '0 12px 36px rgba(0,0,0,0.12)' : '0 12px 36px rgba(0,0,0,0.3)'
          el.style.background = light ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.07)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          const light = document.documentElement.classList.contains('light')
          el.style.borderColor = light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)'
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
          el.style.background = light ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 15, flexShrink: 0,
            background: op.logo ? undefined : 'linear-gradient(135deg,rgba(99,102,241,0.35),rgba(124,58,237,0.25))',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 800, color: '#818cf8', overflow: 'hidden',
          }}>
            {op.logo
              ? <img src={op.logo} alt={op.businessName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f3f4f6', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {op.businessName}
              </h3>
              {op.isVerified && (
                <span title="Verified Operator" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 99, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', fontSize: 10, fontWeight: 700, color: '#34d399', flexShrink: 0 }}>
                  <CheckCircle2 style={{ width: 10, height: 10 }} /> {t('owners', 'verified')}
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>@{op.username}</span>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {op.city && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
              <MapPin style={{ width: 11, height: 11 }} />{op.city}
            </span>
          )}
          {op.website && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
              <Globe style={{ width: 11, height: 11 }} />{t('owners', 'view')}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6b7280' }}>
            {t('owners', 'since')} {fmtDate(op.createdAt)}
          </span>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            background: activeLotteries > 0 ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${activeLotteries > 0 ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <Ticket style={{ width: 11, height: 11, color: activeLotteries > 0 ? '#34d399' : '#4b5563' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: activeLotteries > 0 ? '#34d399' : '#4b5563' }}>
              {activeLotteries} {activeLotteries === 1 ? t('owners', 'activeLottery') : t('owners', 'activeLotteries')}
            </span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 4 }}>
            {t('owners', 'view')} <ArrowRight style={{ width: 12, height: 12 }} />
          </span>
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 20, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16,
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginBottom: 8, width: '60%' }} />
          <div style={{ height: 11, borderRadius: 6, background: 'rgba(255,255,255,0.05)', width: '40%' }} />
        </div>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.05)', width: '45%' }} />
    </div>
  )
}

export function LotteryOwners() {
  const { t } = useLang()
  const [search, setSearch]   = useState('')
  const [debSearch, setDeb]   = useState('')
  const [page, setPage]       = useState(1)
  const debRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => { setDeb(search); setPage(1) }, 350)
    return () => clearTimeout(debRef.current)
  }, [search])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['public-operators', page, debSearch],
    queryFn: () =>
      publicApi.operators({ page, limit: 24, search: debSearch || undefined })
        .then(r => {
          const d = r.data?.data ?? r.data
          if (d && typeof d === 'object' && 'data' in d) {
            return d as { data: Operator[]; meta: { total: number; page: number; limit: number; totalPages: number } }
          }
          return { data: [] as Operator[], meta: { total: 0, page: 1, limit: 24, totalPages: 0 } }
        }),
    staleTime: 60_000,
  })

  const operators = data?.data ?? []
  const meta      = data?.meta
  const total     = meta?.total ?? 0

  const clearSearch = () => { setSearch(''); setDeb(''); setPage(1); inputRef.current?.focus() }

  return (
    <div style={{ minHeight: '100vh', background: '#08090f' }}>
      <PublicNav />

      {/* Hero */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-5%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '64px 24px 40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', marginBottom: 20 }}>
            <Sparkles style={{ width: 13, height: 13, color: '#818cf8' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.06em' }}>
              {t('owners', 'pill')}
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(30px,6vw,50px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1, margin: '0 0 14px' }}>
            {t('owners', 'headline').split(t('owners', 'gradientWord'))[0]}
            <span style={{ background: 'linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('owners', 'gradientWord')}
            </span>
          </h1>

          {/* Search */}
          <div style={{ maxWidth: 520, margin: '0 auto', position: 'relative' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)')}
              onBlurCapture={e  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            >
              <Search style={{ width: 18, height: 18, color: '#6b7280', margin: '0 0 0 16px', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('owners', 'searchPlaceholder')}
                style={{ flex: 1, height: 48, padding: '0 12px', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#fff', fontFamily: 'inherit' }}
              />
              {search && (
                <button onClick={clearSearch} style={{ padding: '0 14px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                  <X style={{ width: 15, height: 15 }} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isFetching && !isLoading && <Spinner size={14} style={{ color: '#6b7280' }} />}
            <p style={{ fontSize: 13.5, color: '#6b7280', margin: 0 }}>
              {isLoading ? t('owners', 'loading') : (
                <>
                  <span style={{ color: '#e2e4ea', fontWeight: 700 }}>{total}</span>
                  {' '}{total !== 1 ? t('owners', 'operatorsPlural') : t('owners', 'operators')}
                  {debSearch && <> {t('owners', 'matching')} <span style={{ color: '#818cf8' }}>"{debSearch}"</span></>}
                </>
              )}
            </p>
          </div>
          <Link to="/lotteries" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Ticket style={{ width: 13, height: 13 }} />
            {t('owners', 'browseAllLotteries')}
          </Link>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : operators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 20 }}>
            <Users style={{ width: 48, height: 48, color: '#374151', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e4ea', margin: '0 0 8px' }}>
              {debSearch ? t('owners', 'noOperatorsSearch').replace('{q}', debSearch) : t('owners', 'noOperators')}
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
              {debSearch ? t('owners', 'noOpSubSearch') : t('owners', 'noOpSub')}
            </p>
            {debSearch && (
              <button onClick={clearSearch} className="btn-secondary" style={{ fontSize: 13 }}>
                {t('owners', 'clearSearch')}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {operators.map(op => <OperatorCard key={op.id} op={op} />)}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 48 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ChevronLeft style={{ width: 15, height: 15 }} /> {t('owners', 'prev')}
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
              {t('owners', 'next')} <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#4b5563', margin: 0 }}>
          © {new Date().getFullYear()} LotterySaaS ·{' '}
          <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none' }}>{t('owners', 'operatorLogin')}</Link>
        </p>
      </footer>
    </div>
  )
}
