import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider } from './context/LangContext'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { Toaster } from 'sonner'

// Auth
import { LoginPage }      from './pages/auth/Login'
import { AdminLoginPage } from './pages/auth/AdminLogin'
import { RegisterPage }   from './pages/auth/Register'

// Public
import { HomePage }               from './pages/public/Home'
import { PricingPage }            from './pages/public/Pricing'
import { PublicLotteries }        from './pages/public/Lotteries'
import { LotteryDetail }          from './pages/public/LotteryDetail'
import { TrackPayment }           from './pages/public/TrackPayment'
import { OperatorLotteriesPage }  from './pages/public/OperatorLotteries'
import { OperatorLotteryDetail }  from './pages/public/OperatorLotteryDetail'
import { OwnerPage }              from './pages/public/OwnerPage'
import { LotteryOwners }          from './pages/public/LotteryOwners'

// Admin
import { AdminLayout }         from './layouts/AdminLayout'
import { AdminDashboard }      from './pages/admin/Dashboard'
import { AdminClients }        from './pages/admin/Clients'
import { AdminPlans }          from './pages/admin/Plans'
import { AdminSubscriptions }  from './pages/admin/Subscriptions'
import { AdminLotteries }      from './pages/admin/Lotteries'
import { AdminPayments }       from './pages/admin/Payments'
import { AdminReports }        from './pages/admin/Reports'
import { AdminSettings }       from './pages/admin/Settings'
import { AdminPaymentAccounts } from './pages/admin/PaymentAccounts'
import { AdminUsers }          from './pages/admin/Users'
import { AdminApprovalLogs }   from './pages/admin/ApprovalLogs'

// Client
import { ClientLayout }        from './layouts/ClientLayout'
import { ClientDashboard }     from './pages/client/Dashboard'
import { ClientLotteries }     from './pages/client/Lotteries'
import { ClientLotteryDetail } from './pages/client/LotteryDetail'
import { ClientNewLottery }    from './pages/client/NewLottery'
import { ClientEditLottery }   from './pages/client/EditLottery'
import { ClientPayments }      from './pages/client/Payments'
import { ClientBuyers }        from './pages/client/Buyers'
import { ClientWinners }       from './pages/client/Winners'
import { ClientReports }       from './pages/client/Reports'
import { ClientSettings }      from './pages/client/Settings'
import { ClientSubscription }  from './pages/client/Subscription'
import { ClientStaff }         from './pages/client/Staff'
import { useAdminAuth, useClientAuth, useBuyerAuth, useStaffAuth } from './store/auth'

// Buyer
import { BuyerLayout } from './layouts/BuyerLayout'
import { BuyerDashboard } from './pages/buyer/Dashboard'
import { BuyerTickets } from './pages/buyer/Tickets'
import { BuyerPayments } from './pages/buyer/Payments'
import { BuyerProfile } from './pages/buyer/Profile'

function BuyerGuard({ children }: { children: JSX.Element }) {
  const buyerAuth = useBuyerAuth()
  if (!buyerAuth.isAuth || !buyerAuth.user) {
    return <Navigate to="/login" replace />
  }
  if (buyerAuth.user.role !== 'buyer') return <Navigate to="/" replace />
  return children
}

function StaffGuard({ children }: { children: JSX.Element }) {
  const staffAuth = useStaffAuth()
  if (!staffAuth.isAuth || !staffAuth.user) {
    return <Navigate to="/login" replace />
  }
  return children
}

function Guard({ role, children }: { role: 'super_admin' | 'client'; children: JSX.Element }) {
  const adminStore  = useAdminAuth()
  const clientStore = useClientAuth()
  const store = role === 'super_admin' ? adminStore : clientStore

  if (!store.isAuth || !store.user) {
    return <Navigate to={role === 'super_admin' ? '/admin/login' : '/login'} replace />
  }
  if (store.user.role !== role) return <Navigate to="/" replace />
  return children
}

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster position="top-right" richColors closeButton theme={theme} />
}

export default function App() {
  return (
    <ThemeProvider>
    <LangProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemedToaster />
      <Routes>

        {/* ── Public ──────────────────────────────────────────────── */}
        <Route path="/"          element={<HomePage />} />
        <Route path="/pricing"   element={<PricingPage />} />
        <Route path="/lotteries" element={<PublicLotteries />} />
        <Route path="/lotteries/:slug" element={<LotteryDetail />} />
        <Route path="/track"     element={<TrackPayment />} />
        <Route path="/owners"    element={<LotteryOwners />} />

        {/* ── Username-scoped operator pages ──────────────────────── */}
        <Route path="/:username"                 element={<OwnerPage />} />
        <Route path="/:username/lotteries"       element={<OperatorLotteriesPage />} />
        <Route path="/:username/lotteries/:slug" element={<OperatorLotteryDetail />} />

        {/* ── Auth ────────────────────────────────────────────────── */}
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/register"    element={<RegisterPage />} />

        {/* ── Admin ───────────────────────────────────────────────── */}
        <Route path="/admin" element={<Guard role="super_admin"><AdminLayout /></Guard>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"     element={<AdminDashboard />} />
          <Route path="clients"       element={<AdminClients />} />
          <Route path="plans"         element={<AdminPlans />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="lotteries"     element={<AdminLotteries />} />
          <Route path="payments"      element={<AdminPayments />} />
          <Route path="reports"       element={<AdminReports />} />
          <Route path="settings"      element={<AdminSettings />} />
          <Route path="settings/payment-accounts" element={<AdminPaymentAccounts />} />
          <Route path="users"         element={<AdminUsers />} />
          <Route path="approval-logs" element={<AdminApprovalLogs />} />
        </Route>

        {/* ── Client ──────────────────────────────────────────────── */}
        <Route path="/client" element={<Guard role="client"><ClientLayout /></Guard>}>
          <Route index element={<Navigate to="/client/dashboard" replace />} />
          <Route path="dashboard"          element={<ClientDashboard />} />
          <Route path="lotteries"          element={<ClientLotteries />} />
          <Route path="lotteries/new"      element={<ClientNewLottery />} />
          <Route path="lotteries/:id"      element={<ClientLotteryDetail />} />
          <Route path="lotteries/:id/edit" element={<ClientEditLottery />} />
          <Route path="payments"           element={<ClientPayments />} />
          <Route path="buyers"             element={<ClientBuyers />} />
          <Route path="winners"            element={<ClientWinners />} />
          <Route path="reports"            element={<ClientReports />} />
          <Route path="staff"              element={<ClientStaff />} />
          <Route path="subscription"       element={<ClientSubscription />} />
          <Route path="settings"           element={<ClientSettings />} />
        </Route>

        {/* ── Buyer ────────────────────────────────────────────────── */}
        <Route path="/buyer" element={<BuyerGuard><BuyerLayout /></BuyerGuard>}>
          <Route index element={<Navigate to="/buyer/dashboard" replace />} />
          <Route path="dashboard" element={<BuyerDashboard />} />
          <Route path="tickets"   element={<BuyerTickets />} />
          <Route path="payments"  element={<BuyerPayments />} />
          <Route path="profile"   element={<BuyerProfile />} />
        </Route>

        {/* ── Staff ────────────────────────────────────────────────── */}
        <Route path="/staff" element={<StaffGuard><ClientLayout /></StaffGuard>}>
          <Route index element={<Navigate to="/staff/payments" replace />} />
          <Route path="payments" element={<ClientPayments />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </LangProvider>
    </ThemeProvider>
  )
}
