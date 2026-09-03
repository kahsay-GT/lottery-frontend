import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Ticket, CreditCard, Calendar, TrendingUp } from 'lucide-react'
import { authApi } from '../../lib/api'
import { fmt$, fmtDate } from '../../lib/utils'

export function BuyerDashboard() {
  const { data: me } = useQuery({
    queryKey: ['buyer-me'],
    queryFn: () => authApi.buyerMe().then(r => r.data?.data ?? r.data),
  })

  const { data: ticketsRes } = useQuery({
    queryKey: ['buyer-tickets'],
    queryFn: () => authApi.buyerTickets().then(r => r.data?.data ?? r.data),
  })
  const tickets = (ticketsRes as { data?: unknown[] })?.data ?? []
  const activeTickets = tickets.filter((t: any) => t.status === 'SOLD')

  const { data: paymentsRes } = useQuery({
    queryKey: ['buyer-payments'],
    queryFn: () => authApi.buyerPayments().then(r => r.data?.data ?? r.data),
  })
  const payments = (paymentsRes as { data?: unknown[] })?.data ?? []
  const totalSpent = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

  const stats = [
    { label: 'Active Tickets', value: activeTickets.length, icon: <Ticket size={20} />, color: '#10b981' },
    { label: 'Total Spent', value: fmt$(totalSpent), icon: <CreditCard size={20} />, color: '#818cf8' },
    { label: 'Draws Entered', value: tickets.length, icon: <Calendar size={20} />, color: '#f59e0b' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Welcome back, {me?.name || 'Buyer'}!</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="glass-card p-5">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ color: stat.color }}>{stat.icon}</div>
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tickets */}
      <div className="glass-card p-5">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="text-lg font-semibold text-white">Recent Tickets</h2>
          <Link to="/buyer/tickets" className="text-sm text-emerald-400 hover:text-emerald-300">
            View All →
          </Link>
        </div>
        {tickets.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No tickets yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/5">
                  <th className="pb-3">Lottery</th>
                  <th className="pb-3">Ticket #</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 5).map((t: any) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-3 text-white">{t.lottery?.name || '—'}</td>
                    <td className="py-3 text-emerald-400 font-mono">#{t.ticketNumber}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.status === 'SOLD' ? 'bg-emerald-500/20 text-emerald-400' :
                        t.status === 'PENDING_PAYMENT' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300">{fmt$(Number(t.lottery?.ticketPrice || 0))}</td>
                    <td className="py-3 text-gray-500">{t.purchasedAt ? fmtDate(t.purchasedAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}