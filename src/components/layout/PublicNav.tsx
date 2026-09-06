import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Ticket, Menu, X, CreditCard, Tag, Home } from 'lucide-react'
import { useLang } from '../../context/LangContext'
import { ThemeToggle } from '../../context/ThemeContext'
import { Logo } from '../ui/Logo'

// ─── Language Switcher ────────────────────────────────────────────────────────
function LangSwitcher() {
  const { lang, setLang } = useLang()
  const isEn = lang === 'en'
  const nextLang  = isEn ? 'am' : 'en'
  const nextLabel = isEn ? 'አማርኛ' : 'English'
  const nextAbbr  = isEn ? 'አማ' : 'EN'

  return (
    <button
      onClick={() => setLang(nextLang)}
      title={`Switch to ${nextLabel}`}
      aria-label={`Switch to ${nextLabel}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px 4px 5px',
        borderRadius: 99,
        border: '1px solid var(--border-strong)',
        background: 'var(--surface-2)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '0.02em',
        flexShrink: 0,
        boxShadow: '0 1px 6px rgba(99,102,241,0.4)',
      }}>
        {nextAbbr}
      </span>
      <span style={{
        fontSize: 11.5, fontWeight: 700,
        color: 'var(--text-muted)',
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
      }}>
        {nextLabel}
      </span>
    </button>
  )
}

// ─── Bottom mobile nav bar (Flutter-style) ────────────────────────────────────
function MobileBottomNav() {
  const { t } = useLang()
  const location = useLocation()

  const items = [
    { to: '/',        icon: Home,           label: 'Home'              },
    { to: '/owners',  icon: Ticket,     label: t('nav', 'buyTickets')   },
    { to: '/track',   icon: CreditCard,     label: t('nav', 'trackPayment') },
    { to: '/pricing', icon: Tag,            label: t('nav', 'pricing')      },
  ]

  return (
    <nav
      className="mobile-only"
      aria-label="Bottom navigation"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
        height: 64,
        background: 'var(--bg-nav-scroll)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 4px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      }}
    >
      {items.map(({ to, icon: Icon, label }) => {
        const isActive = to === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(to)
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3,
              padding: '6px 0',
              borderRadius: 12,
              textDecoration: 'none',
              color: isActive ? '#818cf8' : 'var(--text-muted)',
              transition: 'color 0.15s',
              position: 'relative',
            }}
          >
            {/* Active indicator dot */}
            {isActive && (
              <span style={{
                position: 'absolute', top: 4,
                width: 4, height: 4, borderRadius: '50%',
                background: '#818cf8',
                boxShadow: '0 0 6px rgba(129,140,248,0.8)',
              }} />
            )}
            <Icon
              style={{
                width: 22, height: 22,
                strokeWidth: isActive ? 2.2 : 1.8,
              }}
            />
            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.01em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 60,
              textAlign: 'center',
            }}>
              {label}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}

// ─── Main nav ────────────────────────────────────────────────────────────────
export function PublicNav() {
  const { t } = useLang()
  const [open,     setOpen]     = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  const NAV_LINKS = [
    { to: '/owners',  label: t('nav', 'buyTickets')   },
    { to: '/track',   label: t('nav', 'trackPayment') },
    { to: '/pricing', label: t('nav', 'pricing')      },
  ]

  useEffect(() => { setOpen(false) }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* ── Top header ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '0px 0px 0',
        background: 'transparent',
        pointerEvents: 'none',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          height: 52,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: scrolled ? 'var(--bg-nav-scroll)' : 'var(--bg-nav)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '0 12px',
          boxShadow: scrolled
            ? '0 8px 32px rgba(0,0,0,0.3)'
            : '0 4px 20px rgba(0,0,0,0.15)',
          transition: 'background 0.3s, box-shadow 0.3s',
          pointerEvents: 'auto',
        }}>

          {/* Logo */}
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
          >
            <Logo height={40} />
          </Link>

          {/* Desktop centre nav */}
          <nav
            className="desktop-only"
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 2 }}
          >
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  fontSize: 12.5,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#a5b4fc' : 'var(--text-faint)',
                  textDecoration: 'none',
                  padding: '5px 12px',
                  borderRadius: 7,
                  background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                  transition: 'color 0.15s, background 0.15s',
                  whiteSpace: 'nowrap',
                })}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  if (!el.style.background.includes('0.12')) el.style.color = 'var(--text-secondary)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  if (!el.style.background.includes('0.12')) el.style.color = 'var(--text-faint)'
                }}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop right controls */}
          <div
            className="desktop-only"
            style={{ alignItems: 'center', gap: 8, flexShrink: 0 }}
          >
            <LangSwitcher />
            <ThemeToggle size={30} />
            <Link
              to="/login"
              style={{
                fontSize: 12, fontWeight: 500, color: 'var(--text-faint)',
                textDecoration: 'none', padding: '5px 12px', borderRadius: 7,
                transition: 'color 0.15s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
            >
              {t('nav', 'signIn')}
            </Link>
            <Link
              to="/pricing"
              style={{
                fontSize: 12, fontWeight: 600, color: '#fff',
                textDecoration: 'none', padding: '5px 14px', borderRadius: 8,
                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                boxShadow: '0 2px 10px rgba(99,102,241,0.35)',
                transition: 'opacity 0.15s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {t('nav', 'getStarted')}
            </Link>
          </div>

          {/* Mobile top-right controls: lang + theme + hamburger */}
          <div
            className="mobile-only"
            style={{ alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <LangSwitcher />
            <ThemeToggle size={30} />
            <button
              onClick={() => setOpen(o => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              style={{
                width: 32, height: 32, borderRadius: 9,
                border: '1px solid var(--border-strong)',
                background: open ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
                cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: open ? '#a5b4fc' : 'var(--text-faint)',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {open
                ? <X    style={{ width: 15, height: 15 }} />
                : <Menu style={{ width: 15, height: 15 }} />}
            </button>
          </div>

        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────────────── */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 48,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          />
          <div style={{
            position: 'fixed', top: 68, left: 12, right: 12, zIndex: 49,
            background: 'var(--bg-nav-scroll)',
            border: '1px solid var(--border)',
            borderRadius: 18,
            padding: '8px',
            display: 'flex', flexDirection: 'column', gap: 2,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            animation: 'dropIn 0.18s cubic-bezier(0.16,1,0.3,1)',
          }}>
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center',
                  fontSize: 14.5, fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#a5b4fc' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                })}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  if (!el.style.background.includes('0.12')) {
                    el.style.background = 'var(--surface)'
                    el.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  if (!el.style.background.includes('0.12')) {
                    el.style.background = 'transparent'
                    el.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                {label}
              </NavLink>
            ))}

            <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />

            <Link
              to="/login"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 500, color: 'var(--text-faint)',
                textDecoration: 'none', padding: '11px 14px', borderRadius: 12,
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--surface)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent' }}
            >
              {t('nav', 'signIn')}
            </Link>
            <Link
              to="/pricing"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 600, color: '#fff',
                textDecoration: 'none', padding: '12px 14px', borderRadius: 12,
                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {t('nav', 'getStarted')}
            </Link>
          </div>
        </>
      )}

      {/* ── Flutter-style bottom nav (mobile only) ─────────────── */}
      <MobileBottomNav />

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>
    </>
  )
}
