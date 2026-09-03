import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, XCircle, Eye, Search,
  DollarSign, Clock, TrendingUp, FileCheck,
  Copy, FileText, Wifi, Package, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import Cookies from 'js-cookie'
import { plansApi, getErr } from '../../lib/api'
import { fmt$, fmtDate, fmtDateTime } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { SlipViewer } from '../../components/ui/SlipViewer'
import { useSlipBlob } from '../../hooks/useSlipBlob'
import { usePaymentEvents } from '../../hooks/useSocket'
import type { SocketNotification } from '../../hooks/useSocket'
import { Spinner } from '../../components/ui/Spinner'
import { StatCard } from '../../components/ui/StatCard'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubTxn {
  id: string
  referenceCode: string
  amount: number
  currency: string
  status: string
  provider: string
  notes?: string
  approvedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
  slips: unknown[]
  subscription: {
    id: string
    status: string
    billingCycle: string
    client: { id: string; name: string; email: string; businessName: string }
    plan: { id: string; name: string }
  }
}

const STATUS_ORDER = ['SUBMITTED', 'UNDER_REVIEW', 'INITIATED', 'APPROVED', 'REJECTED']

const STATUS_META: Record<string, { label: string; dot: string }> = {
  INITIATED:    { label: 'Initiated',     dot: '#6b7280' },
  SUBMITTED:    { label: 'Slip Uploaded', dot: '#818cf8' },
  UNDER_REVIEW: { label: 'Under Review',  dot: '#facc15' },
  APPROVED:     { label: 'Approved',      dot: '#34d399' },
  REJECTED:     { label: 'Rejected',      dot: '#f87171' },
}

// ── Slip viewer for subscription slips ────────────────────────────────────────
function SubSlipViewer({ txnId, onClose }: { txnId: string; onClose: () => void }) {
  const token = Cookies.get('admin_at') ?? ''
  const base  = import.meta.env.VITE_API_URL ?? '/api/v1'
  // subscription slip endpoint — served via the payments module
  const url   = `${base}/payments/subscription-slip/${txnId}`

  const { blobUrl, mimeType, loading, error } = useSlipBlob({
    paymentId: txnId, url, token, prefix: 'sub-slip',
  })

  return (
    <SlipViewer
      blobUrl={blobUrl}
      mimeType={mimeType}
      loading={loading}
      error={error}
      fileName={`sub-slip-${txnId}.${mimeType.includes('pdf') ? 'pdf' : 'jpg'}`}
      onClose={() => { if (blobUrl) URL.revokeObjectURL(blobUrl); onClose() }}
    />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminPayments() {
  const qc = useQueryClient()
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [liveCount, setLiveCount]     = useState(0)
  const [detailTxn, setDetailTxn]     = useState<SubTxn | null>(null)
  const [rejectId, setRejectId]       = useState<string | null>(null) // subscription id
  const [reason, setReason]           = useState('')
  const [slipTxnId, setSlipTxnId]     = useState<string | null>(null)

  // ── Live socket updates ───────────────────────────────────────────────────
  usePaymentEvents(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['admin-sub-txns'] })
      setLiveCount(n => n + 1)
    }, [qc]),
    useCallback((n: SocketNotification) => {
      if (n.type === 'success') toast.success(n.title + ': ' + n.message)
      else if (n.type === 'error') toast.error(n.title + ': ' + n.message)
      else toast.info(n.title + ': ' + n.message)
    }, []),
  )

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-sub-txns', page, statusFilter],
    queryFn: () =>
      plansApi.adminSubTxns({
        page,
        limit: 20,
        ...(statusFilter ? { status: statusFilter } : {}),
      }).then(r => r.data?.data),
    refetchInterval: 60_000,
  })

  const txns: SubTxn[] = data?.data ?? []
  const meta = data?.meta

  // Local search filter
  const filtered = txns.filter(t => {
    const q = search.toLowerCase()
    return !q ||
      t.referenceCode.toLowerCase().includes(q) ||
      t.subscription?.client?.name?.toLowerCase().includes(q) ||
      t.subscription?.client?.email?.toLowerCase().includes(q) ||
      t.subscription?.client?.businessName?.toLowerCase().includes(q) ||
      t.subscription?.plan?.name?.toLowerCase().includes(q)
  })

  // ── Stats (from current page — gives live feel) ───────────────────────────
  const pending    = txns.filter(t => ['SUBMITTED', 'UNDER_REVIEW'].includes(t.status)).length
  const approved   = txns.filter(t => t.status === 'APPROVED').length
  const rejected   = txns.filter(t => t.status === 'REJECTED').length
  const revenue    = txns.filter(t => t.status === 'APPROVED').reduce((s, t) => s + Number(t.amount), 0)
  const operators  = new Set(txns.map(t => t.subscription?.client?.id).filter(Boolean)).size

  // ── Actions ───────────────────────────────────────────────────────────────
  const canAct = (t: SubTxn) => ['SUBMITTED', 'UNDER_REVIEW'].includes(t.status)

  const approveMut = useMutation({
    mutationFn: (subId: string) => plansApi.adminApprove(subId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sub-txns'] })
      toast.success('Subscription approved — operator is now active!')
      setDetailTxn(null)
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      plansApi.adminReject(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sub-txns'] })
      toast.success('Subscription rejected')
      setRejectId(null); setReason(''); setDetailTxn(null)
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const copyRef = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Reference copied')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Subscription Payments</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
            Operator subscription payments — your revenue
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {pending > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.25)', color: '#facc15', fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#facc15', animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }} />
              {pending} pending review
            </div>
          )}
          {liveCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', fontSize: 12, fontWeight: 600 }}>
              <Wifi style={{ width: 13, height: 13 }} />
              Live · {liveCount} update{liveCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <StatCard title="Subscription Revenue" value={fmt$(revenue)}            icon={TrendingUp}  iconBg="bg-emerald-500/15" iconColor="text-emerald-400" subtitle="Approved this page" />
        <StatCard title="Pending Review"        value={pending}                  icon={Clock}       iconBg="bg-amber-500/15"   iconColor="text-amber-400" />
        <StatCard title="Approved"              value={approved}                 icon={FileCheck}   iconBg="bg-blue-500/15"    iconColor="text-blue-400" />
        <StatCard title="Rejected"              value={rejected}                 icon={XCircle}     iconBg="bg-red-500/15"     iconColor="text-red-400" />
        <StatCard title="Total Transactions"    value={meta?.total ?? txns.length} icon={DollarSign} iconBg="bg-purple-500/15" iconColor="text-purple-400" />
        <StatCard title="Operators"             value={operators}                icon={Users}       iconBg="bg-indigo-500/15"  iconColor="text-indigo-400" subtitle="On this page" />
      </div>

      {/* ── Table card ──────────────────────────────────────── */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#6b7280' }} />
            <input
              className="input-dark"
              style={{ paddingLeft: 36, height: 38 }}
              placeholder="Search reference, operator, plan…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['', ...STATUS_ORDER].map(s => {
              const active = statusFilter === s
              const m = s ? STATUS_META[s] : null
              return (
                <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1) }}
                  style={{
                    padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    background: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                    color: active ? '#818cf8' : '#6b7280',
                    outline: active ? '1px solid rgba(99,102,241,0.4)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  {m && <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, display: 'inline-block' }} />}
                  {s ? STATUS_META[s].label : 'All'}
                </button>
              )
            })}
          </div>
          {isFetching && !isLoading && <Spinner size={16} style={{ color: '#6b7280' }} />}
        </div>

        {/* Table */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#4b5563' }}>
            <Package style={{ width: 40, height: 40, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14 }}>No subscription payments found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Reference', 'Operator', 'Plan', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.02)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Reference */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#818cf8', letterSpacing: '0.04em' }}>
                          {t.referenceCode.slice(0, 13)}…
                        </span>
                        <button onClick={() => copyRef(t.referenceCode)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2, display: 'flex' }}>
                          <Copy style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                      {(t.slips as unknown[])?.length > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '1px 6px', borderRadius: 4, marginTop: 3, display: 'inline-block' }}>
                          SLIP
                        </span>
                      )}
                    </td>

                    {/* Operator */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#818cf8', flexShrink: 0 }}>
                          {t.subscription?.client?.businessName?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e4ea', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                            {t.subscription?.client?.businessName ?? '—'}
                          </p>
                          <p style={{ fontSize: 11, color: '#6b7280', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                            {t.subscription?.client?.email ?? ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#c8cad8' }}>
                          {t.subscription?.plan?.name ?? '—'}
                        </span>
                        <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>
                          {t.subscription?.billingCycle?.toLowerCase() ?? ''}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#34d399' }}>
                        {fmt$(Number(t.amount ?? 0))}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StatusBadge status={t.status} label={STATUS_META[t.status]?.label ?? t.status} />
                        {canAct(t) && (
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#facc15', animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }} />
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                      <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>{fmtDate(t.createdAt)}</p>
                      {t.approvedAt && (
                        <p style={{ fontSize: 11, color: '#34d399', margin: '2px 0 0' }}>✓ {fmtDate(t.approvedAt)}</p>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => setDetailTxn(t)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#9ca3af' }}
                        >
                          <Eye style={{ width: 13, height: 13 }} /> View
                        </button>

                        {(t.slips as unknown[])?.length > 0 && (
                          <button
                            onClick={() => setSlipTxnId(t.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            <FileText style={{ width: 13, height: 13 }} /> Slip
                          </button>
                        )}

                        {canAct(t) && (
                          <>
                            <button
                              onClick={() => approveMut.mutate(t.subscription.id)}
                              disabled={approveMut.isPending}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.25)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.15)')}
                            >
                              {approveMut.isPending ? <Spinner size={12} /> : <CheckCircle2 style={{ width: 13, height: 13 }} />}
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectId(t.subscription.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.22)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.12)')}
                            >
                              <XCircle style={{ width: 13, height: 13 }} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 12.5, color: '#6b7280' }}>
              {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>← Prev</button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 12.5, color: '#9ca3af', padding: '0 8px' }}>
                {meta.page} / {meta.totalPages}
              </span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages}
                className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Modal ────────────────────────────────────── */}
      <Modal open={!!detailTxn} onClose={() => setDetailTxn(null)} title="Subscription Payment Details" size="md">
        {detailTxn && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Operator header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#818cf8', flexShrink: 0 }}>
                {detailTxn.subscription?.client?.businessName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{detailTxn.subscription?.client?.businessName ?? '—'}</p>
                <p style={{ fontSize: 12.5, color: '#6b7280', margin: 0 }}>{detailTxn.subscription?.client?.email ?? ''}</p>
              </div>
              <StatusBadge status={detailTxn.status} label={STATUS_META[detailTxn.status]?.label} />
            </div>

            {/* Details grid */}
            {([
              ['Reference',   detailTxn.referenceCode, true],
              ['Plan',        detailTxn.subscription?.plan?.name ?? '—', false],
              ['Billing',     detailTxn.subscription?.billingCycle ?? '—', false],
              ['Amount',      fmt$(Number(detailTxn.amount ?? 0)), false],
              ['Currency',    detailTxn.currency ?? 'ETB', false],
              ['Submitted',   fmtDateTime(detailTxn.createdAt), false],
              ...(detailTxn.approvedAt ? [['Approved', fmtDateTime(detailTxn.approvedAt), false]] : []),
              ...(detailTxn.rejectionReason ? [['Rejection Reason', detailTxn.rejectionReason, false]] : []),
            ] as [string, string, boolean][]).map(([k, v, mono]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: 12.5, color: '#6b7280' }}>{k}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e4ea', fontFamily: mono ? 'monospace' : undefined, letterSpacing: mono ? '0.05em' : undefined }}>
                  {v}
                </span>
              </div>
            ))}

            {/* Slip indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: (detailTxn.slips as unknown[])?.length > 0 ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)', border: (detailTxn.slips as unknown[])?.length > 0 ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: (detailTxn.slips as unknown[])?.length > 0 ? '#34d399' : '#6b7280', margin: 0 }}>
                {(detailTxn.slips as unknown[])?.length > 0 ? '✓ Payment slip uploaded' : '✗ No payment slip yet'}
              </p>
              {(detailTxn.slips as unknown[])?.length > 0 && (
                <button
                  onClick={() => { setDetailTxn(null); setSlipTxnId(detailTxn.id) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  <FileText style={{ width: 13, height: 13 }} /> View Slip
                </button>
              )}
            </div>

            {/* Approve / Reject */}
            {canAct(detailTxn) && (
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => approveMut.mutate(detailTxn.subscription.id)}
                  disabled={approveMut.isPending}
                  className="btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, fontSize: 14 }}
                >
                  {approveMut.isPending ? <Spinner size={16} /> : <CheckCircle2 style={{ width: 17, height: 17 }} />}
                  Approve Subscription
                </button>
                <button
                  onClick={() => { setDetailTxn(null); setRejectId(detailTxn.subscription.id) }}
                  className="btn-danger"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, fontSize: 14 }}
                >
                  <XCircle style={{ width: 17, height: 17 }} /> Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Reject Modal ────────────────────────────────────── */}
      <Modal open={!!rejectId} onClose={() => { setRejectId(null); setReason('') }}
        title="Reject Subscription" description="The operator will be notified of the rejection reason." size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Textarea label="Reason *" value={reason} onChange={e => setReason(e.target.value)}
            rows={3} placeholder="e.g. Incorrect amount, unreadable slip, wrong account…" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn-secondary" onClick={() => { setRejectId(null); setReason('') }}>Cancel</button>
            <button className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              disabled={!reason.trim() || rejectMut.isPending}
              onClick={() => rejectId && rejectMut.mutate({ id: rejectId, reason })}>
              {rejectMut.isPending ? <Spinner size={14} /> : <XCircle style={{ width: 15, height: 15 }} />}
              Confirm Rejection
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Slip viewer ─────────────────────────────────────── */}
      {slipTxnId && (
        <SubSlipViewer txnId={slipTxnId} onClose={() => setSlipTxnId(null)} />
      )}
    </div>
  )
}
