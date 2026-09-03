import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, Ticket, Sparkles } from 'lucide-react'
import { publicApi } from '../../lib/api'
import { fmt$, fmtDate } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'
import { PublicNav } from '../../components/layout/PublicNav'
import { useLang } from '../../context/LangContext'

// ─── Lottery card ─────────────────────────────────────────────────────────────
function LotteryCard({ lot }: { lot: Record<string, unknown> }) {
  const { t } = useLang()
  const sold  = Number(lot.ticketsSold  ?? 0)
  const total = Number(lot.totalTickets ?? 0)
  const pct   = total ? Math.round((sold / total) * 100) : 0

  return (
    <Link to={`/lotteries/${lot.slug as string}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          padding: '22px 22px 20px',
          transition: 'border-color 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(99,102,241,0.45)'
          el.style.transform   = 'translateY(-3px)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.borderColor = 'rgba(255,255,255,0.08)'
          el.style.transform   = 'translateY(0)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f3f4f6', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lot.name as string}
            </p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
              {(lot.client as Record<string, unknown>)?.businessName as string ?? 'Operator'}
            </p>
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#34d399', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            {fmt$(Number(lot.ticketPrice))}
          </span>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, color: '#6b7280' }}>{sold.toLocaleString()} / {total.toLocaleString()} {t('home', 'sold')}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: pct >= 80 ? '#f87171' : '#818cf8' }}>{pct}%</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99 }}>
            <div style={{
              height: '100%', borderRadius: 99, width: `${pct}%`,
              background: pct >= 80
                ? 'linear-gradient(90deg,#f87171,#ef4444)'
                : 'linear-gradient(90deg,#818cf8,#6366f1)',
              transition: 'width 0.4s',
            }} />
          </div>
        </div>

        {/* Draw date */}
        <p style={{ fontSize: 11.5, color: '#6b7280', margin: 0 }}>
          {t('home', 'draw')} {fmtDate(lot.drawDate as string)}
        </p>
      </div>
    </Link>
  )
}

// ─── Home ─────────────────────────────────────────────────────────────────────
export function HomePage() {
  const { t } = useLang()

  const { data: lotData, isLoading } = useQuery({
    queryKey: ['home-featured-lotteries'],
    queryFn: () => publicApi.featuredLotteries().then(r => {
      const payload = r.data?.data
      if (payload && typeof payload === 'object' && 'data' in payload)
        return payload as { data: Record<string, unknown>[] }
      return { data: [] }
    }),
    staleTime: 60_000,
  })
  const featured = lotData?.data ?? []

  return (
    <div style={{ minHeight: '100vh', background: '#08090f', display: 'flex', flexDirection: 'column' }}>
      <PublicNav />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', flex: featured.length === 0 ? '1' : 'none' }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 700,
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', maxWidth: 960, margin: '0 auto', padding: '30px 24px 32px', textAlign: 'center' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 15px', borderRadius: 99,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.28)',
            marginBottom: 30,
          }}>
            <Sparkles style={{ width: 12, height: 12, color: '#818cf8' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.07em' }}>
              {t('home', 'badge')}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(30px,5vw,52px)',
            fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1,
            color: '#fff', margin: '0 0 16px',
          }}>
            {t('home', 'headline1')}{' '}
            <span style={{
              background: 'linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#f472b6 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {t('home', 'headline2')}
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(13px,1.8vw,15px)', color: '#6b7280',
            maxWidth: 420, margin: '0 auto 36px', lineHeight: 1.7,
          }}>
            {t('home', 'subtitle')}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/pricing" className="btn-primary" style={{ fontSize: 13, padding: '10px 22px', borderRadius: 10, gap: 8 }}>
              {t('home', 'startTrial')} <ArrowRight style={{ width: 13, height: 13 }} />
            </Link>
            <Link to="/owners" className="btn-secondary" style={{ fontSize: 13, padding: '10px 22px', borderRadius: 10 }}>
              {t('home', 'browseLotteries')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── LIVE LOTTERIES ───────────────────────────────────────── */}
      {(isLoading || featured.length > 0) && (
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 88px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: '#34d399',
                boxShadow: '0 0 8px #34d399',
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f3f4f6', margin: 0, letterSpacing: '-0.01em' }}>
                {t('home', 'liveLotteries')}
              </h2>
            </div>
            <Link to="/owners" style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 13, color: '#818cf8', textDecoration: 'none', fontWeight: 600,
            }}>
              {t('home', 'viewAll')} <ChevronRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Spinner className="w-8 h-8" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {featured.map(lot => <LotteryCard key={lot.id as string} lot={lot} />)}
            </div>
          )}
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px', marginTop: 'auto' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ticket style={{ width: 12, height: 12, color: '#fff' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af' }}>LotterySaaS</span>
          </div>

          <div style={{ display: 'flex', gap: 18 }}>
            {([
              ['/', t('home', 'footerHome')],
              ['/owners', t('home', 'footerBrowse')],
              ['/pricing', t('home', 'footerPricing')],
              ['/track', t('home', 'footerTrack')],
            ] as [string, string][]).map(([to, label]) => (
              <Link key={to} to={to} style={{ fontSize: 12.5, color: '#6b7280', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>
                {label}
              </Link>
            ))}
          </div>

          <p style={{ fontSize: 11.5, color: '#4b5563', margin: 0 }}>
            © {new Date().getFullYear()} LotterySaaS
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
