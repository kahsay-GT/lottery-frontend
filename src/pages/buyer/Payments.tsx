import { useQuery } from '@tanstack/react-query'
import { authApi } from '../../lib/api'
import { fmt$, fmtDateTime } from '../../lib/utils'
import { CreditCard, Search } from 'lucide-react'
import { useState } from 'react'

export function BuyerPayments() {
  const [search, setSearch] = useState('')

  const { data: paymentsRes, isLoading } = useQuery({
    queryKey: ['buyer-payments'],
    queryFn: () => authApi.buyerPayments().then(r => r.data?.data ?? r.data),
  })
  const allPayments = (paymentsRes as { data?: unknown[] })?.data ?? []

  const payments = search
    ? allPayments.filter((p: any) =>
        p.lottery?.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.referenceCode?.toLowerCase().includes(search.toLowerCase())
      )
    : allPayments

  const statusColors: Record<string, { bg: string; text: string }> = {
    APPROVED: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    SUBMITTED: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    UNDER_REVIEW: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    REJECTED: { bg: 'bg-red-500/20', text: 'text-red-400' },
    REFUNDED: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  }

  const totalSpent = payments
    .filter((p: any) => p.status === 'APPROVED')
    .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payments</h1>
        <p className="text-gray-400">Total spent: {fmt$(totalSpent)}</p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 320 }}>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search by lottery or reference..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-dark pl-10"
          style={{ width: '100%' }}
        />
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No payments found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Lottery</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => {
                const colors = statusColors[p.status] || statusColors.SUBMITTED
                return (
                  <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-indigo-400 font-mono text-xs">{p.referenceCode}</td>
                    <td className="px-4 py-3 text-white">{p.lottery?.name || '—'}</td>
                    <td className="px-4 py-3 text-white font-medium">{fmt$(Number(p.amount))}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtDateTime(p.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}