import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download, FileBarChart, FileSpreadsheet, ChevronLeft, ChevronRight,
  Search, X, Building2,
} from 'lucide-react'
import Cookies from 'js-cookie'
import { adminApi, reportsApi } from '../../lib/api'
import { fmt$, fmtDate, fmtDateTime } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'

type TabType = 'tickets' | 'buyers' | 'payments' | 'winners'

// ── Interfaces ────────────────────────────────────────────────────────────
interface LotteryTicket {
  id: string; ticketNumber: number; status: string;
  buyer?: { id: string; name: string; email: string; phone: string | null };
  payment?: { referenceCode: string; status: string; amount: string; approvedAt: string | null };
  purchasedAt: string | null;
}
interface BuyerData {
  id: string; name: string; email: string; phone: string | null;
  isGuest: boolean; tickets: number; totalPaid: number;
}
interface PaymentData {
  id: string; referenceCode: string; amount: string; status: string; createdAt: string;
  buyer?: { id: string; name: string; phone: string | null };
  ticket?: { ticketNumber: number };
}
interface WinnerData {
  id: string; createdAt: string;
  prize: { rank: number; title: string; prizeValue: string };
  ticket: { ticketNumber: number; buyer?: { id: string; name: string; phone: string | null } };
}

// ── Table components ──────────────────────────────────────────────────────
function TicketsTable({ data }: { data: LotteryTicket[] }) {
  const statusColors: Record<string, string> = {
    SOLD: 'text-emerald-400', AVAILABLE: 'text-gray-400',
    PENDING_PAYMENT: 'text-amber-400', RESERVED: 'text-indigo-400',
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-white/5">
          <tr className="text-left text-gray-400">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Buyer</th>
            <th className="px-3 py-2 font-medium">Phone</th>
            <th className="px-3 py-2 font-medium">Payment Ref</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map(t => (
            <tr key={t.id} className="border-t border-white/5 hover:bg-white/5">
              <td className="px-3 py-2 text-white font-medium">{t.ticketNumber}</td>
              <td className={`px-3 py-2 ${statusColors[t.status] || 'text-gray-400'}`}>{t.status}</td>
              <td className="px-3 py-2 text-gray-300">{t.buyer?.name || '—'}</td>
              <td className="px-3 py-2 text-gray-400">{t.buyer?.phone || '—'}</td>
              <td className="px-3 py-2 text-gray-500 font-mono">{t.payment?.referenceCode || '—'}</td>
              <td className="px-3 py-2 text-gray-300">{t.payment ? fmt$(Number(t.payment.amount)) : '—'}</td>
              <td className="px-3 py-2 text-gray-500">{t.purchasedAt ? fmtDateTime(t.purchasedAt) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BuyersTable({ data }: { data: BuyerData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-white/5">
          <tr className="text-left text-gray-400">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Phone</th>
            <th className="px-3 py-2 font-medium">Tickets</th>
            <th className="px-3 py-2 font-medium">Total Paid</th>
            <th className="px-3 py-2 font-medium">Type</th>
          </tr>
        </thead>
        <tbody>
          {data.map(b => (
            <tr key={b.id} className="border-t border-white/5 hover:bg-white/5">
              <td className="px-3 py-2">
                <div className="text-white">{b.name}</div>
                <div className="text-gray-500 text-[10px]">{b.email}</div>
              </td>
              <td className="px-3 py-2 text-gray-400">{b.phone || '—'}</td>
              <td className="px-3 py-2 text-gray-300">{b.tickets}</td>
              <td className="px-3 py-2 text-emerald-400">{fmt$(b.totalPaid)}</td>
              <td className="px-3 py-2 text-gray-500">{b.isGuest ? 'Guest' : 'Registered'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentsTable({ data }: { data: PaymentData[] }) {
  const statusColors: Record<string, { text: string }> = {
    APPROVED: { text: 'text-emerald-400' },
    SUBMITTED: { text: 'text-amber-400' },
    REJECTED: { text: 'text-red-400' },
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-white/5">
          <tr className="text-left text-gray-400">
            <th className="px-3 py-2 font-medium">Reference</th>
            <th className="px-3 py-2 font-medium">Buyer</th>
            <th className="px-3 py-2 font-medium">Ticket</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map(p => {
            const c = statusColors[p.status] || { text: 'text-gray-400' }
            return (
              <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-3 py-2 text-indigo-400 font-mono">{p.referenceCode}</td>
                <td className="px-3 py-2 text-gray-300">{p.buyer?.name || '—'}</td>
                <td className="px-3 py-2 text-gray-400">#{p.ticket?.ticketNumber ?? '—'}</td>
                <td className="px-3 py-2 text-white">{fmt$(Number(p.amount))}</td>
                <td className={`px-3 py-2 ${c.text}`}>{p.status}</td>
                <td className="px-3 py-2 text-gray-500">{fmtDateTime(p.createdAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function WinnersTable({ data }: { data: WinnerData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-white/5">
          <tr className="text-left text-gray-400">
            <th className="px-3 py-2 font-medium">Rank</th>
            <th className="px-3 py-2 font-medium">Prize</th>
            <th className="px-3 py-2 font-medium">Value</th>
            <th className="px-3 py-2 font-medium">Ticket</th>
            <th className="px-3 py-2 font-medium">Winner</th>
            <th className="px-3 py-2 font-medium">Phone</th>
          </tr>
        </thead>
        <tbody>
          {data.map(w => (
            <tr key={w.id} className="border-t border-white/5 hover:bg-white/5">
              <td className="px-3 py-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold inline-flex items-center justify-center">
                  {w.prize.rank}
                </span>
              </td>
              <td className="px-3 py-2 text-white">{w.prize.title}</td>
              <td className="px-3 py-2 text-emerald-400">{fmt$(Number(w.prize.prizeValue))}</td>
              <td className="px-3 py-2 text-indigo-400 font-medium">#{w.ticket.ticketNumber}</td>
              <td className="px-3 py-2 text-gray-300">{w.ticket.buyer?.name || '—'}</td>
              <td className="px-3 py-2 text-gray-400">{w.ticket.buyer?.phone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Report preview (tabs + pagination) ───────────────────────────────────
function ReportPreview({ lotteryId, lotteryName }: { lotteryId: string; lotteryName: string }) {
  const [activeTab, setActiveTab] = useState<TabType>('tickets')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const limit = 15

  const tabs: { key: TabType; label: string }[] = [
    { key: 'tickets',  label: '🎫 Tickets' },
    { key: 'buyers',   label: '👥 Buyers' },
    { key: 'payments', label: '💳 Payments' },
    { key: 'winners',  label: '🏆 Winners' },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['admin-report-preview', lotteryId, activeTab, page, search],
    queryFn: async () => {
      const params = { page, limit, search: search || undefined }
      switch (activeTab) {
        case 'tickets':  return reportsApi.lotteryTickets(lotteryId, params).then(r => r.data?.data)
        case 'buyers':   return reportsApi.lotteryBuyers(lotteryId, params).then(r => r.data?.data)
        case 'payments': return reportsApi.lotteryPayments(lotteryId, params).then(r => r.data?.data)
        case 'winners':  return reportsApi.lotteryWinners(lotteryId, params).then(r => r.data?.data)
      }
    },
  })

  const items = (data as { data?: unknown[] })?.data ?? []
  const totalPages = (data as { meta?: { totalPages?: number } })?.meta?.totalPages ?? 1

  const renderTable = () => {
    if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
    if (items.length === 0) return <div className="text-center py-12 text-gray-500 text-sm">No {activeTab} found</div>
    switch (activeTab) {
      case 'tickets':  return <TicketsTable  data={items as LotteryTicket[]} />
      case 'buyers':   return <BuyersTable   data={items as BuyerData[]} />
      case 'payments': return <PaymentsTable data={items as PaymentData[]} />
      case 'winners':  return <WinnersTable  data={items as WinnerData[]} />
    }
  }

  return (
    <div className="border-t border-white/10 pt-4 mt-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h4 className="text-sm font-medium text-gray-300">{lotteryName}</h4>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by phone, ticket #, name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 pr-8 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 w-60"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-white/5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1) }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/5 rounded-lg overflow-hidden">
        {renderTable()}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs text-gray-500">{page} / {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Excel export using admin token ────────────────────────────────────────
async function downloadExcel(lotteryId: string, fileName: string) {
  const at = Cookies.get('admin_at')
  if (!at) { window.location.href = '/admin/login'; return }

  const base = import.meta.env.VITE_API_URL || '/api/v1'
  const res = await fetch(`${base}/reports/client/lottery/${lotteryId}/export/excel`, {
    headers: { Authorization: `Bearer ${at}` },
  })
  if (!res.ok) throw new Error('Export failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = fileName; a.click()
  URL.revokeObjectURL(url)
}

// ── Operator lottery section ──────────────────────────────────────────────
function OperatorLotteries({ operatorId, operatorName }: { operatorId: string; operatorName: string }) {
  const [selectedLot, setSelectedLot] = useState('')

  const { data: lotsRes, isLoading } = useQuery({
    queryKey: ['admin-operator-lotteries', operatorId],
    queryFn: () => adminApi.allLotteries({ clientId: operatorId, page: 1, limit: 100 }).then(r => r.data?.data),
  })

  const lots = (Array.isArray(lotsRes?.data) ? lotsRes.data : []) as Record<string, unknown>[]
  const selectedLotData = lots.find(l => l.id === selectedLot)

  if (isLoading) return <div className="py-6 flex justify-center"><Spinner /></div>

  return (
    <div className="space-y-6">
      {/* Lottery selector + export */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="section-title flex items-center gap-2">
            <FileBarChart className="w-4 h-4" /> Lottery Report Preview
          </h3>
          {selectedLot && selectedLotData && (
            <button
              onClick={() => downloadExcel(selectedLot, `${selectedLotData.name}-report.xlsx`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-colors"
            >
              <Download size={14} /> Export Excel
            </button>
          )}
        </div>

        <select
          className="input-dark w-full max-w-md mb-4"
          value={selectedLot}
          onChange={e => setSelectedLot(e.target.value)}
        >
          <option value="">— Select a lottery to preview —</option>
          {lots.map(l => (
            <option key={l.id as string} value={l.id as string} className="bg-gray-800">
              {l.name as string}
            </option>
          ))}
        </select>

        {selectedLot && selectedLotData ? (
          <ReportPreview lotteryId={selectedLot} lotteryName={String(selectedLotData.name)} />
        ) : (
          <div className="text-center py-10 text-gray-500 text-sm">
            <FileBarChart className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Select a lottery to preview tickets, buyers, payments and winners
          </div>
        )}
      </div>

      {/* All lotteries table */}
      {lots.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              All Lotteries — {operatorName}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-gray-400 text-xs">
                  <th className="px-4 py-3 font-medium">Lottery</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Sold</th>
                  <th className="px-4 py-3 font-medium text-center">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  <th className="px-4 py-3 font-medium text-right">Export</th>
                </tr>
              </thead>
              <tbody>
                {lots.map(lot => (
                  <tr key={lot.id as string} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{String(lot.name)}</div>
                      <div className="text-gray-500 text-xs">Draw: {fmtDate(String(lot.drawDate))}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                        lot.status === 'SELLING'   ? 'bg-emerald-500/20 text-emerald-400' :
                        lot.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' :
                        lot.status === 'CLOSED'    ? 'bg-amber-500/20 text-amber-400' :
                                                     'bg-gray-500/20 text-gray-400'
                      }`}>
                        {String(lot.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {Number(lot.ticketsSold ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {Number(lot.totalTickets ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400">
                      {fmt$(Number(lot.ticketsSold ?? 0) * Number(lot.ticketPrice ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => downloadExcel(lot.id as string, `${lot.name}-report.xlsx`)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-500/30 transition-colors"
                      >
                        Export
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lots.length === 0 && (
        <div className="glass-card p-10 text-center">
          <FileSpreadsheet className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No lotteries found for this operator.</p>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export function AdminReports() {
  const [selectedOperator, setSelectedOperator] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: clientsRes, isLoading } = useQuery({
    queryKey: ['admin-reports-clients'],
    queryFn: () => adminApi.clients({ page: 1, limit: 500 }).then(r => r.data?.data),
  })

  const allClients = (Array.isArray(clientsRes?.data) ? clientsRes.data : []) as Record<string, unknown>[]
  const clients = allClients.filter(c => {
    const matchSearch = !search || (() => {
      const q = search.toLowerCase()
      return (
        String(c.name ?? '').toLowerCase().includes(q) ||
        String(c.businessName ?? '').toLowerCase().includes(q) ||
        String(c.email ?? '').toLowerCase().includes(q)
      )
    })()
    const matchStatus = !statusFilter || String(c.status) === statusFilter
    return matchSearch && matchStatus
  })

  const selectedClient = allClients.find(c => c.id === selectedOperator)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="text-sm text-gray-400">View and export lottery reports by operator</p>
      </div>

      {/* Operator selector */}
      <div className="glass-card p-6">
        <h2 className="section-title flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4" /> Select Operator
        </h2>

        {/* Search + Status filter */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search operators by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-8 py-2 w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setSelectedOperator('') }}
            className="py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/50"
          >
            <option value="" className="bg-gray-800">All Statuses</option>
            <option value="ACTIVE"    className="bg-gray-800">Active</option>
            <option value="INACTIVE"  className="bg-gray-800">Inactive</option>
            <option value="SUSPENDED" className="bg-gray-800">Suspended</option>
            <option value="PENDING"   className="bg-gray-800">Pending</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : clients.length === 0 ? (
          <p className="text-gray-500 text-sm">No operators found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.map(c => (
              <button
                key={c.id as string}
                onClick={() => setSelectedOperator(c.id as string)}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                  selectedOperator === c.id
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {String(c.businessName || c.name)}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{String(c.email)}</div>
                </div>
                {selectedOperator === c.id && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Operator lotteries + report */}
      {selectedOperator && selectedClient && (
        <OperatorLotteries
          operatorId={selectedOperator}
          operatorName={String(selectedClient.businessName || selectedClient.name)}
        />
      )}
    </div>
  )
}
