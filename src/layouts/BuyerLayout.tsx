import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useBuyerAuth } from '../store/auth'
import { authApi } from '../lib/api'
import { toast } from 'sonner'
import { LayoutDashboard, Ticket, CreditCard, User, LogOut } from 'lucide-react'
import { ThemeToggle } from '../context/ThemeContext'

export function BuyerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const buyerAuth = useBuyerAuth()

  const handleLogout = async () => {
    try {
      const rt = buyerAuth.refreshToken
      if (rt) await authApi.logout(rt)
    } finally {
      buyerAuth.clear()
      navigate('/buyer/login')
    }
  }

  const navItems = [
    { path: '/buyer/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/buyer/tickets', label: 'My Tickets', icon: <Ticket size={18} /> },
    { path: '/buyer/payments', label: 'Payments', icon: <CreditCard size={18} /> },
    { path: '/buyer/profile', label: 'Profile', icon: <User size={18} /> },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#059669,#10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Ticket size={18} className="text-white" />
            </div>
            <div>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Lottery</h1>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Buyer Portal</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 10,
                  fontSize: 14, fontWeight: 500,
                  color: isActive ? '#10b981' : 'var(--text-faint)',
                  background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 2 }}>
            <ThemeToggle size={30} />
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 12px', borderRadius: 10,
              fontSize: 14, fontWeight: 500,
              color: '#f87171',
              background: 'rgba(248,113,113,0.1)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}