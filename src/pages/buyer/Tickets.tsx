import { useQuery } from '@tanstack/react-query'
import { authApi } from '../../lib/api'
import { fmt$, fmtDate } from '../../lib/utils'
import { Ticket, Search } from 'lucide-react'
import { useState } from 'react'

export function BuyerTickets() {
  const [search, setSearch] = useState('')

  const { data: ticketsRes, isLoading } = useQuery({
    queryKey: ['buyer-tickets'],
    queryFn: () => authApi.buyerTickets().then(r => r.data?.data ?? r.data),
  })
  const allTickets = (ticketsRes as { data?: unknown[] })?.data ?? []

  const tickets = search
    ? allTickets.filter((t: any) =>
        t.lottery?.name?.toLowerCase().includes(search.toLowerCase()) ||
        String(t.ticketNumber).includes(search)
      )
    : allTickets

  const statusColors: Record<string, { bg: string; text: string }> = {
    SOLD: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    PENDING_PAYMENT: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    CANCELLED: { bg: 'bg-red-500/20', text: 'text-red-400' },
    AVAILABLE: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Tickets</h1>
        <p className="text-gray-400">{tickets.length} tickets total</p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 320 }}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search by lottery or ticket #..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-dark pl-10"
          style={{ width: '100%' }}
        />
      </div>

      {/* Tickets Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No tickets found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tickets.map((t: any) => {
            const colors = statusColors[t.status] || statusColors.AVAILABLE
            return (
              <div key={t.id} className="glass-card p-4" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ticket size={24} className="text-emerald-400" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="font-semibold text-white">{t.lottery?.name || 'Unknown Lottery'}</h3>
                  <p className="text-sm text-gray-400">Ticket #{t.ticketNumber}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                    {t.status}
                  </span>
                  <p className="text-sm text-gray-500 mt-1">{fmt$(Number(t.lottery?.ticketPrice || 0))}</p>
                </div>
                <div style={{ textAlign: 'right', minWidth: 100 }}>
                  <p className="text-xs text-gray-500">
                    {t.purchasedAt ? fmtDate(t.purchasedAt) : '—'}
                  </p>
                  {t.payment?.approvedAt && (
                    <p className="text-xs text-emerald-500">Paid</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}