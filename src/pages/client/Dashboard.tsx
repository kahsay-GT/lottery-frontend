import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Ticket, DollarSign, Users, Clock, CheckCircle2, Activity, TrendingUp, ArrowRight, Plus } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { reportsApi } from '../../lib/api'
import { fmt$ } from '../../lib/utils'

const TOOLTIP_STYLE = { background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e4ea', fontSize: 12 }

export function ClientDashboard() {
  const { data: dashRes } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: () => reportsApi.dashboard().then(r => r.data?.data),
  })
  const kpi = (dashRes as Record<string, unknown>) ?? {}

  const barData = [
    { day: 'Mon', v: 0 }, { day: 'Tue', v: 0 }, { day: 'Wed', v: 0 },
    { day: 'Thu', v: 0 }, { day: 'Fri', v: 0 }, { day: 'Sat', v: 0 },
    { day: 'Sun', v: Number(kpi.todaySales ?? 0) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Your lottery business overview</p>
        </div>
        <Link to="/client/lotteries/new">
          <button className="btn-primary" style={{ gap: 8 }}>
            <Plus className="w-4 h-4" /> New Lottery
          </button>
        </Link>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <StatCard title="Today's Sales"       value={fmt$(Number(kpi.todaySales        ?? 0))} icon={TrendingUp}  iconBg="bg-emerald-500/15" iconColor="text-emerald-400" />
        <StatCard title="Total Revenue"       value={fmt$(Number(kpi.totalRevenue      ?? 0))} icon={DollarSign}  iconBg="bg-blue-500/15"    iconColor="text-blue-400" />
        <StatCard title="Tickets Sold"        value={Number(kpi.ticketsSold     ?? 0).toLocaleString()} icon={Ticket} iconBg="bg-purple-500/15" iconColor="text-purple-400" />
        <StatCard title="Total Buyers"        value={Number(kpi.totalBuyers     ?? 0).toLocaleString()} icon={Users}  iconBg="bg-orange-500/15" iconColor="text-orange-400" />
        <StatCard title="Active Lotteries"    value={Number(kpi.activeLotteries ?? 0)} icon={Activity}    iconBg="bg-pink-500/15"    iconColor="text-pink-400" />
        <StatCard title="Submitted Payments"  value={Number(kpi.pendingPayments ?? 0)} icon={Clock}       iconBg="bg-amber-500/15"   iconColor="text-amber-400" subtitle="Awaiting review" />
        <StatCard title="Under Review"        value={Number(kpi.underReviewPayments ?? 0)} icon={Clock}   iconBg="bg-yellow-500/15"  iconColor="text-yellow-400" subtitle="Being verified" />
        <StatCard title="Approved Payments"   value={Number(kpi.verifiedPayments ?? 0)} icon={CheckCircle2} iconBg="bg-teal-500/15"  iconColor="text-teal-400" />
      </div>

      {/* Charts + Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Bar chart */}
        <div className="glass-card" style={{ padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Weekly Sales</p>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 20px' }}>Revenue this week</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt$(v), 'Revenue']} />
              <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={i === 6 ? '#6366f1' : 'rgba(99,102,241,0.25)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="glass-card" style={{ padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>Quick Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Create Lottery',     to: '/client/lotteries/new',  color: '#6366f1' },
              { label: 'View Payments',      to: '/client/payments',       color: '#10b981' },
              { label: 'See Buyers',         to: '/client/buyers',         color: '#f59e0b' },
              { label: 'View Reports',       to: '/client/reports',        color: '#8b5cf6' },
              { label: 'Manage Winners',     to: '/client/winners',        color: '#ef4444' },
              { label: 'Subscription',       to: '/client/subscription',   color: '#0ea5e9' },
            ].map(({ label, to, color }) => (
              <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.borderColor = `${color}40` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#c8cad8' }}>{label}</span>
                  </div>
                  <ArrowRight style={{ width: 14, height: 14, color: '#4b5563' }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
