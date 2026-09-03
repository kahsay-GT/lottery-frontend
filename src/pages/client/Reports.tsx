import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download, FileBarChart, FileSpreadsheet, ChevronLeft, ChevronRight, Search, X,
} from 'lucide-react'
import Cookies from 'js-cookie'
import { reportsApi, lotteriesApi } from '../../lib/api'
import { fmt$, fmtDate, fmtDateTime } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'

type TabType = 'tickets' | 'buyers' | 'payments' | 'winners'

// ── Tabbed Report Preview Component ───────────────────────────────────────
function ReportPreview({ lotteryId, lotteryName }: { lotteryId: string; lotteryName: string }) {
  const [activeTab, setActiveTab] = useState<TabType>('tickets')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const limit = 15

  const tabs: { key: TabType; label: string }[] = [
    { key: 'tickets', label: '🎫 Tickets' },
    { key: 'buyers', label: '👥 Buyers' },
    { key: 'payments', label: '💳 Payments' },
    { key: 'winners', label: '🏆 Winners' },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['report-preview', lotteryId, activeTab, page, search],
    queryFn: async () => {
      const params = { page, limit, search: search || undefined }
      switch (activeTab) {
        case 'tickets':
          return reportsApi.lotteryTickets(lotteryId, params).then(r => r.data?.data)
        case 'buyers':
          return reportsApi.lotteryBuyers(lotteryId, params).then(r => r.data?.data)
        case 'payments':
          return reportsApi.lotteryPayments(lotteryId, params).then(r => r.data?.data)
        case 'winners':
          return reportsApi.lotteryWinners(lotteryId, params).then(r => r.data?.data)
      }
    },
  })

  const items = (data as { data?: unknown[] })?.data ?? []
  const totalPages = (data as { meta?: { totalPages?: number } })?.meta?.totalPages ?? 1

  const renderTable = () => {
    if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>
    if (items.length === 0) return <div className="text-center py-12 text-gray-500">No {activeTab} found</div>

    switch (activeTab) {
      case 'tickets':
        return <TicketsTable data={items as LotteryTicket[]} />
      case 'buyers':
        return <BuyersTable data={items as BuyerData[]} />
      case 'payments':
        return <PaymentsTable data={items as PaymentData[]} />
      case 'winners':
        return <WinnersTable data={items as WinnerData[]} />
    }
  }

  return (
    <div className="border-t border-white/10 pt-4">
      {/* Search & Header */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <h4 className="text-sm font-medium text-gray-300">Report Preview: {lotteryName}</h4>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by phone, ticket #, name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-8 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 w-56"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-white/5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
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

      {/* Pagination info */}
      <div className="flex items-center justify-end mb-2">
        <div className="text-xs text-gray-500">Page {page} of {totalPages}</div>
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

// ── Table Components ───────────────────────────────────────────────────────
interface LotteryTicket {
  id: string; ticketNumber: number; status: string;
  buyer?: { id: string; name: string; email: string; phone: string | null };
  payment?: { referenceCode: string; status: string; amount: string; approvedAt: string | null };
  purchasedAt: string | null;
}

function TicketsTable({ data }: { data: LotteryTicket[] }) {
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
          {data.map(t => {
            const statusColors: Record<string, string> = {
              SOLD: 'text-emerald-400', AVAILABLE: 'text-gray-400',
              PENDING_PAYMENT: 'text-amber-400', RESERVED: 'text-indigo-400',
            }
            return (
              <tr key={t.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-3 py-2 text-white font-medium">{t.ticketNumber}</td>
                <td className={`px-3 py-2 ${statusColors[t.status] || 'text-gray-400'}`}>{t.status}</td>
                <td className="px-3 py-2 text-gray-300">{t.buyer?.name || '—'}</td>
                <td className="px-3 py-2 text-gray-400">{t.buyer?.phone || '—'}</td>
                <td className="px-3 py-2 text-gray-500 font-mono">{t.payment?.referenceCode || '—'}</td>
                <td className="px-3 py-2 text-gray-300">{t.payment ? fmt$(Number(t.payment.amount)) : '—'}</td>
                <td className="px-3 py-2 text-gray-500">{t.purchasedAt ? fmtDateTime(t.purchasedAt) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface BuyerData {
  id: string; name: string; email: string; phone: string | null;
  isGuest: boolean; tickets: number; totalPaid: number; paymentRefs: string[];
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

interface PaymentData {
  id: string; referenceCode: string; amount: string; status: string; createdAt: string;
  buyer?: { id: string; name: string; phone: string | null };
  ticket?: { ticketNumber: number };
}

function PaymentsTable({ data }: { data: PaymentData[] }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    APPROVED: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    SUBMITTED: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    REJECTED: { bg: 'bg-red-500/20', text: 'text-red-400' },
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
            const colors = statusColors[p.status] || { bg: 'bg-gray-500/20', text: 'text-gray-400' }
            return (
              <tr key={p.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-3 py-2 text-indigo-400 font-mono">{p.referenceCode}</td>
                <td className="px-3 py-2 text-gray-300">{p.buyer?.name || '—'}</td>
                <td className="px-3 py-2 text-gray-400">#{p.ticket?.ticketNumber ?? '—'}</td>
                <td className="px-3 py-2 text-white">{fmt$(Number(p.amount))}</td>
                <td className={`px-3 py-2 ${colors.text}`}>{p.status}</td>
                <td className="px-3 py-2 text-gray-500">{fmtDateTime(p.createdAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface WinnerData {
  id: string; createdAt: string;
  prize: { rank: number; title: string; prizeValue: string };
  ticket: { ticketNumber: number; buyer?: { id: string; name: string; phone: string | null } };
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
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">
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

// ── Export helper ─────────────────────────────────────────────────────────
async function downloadExcel(lotteryId: string, fileName: string) {
  const at = Cookies.get('client_at')
  if (!at) { window.location.href = '/login'; return }

  const base = import.meta.env.VITE_API_URL || '/api/v1'
  const res = await fetch(`${base}/reports/client/lottery/${lotteryId}/export/excel`, {
    headers: { Authorization: `Bearer ${at}` },
  })

  if (!res.ok) throw new Error('Export failed')

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main page ──────────────────────────────────────────────────────────────
export function ClientReports() {
  const [selectedLot, setSelectedLot] = useState('')

  const { data: lotsRes } = useQuery({
    queryKey: ['c-lots-list'],
    queryFn: () => lotteriesApi.list({ page: 1, limit: 100 }).then(r => r.data?.data),
  })
  const lots = (Array.isArray(lotsRes?.data) ? lotsRes.data : []) as Record<string, unknown>[]

  const selectedLotData = lots.find(l => l.id === selectedLot)

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="page-title">Reports &amp; Analytics</h1>
        <p className="text-sm text-gray-400">Track performance and export full buyer data</p>
      </div>

      {/* ── Lottery Selection & Report Preview ── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title flex items-center gap-2">
            <FileBarChart className="w-4 h-4" /> Lottery Report
          </h2>
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
          className="input-dark mb-6 w-full max-w-md"
          value={selectedLot}
          onChange={e => setSelectedLot(e.target.value)}
        >
          <option value="">— Select a lottery to preview report —</option>
          {lots.map(l => (
            <option key={l.id as string} value={l.id as string} className="bg-gray-800">
              {l.name as string}
            </option>
          ))}
        </select>

        {selectedLot && selectedLotData && (
          <ReportPreview lotteryId={selectedLot} lotteryName={String(selectedLotData.name)} />
        )}

        {!selectedLot && (
          <div className="text-center py-12 text-gray-500">
            <FileBarChart className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>Select a lottery to preview tickets, buyers, payments, and winners</p>
          </div>
        )}
      </div>

      {/* ── Export section ── */}
      <div>
        <h2 className="section-title flex items-center gap-2 mb-4">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          Export Lottery Reports
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Each export includes all tickets, full buyer details (name, email, phone), payment references and winners.
        </p>

        {lots.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <FileSpreadsheet className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No lotteries found. Create a lottery first.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr className="text-left text-gray-400 text-xs">
                    <th className="px-4 py-3 font-medium">Lottery</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Sold</th>
                    <th className="px-4 py-3 font-medium text-center">Total</th>
                    <th className="px-4 py-3 font-medium text-right">Revenue</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
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
                          lot.status === 'SELLING' ? 'bg-emerald-500/20 text-emerald-400' :
                          lot.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' :
                          lot.status === 'CLOSED' ? 'bg-amber-500/20 text-amber-400' :
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
      </div>

    </div>
  )
}
