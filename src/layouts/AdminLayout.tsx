import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Ticket, DollarSign, BarChart3,
  Settings, LogOut, ChevronLeft, ChevronRight, Package, Tag,
  Menu, X, CreditCard, ChevronDown, Shield, FileText,
} from 'lucide-react'
import { useAdminAuth } from '../store/auth'
import { authApi } from '../lib/api'
import { toast } from 'sonner'
import { ThemeToggle } from '../context/ThemeContext'

const nav = [
  { to: '/admin/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/clients',       icon: Users,           label: 'Clients' },
  { to: '/admin/plans',         icon: Tag,             label: 'Plans & Pricing' },
  { to: '/admin/subscriptions', icon: Package,         label: 'Subscriptions' },
  { to: '/admin/lotteries',     icon: Ticket,          label: 'Lotteries' },
  { to: '/admin/payments',      icon: DollarSign,      label: 'Payments' },
  { to: '/admin/reports',       icon: BarChart3,       label: 'Reports' },
  { to: '/admin/users',         icon: Shield,          label: 'Users & Roles' },
  { to: '/admin/approval-logs', icon: FileText,        label: 'Approval Logs' },
]

const settingsSubmenu = [
  { to: '/admin/settings',                  icon: Settings,    label: 'General' },
  { to: '/admin/settings/payment-accounts', icon: CreditCard,  label: 'Payment Accounts' },
]

function SidebarContent({
  collapsed, user, logout, onNavClick,
}: {
  collapsed: boolean
  user: { name?: string; email?: string } | null
  logout: () => void
  onNavClick?: () => void
}) {
  const location = useLocation()
  const isSettingsActive = location.pathname.startsWith('/admin/settings')
  const [settingsOpen, setSettingsOpen] = useState(isSettingsActive)

  // Auto-open submenu when on a settings page
  useEffect(() => {
    if (isSettingsActive) setSettingsOpen(true)
  }, [isSettingsActive])

  return (
    <>
      <nav style={{
        flex: 1, padding: '8px 10px',
        display: 'flex', flexDirection: 'column', gap: 2,
        overflow: 'hidden',           /* never scrollable */
      }}>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            onClick={onNavClick}
            className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
            style={collapsed ? { justifyContent: 'center', padding: '9px 0' } : {}}
          >
            <Icon style={{ width: 17, height: 17, flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </span>
            )}
          </NavLink>
        ))}

        {/* Settings with submenu */}
        {collapsed ? (
          // Collapsed: just show icon that links to /admin/settings
          <NavLink
            to="/admin/settings"
            title="Settings"
            onClick={onNavClick}
            className={({ isActive }) => isSettingsActive ? 'sidebar-link-active' : 'sidebar-link'}
            style={{ justifyContent: 'center', padding: '9px 0' }}
          >
            <Settings style={{ width: 17, height: 17, flexShrink: 0 }} />
          </NavLink>
        ) : (
          <div>
            {/* Settings parent button */}
            <button
              onClick={() => setSettingsOpen(o => !o)}
              className={isSettingsActive ? 'sidebar-link-active' : 'sidebar-link'}
              style={{ width: '100%', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Settings style={{ width: 17, height: 17, flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Settings
                </span>
              </div>
              <ChevronDown
                style={{
                  width: 14, height: 14, flexShrink: 0, transition: 'transform 0.2s',
                  transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {/* Submenu */}
            {settingsOpen && (
              <div style={{ marginLeft: 16, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {settingsSubmenu.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end
                    title={label}
                    onClick={onNavClick}
                    className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
                    style={{ paddingLeft: 10, fontSize: 13 }}
                  >
                    <Icon style={{ width: 14, height: 14, flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {label}
                    </span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#818cf8', flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
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

export function AdminLayout() {
  const { user, clear } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const logout = async () => {
    const rt = useAdminAuth.getState().refreshToken
    try { if (rt) await authApi.logout(rt) } finally { clear(); navigate('/admin/login'); toast.success('Logged out') }
  }

  const SIDEBAR_W = collapsed ? 64 : 220

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)', overflow: 'hidden' }}>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* Mobile drawer */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
        width: 260, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
        className="mobile-only"
      >
        <div style={{
          height: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Lottery SaaS</p>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: 0 }}>Super Admin</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent collapsed={false} user={user} logout={logout} onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside style={{
        width: SIDEBAR_W, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.2s ease',
        height: '100vh',
        position: 'sticky', top: 0,
        overflow: 'hidden',           /* sidebar itself never scrolls */
      }}
        className="desktop-only"
      >
        <div style={{
          height: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          {!collapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Ticket className="w-4 h-4 text-white" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Lottery SaaS
                  </p>
                  <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: 0 }}>Super Admin</p>
                </div>
              </div>
              <button onClick={() => setCollapsed(true)} className="btn-icon" style={{ flexShrink: 0 }}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
            }}>
              <Ticket className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="btn-icon" style={{ margin: '8px auto', flexShrink: 0 }}>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <SidebarContent collapsed={collapsed} user={user} logout={logout} />
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Mobile top bar */}
        <header style={{
          height: 56, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 16px', background: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0, position: 'sticky', top: 0, zIndex: 30,
        }}
          className="mobile-only"
        >
          <button onClick={() => setMobileOpen(true)} className="btn-icon">
            <Menu className="w-5 h-5" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Ticket className="w-3.5 h-3.5 text-white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Admin Panel
            </span>
          </div>
          <ThemeToggle size={30} />
          <button onClick={logout} className="btn-icon" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{
            maxWidth: 1280, width: '100%', margin: '0 auto',
            padding: 'clamp(16px, 4vw, 32px)',
            paddingTop: 'clamp(16px, 3vw, 28px)',
          }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
