import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Users, CreditCard, Package, Ticket, Activity, DollarSign } from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Spinner } from '../../components/ui/Spinner'
import { adminApi, reportsApi } from '../../lib/api'
import { fmt$ } from '../../lib/utils'

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
const TOOLTIP_STYLE = { background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e4ea', fontSize: 12 }

export function AdminDashboard() {
  const [period, setPeriod] = useState<'monthly' | 'daily'>('monthly')

  const { data: kpiRes }     = useQuery({ queryKey: ['admin-dashboard'],     queryFn: () => adminApi.dashboard().then(r => r.data?.data) })
  const { data: revenueRes, isLoading: revLoad } = useQuery({ queryKey: ['admin-rev', period], queryFn: () => reportsApi.adminRevenue(period).then(r => r.data?.data) })
  const { data: subsRes }    = useQuery({ queryKey: ['admin-sub-metrics'],   queryFn: () => reportsApi.adminSubs().then(r => r.data?.data) })

  const kpi  = (kpiRes as Record<string, unknown>) ?? {}
  const subs = (subsRes as Record<string, unknown>) ?? {}

  const revenueData = ([...(Array.isArray(revenueRes) ? revenueRes : [])] as { period: string; revenue: number }[])
    .reverse().slice(0, 12)
    .map(r => ({ period: new Date(r.period).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), revenue: Number(r.revenue ?? 0) }))

  const subPie = [
    { name: 'Active',    value: Number(subs.active    ?? 0) },
    { name: 'Expired',   value: Number(subs.expired   ?? 0) },
    { name: 'Cancelled', value: Number(subs.cancelled ?? 0) },
  ].filter(d => d.value > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Platform overview and analytics</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <StatCard title="Total Revenue"          value={fmt$(Number(kpi.totalRevenue          ?? 0))} icon={DollarSign} iconBg="bg-emerald-500/15" iconColor="text-emerald-400" subtitle="Subscriptions + lotteries" />
        <StatCard title="Subscription Revenue"   value={fmt$(Number(kpi.subscriptionRevenue   ?? 0))} icon={CreditCard} iconBg="bg-indigo-500/15"  iconColor="text-indigo-400"  subtitle={`${fmt$(Number(kpi.monthlySubscriptionRevenue ?? 0))} this month`} />
        <StatCard title="Lottery Revenue"        value={fmt$(Number(kpi.lotteryRevenue        ?? 0))} icon={TrendingUp} iconBg="bg-blue-500/15"    iconColor="text-blue-400"    subtitle={`${fmt$(Number(kpi.monthlyLotteryRevenue ?? 0))} this month`} />
        <StatCard title="Active Clients"         value={Number(kpi.activeClients              ?? 0)} icon={Users}      iconBg="bg-purple-500/15"  iconColor="text-purple-400"  subtitle={`${kpi.totalClients ?? 0} total`} />
        <StatCard title="Active Subscriptions"   value={Number(kpi.activeSubscriptions        ?? 0)} icon={Package}    iconBg="bg-orange-500/15"  iconColor="text-orange-400" />
        <StatCard title="Active Lotteries"       value={Number(kpi.activeLotteries            ?? 0)} icon={Ticket}     iconBg="bg-pink-500/15"    iconColor="text-pink-400" />
        <StatCard title="Tickets Sold"           value={Number(kpi.totalTicketsSold           ?? 0).toLocaleString()} icon={Activity} iconBg="bg-teal-500/15" iconColor="text-teal-400" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Revenue chart */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Revenue Over Time</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>Approved payments</p>
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 8 }}>
              {(['monthly', 'daily'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: period === p ? 'rgba(99,102,241,0.3)' : 'transparent', color: period === p ? '#818cf8' : '#6b7280' }}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {revLoad ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spinner size={28} />
            </div>
          ) : revenueData.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 13 }}>
              No revenue data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="period" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmt$(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#rg)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Subscription pie */}
        <div className="glass-card" style={{ padding: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Subscriptions</p>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>By status</p>
          {subPie.length === 0 ? (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 13 }}>No data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={subPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {subPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {subPie.map((s, i) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span style={{ fontSize: 12, color: '#9ca3af' }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e4ea' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
