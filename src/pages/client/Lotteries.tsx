import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Eye, Send, XCircle, Search, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { lotteriesApi, getErr } from '../../lib/api'
import { fmt$, fmtDate, daysLeft } from '../../lib/utils'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/Badge'

interface LotteryRow { id: string; name: string; type: string; ticketPrice: number; totalTickets: number; ticketsSold: number; status: string; drawDate: string; saleEndDate: string }

export function ClientLotteries() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['client-lotteries', page, search],
    queryFn: () => lotteriesApi.list({ page, limit: 20, search: search || undefined }).then(r => r.data?.data),
  })
  const lotteries: LotteryRow[] = (data as { data?: LotteryRow[] })?.data ?? []
  const meta = (data as { meta?: { total: number; page: number; limit: number; totalPages: number } })?.meta

  const publishMut = useMutation({
    mutationFn: (id: string) => lotteriesApi.publish(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-lotteries'] }); toast.success('Lottery published!') },
    onError: (e) => toast.error(getErr(e)),
  })
  const closeMut = useMutation({
    mutationFn: (id: string) => lotteriesApi.close(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-lotteries'] }); toast.success('Sales closed') },
    onError: (e) => toast.error(getErr(e)),
  })

  const cols = [
    {
      key: 'name', header: 'Lottery',
      cell: (r: LotteryRow) => (
        <div>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e4ea', margin: 0 }}>{r.name}</p>

        </div>
      ),
    },
    {
      key: 'price', header: 'Ticket Price',
      cell: (r: LotteryRow) => (
        <span style={{ fontWeight: 700, color: '#34d399', fontSize: 13.5 }}>{fmt$(Number(r.ticketPrice ?? 0))}</span>
      ),
    },
    {
      key: 'progress', header: 'Tickets Sold',
      cell: (r: LotteryRow) => {
        const sold  = r.ticketsSold   ?? 0
        const total = r.totalTickets  ?? 1
        const pct   = Math.round((sold / total) * 100)
        return (
          <div style={{ minWidth: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: '#e2e4ea', fontWeight: 600 }}>{sold.toLocaleString()}</span>
              <span style={{ fontSize: 11.5, color: '#6b7280' }}>{pct}%</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#f59e0b' : '#6366f1', borderRadius: 99, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 11, color: '#4b5563', marginTop: 3, display: 'block' }}>of {total.toLocaleString()}</span>
          </div>
        )
      },
    },
    {
      key: 'draw', header: 'Draw Date',
      cell: (r: LotteryRow) => (
        <div>
          <p style={{ fontSize: 13, color: '#c8cad8', margin: 0 }}>{r.drawDate ? fmtDate(r.drawDate) : '—'}</p>
          {r.drawDate && !['COMPLETED','ARCHIVED'].includes(r.status) && (
            <p style={{ fontSize: 11.5, color: '#6b7280', margin: '2px 0 0' }}>{daysLeft(r.drawDate)}d left</p>
          )}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      cell: (r: LotteryRow) => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions', header: '',
      cell: (r: LotteryRow) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Link to={`/client/lotteries/${r.id}`}>
            <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
              <Eye className="w-3.5 h-3.5" /> View
            </button>
          </Link>
          {['DRAFT', 'PUBLISHED', 'SELLING'].includes(r.status) && (
            <Link to={`/client/lotteries/${r.id}/edit`}>
              <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </Link>
          )}
          {r.status === 'DRAFT' && (
            <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => publishMut.mutate(r.id)} disabled={publishMut.isPending}>
              <Send className="w-3.5 h-3.5" /> Publish
            </button>
          )}
          {['SELLING', 'PUBLISHED'].includes(r.status) && (
            <button className="btn-danger" style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => closeMut.mutate(r.id)} disabled={closeMut.isPending}>
              <XCircle className="w-3.5 h-3.5" /> Close
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">My Lotteries</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            {meta?.total ?? 0} lotteries total
          </p>
        </div>
        <Link to="/client/lotteries/new">
          <button className="btn-primary"><Plus className="w-4 h-4" /> New Lottery</button>
        </Link>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#6b7280' }} />
          <input className="input-dark" style={{ paddingLeft: 36 }} placeholder="Search lotteries…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <DataTable
          columns={cols}
          data={lotteries as never[]}
          isLoading={isLoading}
          meta={meta}
          onPage={setPage}
          emptyMsg="No lotteries yet — create your first one!"
        />
      </div>
    </div>
  )
}
