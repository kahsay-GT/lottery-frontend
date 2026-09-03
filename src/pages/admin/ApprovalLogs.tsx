import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, X, CheckCircle, XCircle, Calendar, Filter,
  CheckCircle2, CircleX, ArrowUpDown, User, Building2,
  CreditCard, FileText, UserCheck,
} from 'lucide-react'
import { adminApi } from '../../lib/api'
import { fmtDateTime } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'

type ActionType = 'APPROVE' | 'REJECT' | 'all'
type EntityType = 'payment' | 'subscription' | 'operator' | 'client' | 'all'

interface ApprovalLog {
  id: string
  action: 'APPROVE' | 'REJECT'
  entityType: string
  entityId: string
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  device: string | null
  createdAt: string
  admin: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

interface Stats {
  totalApprovals: number
  totalRejections: number
  recentApprovals: number
  recentRejections: number
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  payment: CreditCard,
  subscription: FileText,
  client: Building2,
  operator: UserCheck,
}

const ACTION_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  APPROVE: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2 },
  REJECT: { bg: 'bg-red-500/20', text: 'text-red-400', icon: CircleX },
}

export function AdminApprovalLogs() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<ActionType>('all')
  const [entityFilter, setEntityFilter] = useState<EntityType>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['approval-logs', page, search, actionFilter, entityFilter, startDate, endDate],
    queryFn: () => adminApi.approvalLogs({
      page,
      limit: 25,
      action: actionFilter === 'all' ? undefined : actionFilter,
      entityType: entityFilter === 'all' ? undefined : entityFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }).then(r => r.data?.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['approval-stats'],
    queryFn: () => adminApi.approvalStats().then(r => r.data?.data as Stats),
  })

  const logs = (logsData as { data?: ApprovalLog[] })?.data || []
  const totalPages = (logsData as { meta?: { totalPages?: number } })?.meta?.totalPages || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Approval Logs</h1>
        <p className="text-sm text-gray-400">Track who approved payments, operators, subscriptions, and more</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Approvals"
          value={stats?.totalApprovals || 0}
          icon={CheckCircle}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <StatCard
          label="Total Rejections"
          value={stats?.totalRejections || 0}
          icon={XCircle}
          color="text-red-400"
          bgColor="bg-red-500/10"
        />
        <StatCard
          label="Last 30 Days Approvals"
          value={stats?.recentApprovals || 0}
          icon={ArrowUpDown}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          label="Last 30 Days Rejections"
          value={stats?.recentRejections || 0}
          icon={ArrowUpDown}
          color="text-amber-400"
          bgColor="bg-amber-500/10"
        />
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by admin name..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-dark w-full pl-9 pr-8 py-2 text-sm"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value as ActionType); setPage(1); }}
            className="input-dark py-2 text-sm"
          >
            <option value="all">All Actions</option>
            <option value="APPROVE">Approvals Only</option>
            <option value="REJECT">Rejections Only</option>
          </select>

          {/* Entity Filter */}
          <select
            value={entityFilter}
            onChange={e => { setEntityFilter(e.target.value as EntityType); setPage(1); }}
            className="input-dark py-2 text-sm"
          >
            <option value="all">All Entities</option>
            <option value="payment">Payments</option>
            <option value="subscription">Subscriptions</option>
            <option value="operator">Operators</option>
            <option value="client">Clients</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="input-dark py-2 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="input-dark py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Filter className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No approval logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-gray-400 text-xs">
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Approved By</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <LogRow key={log.id} log={log} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 py-4 border-t border-white/10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 text-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  bgColor: string
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

function LogRow({ log }: { log: ApprovalLog }) {
  const colors = ACTION_COLORS[log.action]
  const Icon = colors.icon
  const EntityIcon = ENTITY_ICONS[log.entityType.toLowerCase()] || FileText
  const isApprove = log.action === 'APPROVE'

  // Format the details based on entity type and values
  const getDetails = () => {
    if (!log.newValue && !log.oldValue) return 'No details'

    const formatValue = (val: unknown) => {
      if (!val) return '-'
      if (typeof val === 'object') {
        const obj = val as Record<string, unknown>
        // Show relevant fields based on entity type
        if (obj.name) return String(obj.name)
        if (obj.amount) return `$${Number(obj.amount).toLocaleString()}`
        if (obj.status) return String(obj.status)
        return JSON.stringify(obj).substring(0, 50)
      }
      return String(val)
    }

    if (isApprove && log.newValue) {
      return `Set to: ${formatValue(log.newValue)}`
    }
    if (!isApprove && log.oldValue) {
      return `Was: ${formatValue(log.oldValue)}`
    }
    return 'Status changed'
  }

  return (
    <tr className="border-t border-white/5 hover:bg-white/5">
      <td className="px-4 py-4">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.bg}`}>
          <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
          <span className={`text-xs font-medium ${colors.text}`}>
            {isApprove ? 'Approved' : 'Rejected'}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-white/5">
            <EntityIcon className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div>
            <div className="text-white capitalize">{log.entityType}</div>
            <div className="text-gray-500 text-xs font-mono">{log.entityId.substring(0, 8)}...</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        {log.admin ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-medium">
              {log.admin.name[0].toUpperCase()}
            </div>
            <div>
              <div className="text-white text-sm">{log.admin.name}</div>
              <div className="text-gray-500 text-xs">{log.admin.role}</div>
            </div>
          </div>
        ) : (
          <span className="text-gray-500">System</span>
        )}
      </td>
      <td className="px-4 py-4">
        <div className="text-gray-300 text-sm max-w-xs truncate">{getDetails()}</div>
      </td>
      <td className="px-4 py-4">
        <div className="text-gray-400 text-sm">{fmtDateTime(log.createdAt)}</div>
        {log.ipAddress && (
          <div className="text-gray-600 text-xs mt-0.5">{log.ipAddress}</div>
        )}
      </td>
    </tr>
  )
}