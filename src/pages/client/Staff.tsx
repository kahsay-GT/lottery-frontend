import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Users, Plus, Search, X, Eye, EyeOff, Shield,
  CheckCircle2, XCircle, Trash2, Edit2, Activity,
  UserCheck, UserX, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { staffApi, getErr } from '../../lib/api'
import { fmtDate, fmtDateTime, fmt$ } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'

type StaffRole = 'APPROVER' | 'VIEWER'

interface StaffMember {
  id: string
  name: string
  email: string
  role: StaffRole
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

interface ActivityRow {
  id: string
  referenceCode: string
  amount: string
  status: string
  approvedAt: string | null
  reviewedAt: string | null
  rejectionReason: string | null
  approvedByStaff: { id: string; name: string; email: string } | null
  rejectedByStaff: { id: string; name: string; email: string } | null
  buyer: { name: string; phone: string | null; email: string } | null
  lottery: { name: string } | null
}

const ROLE_BADGE: Record<StaffRole, string> = {
  APPROVER: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  VIEWER:   'bg-blue-500/20 text-blue-400 border border-blue-500/30',
}

// ── Staff Form Modal ───────────────────────────────────────────────────────
function StaffModal({
  staff,
  onClose,
  onSubmit,
}: {
  staff?: StaffMember
  onClose: () => void
  onSubmit: (data: { name: string; email: string; password: string; role: StaffRole }) => void
}) {
  const [name,     setName]     = useState(staff?.name  || '')
  const [email,    setEmail]    = useState(staff?.email || '')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [role,     setRole]     = useState<StaffRole>(staff?.role || 'VIEWER')
  const isEdit = !!staff

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ name, email, password, role })
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Staff Member' : 'Add Staff Member'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Full Name</label>
          <input
            className="input-dark w-full"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Email</label>
          <input
            type="email"
            className="input-dark w-full"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isEdit}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input-dark w-full pr-10"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={8}
              required={!isEdit}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Role</label>
          <select
            className="input-dark w-full"
            value={role}
            onChange={e => setRole(e.target.value as StaffRole)}
          >
            <option value="APPROVER" className="bg-gray-800">Approver — can approve & reject payments</option>
            <option value="VIEWER"   className="bg-gray-800">Viewer — read-only access</option>
          </select>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">
            {isEdit ? 'Save Changes' : 'Add Staff'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Staff Activity Tab ─────────────────────────────────────────────────────
function ActivityLog() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['staff-activity', page],
    queryFn: () => staffApi.activity({ page, limit: 20 }).then(r => r.data?.data),
  })

  const rows   = ((data as { data?: ActivityRow[] })?.data ?? []) as ActivityRow[]
  const meta   = (data as { meta?: { totalPages?: number; total?: number } })?.meta
  const total  = meta?.total ?? rows.length
  const pages  = meta?.totalPages ?? 1

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{total} actions recorded</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-gray-500">{page} / {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No staff activity yet</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-gray-400 text-xs">
                  <th className="px-4 py-3 font-medium">Payment Ref</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 font-medium">Lottery</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action By</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const actor = row.approvedByStaff || row.rejectedByStaff
                  const actionLabel = row.approvedByStaff ? 'Approved' : 'Rejected'
                  const actionColor = row.approvedByStaff ? 'text-emerald-400' : 'text-red-400'
                  const actionDate  = row.approvedAt || row.reviewedAt

                  return (
                    <tr key={row.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-mono text-xs text-indigo-400">{row.referenceCode}</td>
                      <td className="px-4 py-3">
                        <div className="text-white text-sm">{row.buyer?.name || '—'}</div>
                        <div className="text-xs text-gray-500">{row.buyer?.phone || ''}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">{row.lottery?.name || '—'}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                        {fmt$(Number(row.amount ?? 0))}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        {actor ? (
                          <div>
                            <span className={`text-xs font-semibold ${actionColor}`}>{actionLabel} by</span>
                            <div className="text-sm text-white">{actor.name}</div>
                            <div className="text-xs text-gray-500">{actor.email}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {actionDate ? fmtDateTime(actionDate) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export function ClientStaff() {
  const qc = useQueryClient()
  const [search,       setSearch]       = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editStaff,    setEditStaff]    = useState<StaffMember | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null)
  const [activeTab,    setActiveTab]    = useState<'staff' | 'activity'>('staff')

  const { data, isLoading } = useQuery({
    queryKey: ['client-staff', search],
    queryFn:  () => staffApi.list({ search: search || undefined, limit: 100 }).then(r => r.data?.data),
  })
  const members = ((data as { data?: StaffMember[] })?.data ?? []) as StaffMember[]

  const createMut = useMutation({
    mutationFn: (d: object) => staffApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-staff'] })
      toast.success('Staff member added')
      setShowModal(false)
    },
    onError: e => toast.error(getErr(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => staffApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-staff'] })
      toast.success('Staff member updated')
      setEditStaff(null)
    },
    onError: e => toast.error(getErr(e)),
  })

  const toggleMut = useMutation({
    mutationFn: (id: string) => staffApi.toggleActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-staff'] }),
    onError: e => toast.error(getErr(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-staff'] })
      toast.success('Staff member removed')
      setDeleteTarget(null)
    },
    onError: e => toast.error(getErr(e)),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="text-sm text-gray-400">Manage staff who can approve or view payments</p>
        </div>
        {activeTab === 'staff' && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/30 transition-colors"
          >
            <Plus size={16} /> Add Staff
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 w-fit">
        {(['staff', 'activity'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'staff' ? <><Users size={14} className="inline mr-1.5" />Staff</> : <><Activity size={14} className="inline mr-1.5" />Activity Log</>}
          </button>
        ))}
      </div>

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-8 py-2 w-full rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X size={13} />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : members.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No staff members yet. Add one to get started.</p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5">
                    <tr className="text-left text-gray-400 text-xs">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Last Login</th>
                      <th className="px-4 py-3 font-medium">Added</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => (
                      <tr key={m.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{m.name}</div>
                          <div className="text-xs text-gray-500">{m.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[m.role]}`}>
                            <Shield size={10} className="inline mr-1" />
                            {m.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            m.isActive
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {m.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {m.lastLoginAt ? fmtDateTime(m.lastLoginAt) : 'Never'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {fmtDate(m.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setEditStaff(m)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => toggleMut.mutate(m.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                m.isActive
                                  ? 'hover:bg-amber-500/20 text-amber-400'
                                  : 'hover:bg-emerald-500/20 text-emerald-400'
                              }`}
                              title={m.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {m.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(m)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                              title="Remove"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && <ActivityLog />}

      {/* Add modal */}
      {showModal && (
        <StaffModal
          onClose={() => setShowModal(false)}
          onSubmit={data => createMut.mutate(data)}
        />
      )}

      {/* Edit modal */}
      {editStaff && (
        <StaffModal
          staff={editStaff}
          onClose={() => setEditStaff(null)}
          onSubmit={data => updateMut.mutate({ id: editStaff.id, data })}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal
          open
          onClose={() => setDeleteTarget(null)}
          title="Remove Staff Member"
          size="sm"
        >
          <p className="text-sm text-gray-400 mb-6">
            Remove <strong className="text-white">{deleteTarget.name}</strong>? They will lose access immediately.
          </p>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button
              className="btn-danger flex items-center gap-2"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending ? <Spinner /> : <Trash2 size={14} />}
              Remove
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
