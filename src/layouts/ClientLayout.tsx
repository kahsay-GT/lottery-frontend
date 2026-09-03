import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Ticket, CreditCard, Users, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Package,
  Trophy, Menu, X, UserCog,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useClientAuth, useStaffAuth } from '../store/auth'
import { authApi, reportsApi } from '../lib/api'
import { toast } from 'sonner'
import { ThemeToggle } from '../context/ThemeContext'

// ── Nav badge (under-review payment count) ───────────────────────────────────
function usePaymentBadge() {
  const { data } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: () => reportsApi.dashboard().then(r => r.data?.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
  const kpi = (data ?? {}) as Record<string, unknown>
  const count = Number(kpi.pendingPayments ?? 0) + Number(kpi.underReviewPayments ?? 0)
  return count > 0 ? count : 0
}

function NavBadge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span style={{
      marginLeft: 'auto',
      minWidth: 18, height: 18,
      borderRadius: 99,
      background: 'linear-gradient(135deg,#f59e0b,#d97706)',
      color: '#fff',
      fontSize: 10, fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 5px',
      flexShrink: 0,
      boxShadow: '0 1px 6px rgba(245,158,11,0.5)',
    }}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ── Sidebar nav definition ────────────────────────────────────────────────────
const clientNav = [
  { to: '/client/dashboard',    icon: LayoutDashboard, label: 'Dashboard',      badge: false },
  { to: '/client/lotteries',    icon: Ticket,          label: 'My Lotteries',   badge: false },
  { to: '/client/payments',     icon: CreditCard,      label: 'Payments',       badge: true  },
  { to: '/client/buyers',       icon: Users,           label: 'Buyers',         badge: false },
  { to: '/client/winners',      icon: Trophy,          label: 'Winners',        badge: false },
  { to: '/client/reports',      icon: BarChart3,       label: 'Reports',        badge: false },
  { to: '/client/staff',        icon: UserCog,         label: 'Staff',          badge: false },
  { to: '/client/subscription', icon: Package,         label: 'Subscription',   badge: false },
  { to: '/client/settings',     icon: Settings,        label: 'Settings',       badge: false },
]

const staffNav = [
  { to: '/staff/payments', icon: CreditCard, label: 'Payments', badge: true },
]

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({
  collapsed, user, logout, onNavClick, nav,
}: {
  collapsed: boolean
  user: { name?: string; email?: string; businessName?: string } | null
  logout: () => void
  onNavClick?: () => void
  nav: typeof clientNav
}) {
  const paymentBadge = usePaymentBadge()

  return (
    <>
      <nav style={{
        flex: 1, padding: '8px 10px',
        display: 'flex', flexDirection: 'column', gap: 2,
        overflow: 'hidden',
      }}>
        {nav.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? `${label}${badge && paymentBadge ? ` (${paymentBadge})` : ''}` : undefined}
            onClick={onNavClick}
            className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
            style={collapsed ? { justifyContent: 'center', padding: '9px 0', position: 'relative' } : {}}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Icon style={{ width: 17, height: 17 }} />
              {/* Collapsed badge dot */}
              {collapsed && badge && paymentBadge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#f59e0b',
                  boxShadow: '0 0 0 2px #0d0e1a',
                }} />
              )}
            </div>
            {!collapsed && (
              <>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                  {label}
                </span>
                {badge && <NavBadge count={paymentBadge} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(5,150,105,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#34d399', flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase() ?? 'C'}
          </div>
          {!collapsed && (
            <>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </p>
              </div>
              <ThemeToggle size={28} />
              <button onClick={logout} className="btn-icon" title="Logout" style={{ flexShrink: 0 }}>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {collapsed && (
            <>
              <ThemeToggle size={28} />
              <button onClick={logout} className="btn-icon" title="Logout">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function ClientLayout() {
  const location   = useLocation()
  const isStaff    = location.pathname.startsWith('/staff')
  const clientData = useClientAuth()
  const staffData  = useStaffAuth()
  const { user, clear } = isStaff ? staffData : clientData
  const nav = isStaff ? staffNav : clientNav
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const logout = async () => {
    const rt = isStaff
      ? useStaffAuth.getState().refreshToken
      : useClientAuth.getState().refreshToken
    try { if (rt) await authApi.logout(rt) } finally { clear(); navigate('/login'); toast.success('Logged out') }
  }

  const SIDEBAR_W = collapsed ? 64 : 220

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)', overflow: 'hidden' }}>

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)',
        }} />
      )}

      {/* Mobile drawer */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        width: 260, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      }} className="mobile-only">
        <div style={{
          height: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: isStaff ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isStaff ? <Users className="w-3.5 h-3.5 text-white" /> : <Ticket className="w-3.5 h-3.5 text-white" />}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{isStaff ? 'Staff Panel' : 'Operator'}</p>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: 0 }}>{user?.businessName ?? user?.name}</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <SidebarContent collapsed={false} user={user} logout={logout} onNavClick={() => setMobileOpen(false)} nav={nav} />
      </aside>

      {/* Desktop sidebar */}
      <aside style={{
        width: SIDEBAR_W, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.2s ease',
        height: '100vh', position: 'sticky', top: 0,
        overflow: 'hidden',
      }} className="desktop-only">
        <div style={{
          height: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          {!collapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: isStaff ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isStaff ? <Users className="w-3.5 h-3.5 text-white" /> : <Ticket className="w-3.5 h-3.5 text-white" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isStaff ? 'Staff Panel' : 'Operator Panel'}
                  </p>
                  <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.businessName ?? user?.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setCollapsed(true)} className="btn-icon" style={{ flexShrink: 0 }}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div style={{ width: 28, height: 28, borderRadius: 8, background: isStaff ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              {isStaff ? <Users className="w-3.5 h-3.5 text-white" /> : <Ticket className="w-3.5 h-3.5 text-white" />}
            </div>
          )}
        </div>

        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="btn-icon" style={{ margin: '8px auto', flexShrink: 0 }}>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <SidebarContent collapsed={collapsed} user={user} logout={logout} nav={nav} />
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Mobile top bar */}
        <header style={{
          height: 56, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 16px', background: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0, position: 'sticky', top: 0, zIndex: 30,
        }} className="mobile-only">
          <button onClick={() => setMobileOpen(true)} className="btn-icon">
            <Menu className="w-5 h-5" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: isStaff ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {isStaff ? <Users className="w-3.5 h-3.5 text-white" /> : <Ticket className="w-3.5 h-3.5 text-white" />}
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{isStaff ? 'Staff Panel' : 'Operator Panel'}</span>
          </div>
          <ThemeToggle size={30} />
          <button onClick={logout} className="btn-icon" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{
            maxWidth: 1280, width: '100%', margin: '0 auto',
            padding: 'clamp(16px,4vw,32px)',
            paddingTop: 'clamp(16px,3vw,28px)',
          }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
