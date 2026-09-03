import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { adminApi } from '../../lib/api'
import { fmt$, fmtDate } from '../../lib/utils'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/Badge'

interface Lottery {
  id: string
  name: string
  client: { businessName: string }
  type: string
  ticketPrice: number
  totalTickets: number
  soldTickets: number
  status: string
  drawDate: string
}

interface ApiPage {
  data: Lottery[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export function AdminLotteries() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading } = useQuery<ApiPage>({
    queryKey: ['admin-lotteries', page, search],
    queryFn: () =>
      adminApi.allLotteries({ page, limit: 10, search: search || undefined })
        .then(r => r.data?.data),
  })

  const lotteries: Lottery[] = data?.data ?? []
  const meta = data?.meta

  const columns = [
    {
      key: 'name',
      header: 'Name',
      cell: (row: Lottery) => (
        <span className="font-medium text-white">{row.name}</span>
      ),
    },
    {
      key: 'operator',
      header: 'Operator',
      cell: (row: Lottery) => (
        <span className="text-gray-300">{row.client?.businessName ?? '—'}</span>
      ),
    },
    {
      key: 'ticketPrice',
      header: 'Ticket Price',
      cell: (row: Lottery) => (
        <span className="text-emerald-400">{fmt$(row.ticketPrice ?? 0)}</span>
      ),
    },
    {
      key: 'tickets',
      header: 'Tickets Sold / Total',
      cell: (row: Lottery) => (
        <span className="text-gray-400 text-sm">
          {row.soldTickets ?? 0} / {row.totalTickets ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: Lottery) => <StatusBadge status={row.status} />,
    },
    {
      key: 'drawDate',
      header: 'Draw Date',
      cell: (row: Lottery) => (
        <span className="text-gray-500 text-sm">
          {row.drawDate ? fmtDate(row.drawDate) : '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">All Lotteries</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search lotteries..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { setSearch(searchInput); setPage(1) }
              }}
              className="input-dark pl-9 w-64"
            />
          </div>
          <button
            onClick={() => { setSearch(searchInput); setPage(1) }}
            className="btn-secondary text-sm px-4 py-2"
          >
            Search
          </button>
        </div>
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={lotteries as never[]}
          isLoading={isLoading}
          emptyMsg="No lotteries found"
          meta={meta}
          onPage={setPage}
        />
      </div>
    </div>
  )
}
