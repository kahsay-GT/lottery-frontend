import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle2, XCircle, Eye, Search, Package, Clock, Filter,
  X, Download, ZoomIn, ZoomOut, Maximize2, Loader2,
  FileText, Link2, ExternalLink, ImageOff, RotateCcw,
} from 'lucide-react'
import { plansApi, getErr } from '../../lib/api'
import { fmt$, fmtDate } from '../../lib/utils'
import { DataTable, Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { Spinner } from '../../components/ui/Spinner'
import { StatCard } from '../../components/ui/StatCard'
import { getActiveToken } from '../../store/auth'

type SubRow = Record<string, unknown>

function getApiBase() {
  return import.meta.env.VITE_API_URL || '/api/v1'
}

function SubSlipDrawer({ sub, onClose, onApprove, onReject, approving }: {
  sub: SubRow; onClose: () => void; onApprove: () => void; onReject: () => void; approving: boolean
}) {
  const token  = getActiveToken() ?? ''
  const BASE   = getApiBase()
  const transactions = (sub.transactions as Array<Record<string, unknown>>) ?? []
  const latestTxn    = transactions[0] as Record<string, unknown> | undefined
  const txnId        = latestTxn?.id as string | undefined
  const client = sub.client as Record<string, string> | null
  const amount = Number(sub.price ?? 0)
  const canAct = ['PENDING', 'AWAITING_PAYMENT', 'UNDER_REVIEW'].includes(sub.status as string)
  const slipUrl = txnId ? `${BASE}/payments/subscription-slip/${txnId}` : null

  const [blobUrl, setBlobUrl]     = useState<string | null>(null)
  const [slipMime, setSlipMime]   = useState('image/jpeg')
  const [slipLoading, setSlipLoading] = useState(false)
  const [slipError, setSlipError] = useState(false)
  const [scale, setScale]         = useState(1)
  const [scannedUrl, setScannedUrl] = useState<string | null>(null)
  const [qrScanning, setQrScanning] = useState(false)
  const [qrDone, setQrDone]       = useState(false)
  const [qrError, setQrError]     = useState<string | null>(null)
  const receiptUrl = scannedUrl ?? null
  const [tab, setTab] = useState<'slip' | 'receipt'>('slip')

  const loadSlip = useCallback(async () => {
    if (!slipUrl || blobUrl || slipLoading || slipError) return
    setSlipLoading(true)
    try {
      const res = await fetch(slipUrl, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(String(res.status))
      const mime = res.headers.get('Content-Type') ?? 'image/jpeg'
      setSlipMime(mime)
      setBlobUrl(URL.createObjectURL(await res.blob()))
    } catch { setSlipError(true) }
    finally  { setSlipLoading(false) }
  }, [slipUrl, blobUrl, slipLoading, slipError, token])

  useEffect(() => { loadSlip() }, [loadSlip])

  const runQrScan = useCallback(async (url: string) => {
    if (qrDone || qrScanning) return
    setQrScanning(true); setQrError(null)
    try {
      const img = new Image(); img.src = url
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej() })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let decoded: string | null = null
      if ('BarcodeDetector' in window) {
        try {
          const det = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
          const res = await det.detect(canvas)
          if (res.length > 0) decoded = res[0].rawValue
        } catch { /* fall through */ }
      }
      if (!decoded) {
        const { default: jsQR } = await import(/* @vite-ignore */ 'https://cdn.skypack.dev/jsqr@1.4.0')
        const r = jsQR(new Uint8ClampedArray(imageData.data.buffer), imageData.width, imageData.height)
        if (r) decoded = r.data
      }
      if (decoded) {
        setScannedUrl(decoded)
        if (decoded.startsWith('http')) setTab('receipt')
      } else { setQrError('No QR code found.') }
    } catch (e: any) { setQrError('QR scan failed: ' + (e?.message ?? 'unknown')) }
    finally { setQrScanning(false); setQrDone(true) }
  }, [qrDone, qrScanning])

  useEffect(() => {
    if (blobUrl && !slipMime.includes('pdf') && !qrDone) runQrScan(blobUrl)
  }, [blobUrl, slipMime, qrDone, runQrScan])

  const isPdf = slipMime.includes('pdf')

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{ width: 'min(700px, 97vw)', background: '#0b0c18', borderLeft: '1px solid rgba(255,255,255,0.07)', boxShadow: '-12px 0 48px rgba(0,0,0,0.7)', animation: 'drawerIn 0.2s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-white/7" style={{ background: 'rgba(11,12,24,0.98)' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-base font-black text-primary-300 shrink-0 mt-0.5">
              {(client?.name?.[0] ?? 'O').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-snug truncate">{client?.name ?? 'Operator'}</p>
              {client?.email && <p className="text-xs text-gray-400">{client.email}</p>}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/8 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xl font-black text-emerald-400 tabular-nums">{fmt$(amount)}</span>
            <StatusBadge status={sub.status as string} />
            <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/8">{sub.billingCycle as string}</span>
            <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/8">{(sub.plan as Record<string, string>)?.name ?? ''}</span>
            <div className="flex-1" />
            {canAct && (
              <div className="flex items-center gap-2">
                <button onClick={onApprove} disabled={approving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 text-xs font-bold transition-colors border border-emerald-500/25 disabled:opacity-50">
                  {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve
                </button>
                <button onClick={onReject}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/15 hover:bg-red-600/30 text-red-300 text-xs font-bold transition-colors border border-red-500/20">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="shrink-0 flex border-b border-white/7 px-5 pt-0.5" style={{ background: 'rgba(11,12,24,0.95)' }}>
          <button onClick={() => setTab('slip')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${tab === 'slip' ? 'border-primary-500 text-primary-300' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            <FileText className="w-3.5 h-3.5" /> Slip Image
            {slipLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
          </button>
          <button onClick={() => setTab('receipt')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${tab === 'receipt' ? 'border-primary-500 text-primary-300' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            <Link2 className="w-3.5 h-3.5" /> Verify Link
            {qrScanning && !receiptUrl && <Loader2 className="w-3 h-3 animate-spin ml-1 text-amber-400" />}
            {receiptUrl && !qrScanning && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {tab === 'slip' && (
            <div className="absolute inset-0 flex flex-col">
              {!isPdf && blobUrl && (
                <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 border-b border-white/6" style={{ background: 'rgba(255,255,255,0.015)' }}>
                  <button onClick={() => setScale(s => Math.max(0.25, +(s - 0.25).toFixed(2)))} className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-colors"><ZoomOut className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setScale(1)} className="min-w-[46px] px-2 py-1 rounded-lg text-xs font-mono bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-colors text-center">{Math.round(scale * 100)}%</button>
                  <button onClick={() => setScale(s => Math.min(8, +(s + 0.25).toFixed(2)))} className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-colors"><ZoomIn className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setScale(1)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
                  <div className="flex-1" />
                  <a href={blobUrl} download={`sub-slip-${txnId}.jpg`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600/15 border border-primary-500/20 text-primary-300 text-xs font-semibold hover:bg-primary-600/25 transition-colors">
                    <Download className="w-3 h-3" /> Download
                  </a>
                </div>
              )}
              <div className="flex-1 overflow-auto flex items-start justify-center p-4">
                {!slipUrl && <div className="flex flex-col items-center gap-3 mt-16"><ImageOff className="w-8 h-8 text-gray-600" /><p className="text-sm text-gray-500">No slip uploaded</p></div>}
                {slipUrl && slipLoading && <div className="flex flex-col items-center gap-3 mt-16"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /><p className="text-sm text-gray-500">Loading slip…</p></div>}
                {slipUrl && slipError && <div className="flex flex-col items-center gap-3 mt-16"><ImageOff className="w-8 h-8 text-red-400" /><p className="text-sm text-red-400 font-semibold">Couldn't load slip</p></div>}
                {blobUrl && !slipError && isPdf && <iframe src={blobUrl} title="slip" className="w-full h-full border-none rounded-lg" />}
                {blobUrl && !slipError && !isPdf && (
                  <img src={blobUrl} alt="Subscription payment slip" draggable={false}
                    style={{ maxWidth: '100%', transform: `scale(${scale})`, transformOrigin: 'top center', transition: 'transform 0.12s ease', borderRadius: 8, boxShadow: '0 4px 32px rgba(0,0,0,0.55)' }} />
                )}
              </div>
            </div>
          )}
          {tab === 'receipt' && (
            <div className="absolute inset-0 flex flex-col">
              {qrScanning && <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/6" style={{ background: 'rgba(245,158,11,0.08)' }}><Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" /><span className="text-xs text-amber-300 font-semibold">Reading QR code from slip image…</span></div>}
              {receiptUrl ? (
                <>
                  <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/6" style={{ background: 'rgba(255,255,255,0.015)' }}>
                    <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    <div className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8"><span className="text-xs text-gray-300 font-mono truncate select-all cursor-text block" title={receiptUrl}>{receiptUrl}</span></div>
                    <button onClick={() => { navigator.clipboard.writeText(receiptUrl); toast.success('Link copied') }} className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-colors" title="Copy">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    </button>
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-600/15 border border-primary-500/20 text-primary-300 text-xs font-semibold hover:bg-primary-600/28 transition-colors">
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                  </div>
                  <iframe key={receiptUrl} src={receiptUrl} title="Receipt" className="flex-1 w-full border-none" style={{ background: '#fff' }} sandbox="allow-same-origin allow-scripts allow-popups allow-forms" />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                  {qrScanning ? (
                    <><Loader2 className="w-10 h-10 text-amber-400 animate-spin" /><p className="text-sm text-gray-400 font-semibold">Scanning QR code…</p></>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-gray-800/60 border border-white/8 flex items-center justify-center"><Link2 className="w-6 h-6 text-gray-600" /></div>
                      <div><p className="text-sm font-semibold text-gray-400">No verify link found</p><p className="text-xs text-gray-600 mt-1">{isPdf ? 'PDF QR codes are read by the server at upload time.' : (qrError ?? 'No QR code detected in this slip image.')}</p></div>
                      {!isPdf && blobUrl && (
                        <button onClick={() => { setQrDone(false); setQrError(null); runQrScan(blobUrl) }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/6 border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/10 transition-colors">
                          <RotateCcw className="w-3.5 h-3.5" /> Retry Scan
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes drawerIn { from { transform: translateX(100%); opacity: 0.5; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  )
}

export function AdminSubscriptions() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [reason, setReason] = useState('')
  const [viewModal, setViewModal] = useState<SubRow | null>(null)
  const [drawerSub, setDrawerSub] = useState<SubRow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subs', page, search, statusFilter],
    queryFn: () => plansApi.adminSubs({ page, limit: 20, search: search || undefined }).then(r => r.data?.data),
    refetchInterval: 15_000,
  })

  // API returns: { data: { data: [...], meta: {...} } }
  const rows = (data?.data ?? []) as SubRow[]
  const meta = data?.meta

  const approveMut = useMutation({
    mutationFn: (id: string) => plansApi.adminApprove(id, {}),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['admin-subs'] })
      toast.success('Subscription approved and activated!')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      plansApi.adminReject(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-subs'] })
      toast.success('Subscription rejected')
      setRejectModal(null); setReason('')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const filtered = statusFilter
    ? rows.filter(r => r.status === statusFilter)
    : rows

  const pending = rows.filter(r => ['PENDING', 'AWAITING_PAYMENT', 'UNDER_REVIEW'].includes(r.status as string)).length
  const active = rows.filter(r => r.status === 'ACTIVE').length

  const canApprove = (status: string) =>
    ['PENDING', 'AWAITING_PAYMENT', 'UNDER_REVIEW'].includes(status)

  const cols: Column<SubRow>[] = [
    {
      key: 'client', header: 'Client',
      cell: (r) => {
        const c = r.client as Record<string, string> | null
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600/25 flex items-center justify-center text-sm font-bold text-primary-300 shrink-0">
              {c?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{c?.name ?? '—'}</p>
              <p className="text-xs text-gray-400">{c?.email}</p>
            </div>
          </div>
        )
      },
    },
    {
      key: 'plan', header: 'Plan',
      cell: (r) => (
        <div>
          <p className="text-sm font-medium text-white">{(r.plan as Record<string, string>)?.name ?? '—'}</p>
          <p className="text-xs text-gray-400">{r.billingCycle as string}</p>
        </div>
      ),
    },
    {
      key: 'price', header: 'Amount',
      cell: (r) => <span className="font-bold text-emerald-400">{fmt$(Number(r.price ?? 0))}</span>,
    },
    {
      key: 'status', header: 'Status',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={r.status as string} />
          {canApprove(r.status as string) && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Needs approval" />
          )}
        </div>
      ),
    },
    {
      key: 'hasSlip', header: 'Slip',
      cell: (r) => {
        const txns = (r.transactions as Record<string, unknown>[] | null) ?? []
        const hasSlip = txns.some(t => (t.slips as unknown[])?.length > 0)
        return hasSlip
          ? <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Uploaded</span>
          : <span className="badge bg-gray-500/20 text-gray-400 border border-gray-500/30">None</span>
      },
    },
    {
      key: 'createdAt', header: 'Requested',
      cell: (r) => <span className="text-xs text-gray-400">{fmtDate(r.createdAt as string)}</span>,
    },
    {
      key: 'actions', header: 'Actions',
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          {(() => {
            const txns = (r.transactions as Record<string, unknown>[] | null) ?? []
            const hasSlip = txns.length > 0 && ((txns[0] as Record<string, unknown>).slips as unknown[])?.length > 0
            return hasSlip ? (
              <button onClick={() => setDrawerSub(r)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 text-xs font-semibold transition-colors border border-blue-500/20"
                title="View payment slip">
                <Eye className="w-3.5 h-3.5" /> Slip
              </button>
            ) : null
          })()}
          <button onClick={() => setViewModal(r)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Details">
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canApprove(r.status as string) && (
            <>
              <button
                onClick={() => approveMut.mutate(r.id as string)}
                disabled={approveMut.isPending}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 text-xs font-semibold transition-colors"
                title="Approve & Activate"
              >
                {approveMut.isPending ? <Spinner className="w-3 h-3" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve
              </button>
              <button
                onClick={() => setRejectModal({ id: r.id as string, name: (r.client as Record<string, string>)?.name ?? '?' })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/35 text-red-300 text-xs font-semibold transition-colors"
                title="Reject"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-400" /> Subscriptions
          </h1>
          <p className="text-sm text-gray-400">Review and approve operator subscription requests</p>
        </div>
        {pending > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 text-sm font-semibold">
            <Clock className="w-4 h-4" />
            {pending} pending approval
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pending Approval" value={pending} icon={Clock} iconBg="bg-amber-500/20" iconColor="text-amber-400" />
        <StatCard title="Active" value={active} icon={CheckCircle2} iconBg="bg-emerald-500/20" iconColor="text-emerald-400" />
        <StatCard title="Total" value={meta?.total ?? rows.length} icon={Package} iconBg="bg-primary-500/20" iconColor="text-primary-400" />
        <StatCard title="Cancelled" value={rows.filter(r => r.status === 'CANCELLED').length} icon={XCircle} iconBg="bg-red-500/20" iconColor="text-red-400" />
      </div>

      <div className="glass-card p-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-dark pl-9 h-9" placeholder="Search by client name or email…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select className="input-dark h-9 w-48"
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {['PENDING', 'AWAITING_PAYMENT', 'UNDER_REVIEW', 'ACTIVE', 'EXPIRED', 'CANCELLED'].map(s => (
                <option key={s} value={s} className="bg-gray-800">{s}</option>
              ))}
            </select>
          </div>
        </div>

        <DataTable columns={cols} data={filtered} isLoading={isLoading}
          meta={meta} onPage={setPage} emptyMsg="No subscriptions found" />
      </div>

      {/* Reject Modal */}
      <Modal open={!!rejectModal} onClose={() => { setRejectModal(null); setReason('') }}
        title="Reject Subscription"
        description={`Reject subscription for ${rejectModal?.name}`}
        size="sm">
        <div className="space-y-4">
          <Textarea label="Reason *" placeholder="Explain why this subscription is rejected…"
            value={reason} onChange={e => setReason(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => { setRejectModal(null); setReason('') }}>Cancel</button>
            <button
              className="btn-danger flex items-center gap-2"
              disabled={!reason.trim() || rejectMut.isPending}
              onClick={() => rejectModal && rejectMut.mutate({ id: rejectModal.id, reason })}
            >
              {rejectMut.isPending ? <Spinner /> : 'Confirm Reject'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)}
        title="Subscription Details" size="md">
        {viewModal && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-primary-600/25 flex items-center justify-center text-xl font-black text-primary-300">
                {((viewModal.client as Record<string,string>)?.name?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-white text-lg">{(viewModal.client as Record<string,string>)?.name}</p>
                <p className="text-sm text-gray-400">{(viewModal.client as Record<string,string>)?.email}</p>
              </div>
              <StatusBadge status={viewModal.status as string} className="ml-auto" />
            </div>
            {[
              ['Plan', (viewModal.plan as Record<string,string>)?.name],
              ['Price', fmt$(Number(viewModal.price ?? 0))],
              ['Billing Cycle', viewModal.billingCycle],
              ['Requested', fmtDate(viewModal.createdAt as string)],
              viewModal.startsAt ? ['Started', fmtDate(viewModal.startsAt as string)] : null,
              viewModal.expiresAt ? ['Expires', fmtDate(viewModal.expiresAt as string)] : null,
              viewModal.notes ? ['Notes', viewModal.notes] : null,
            ].filter(Boolean).map(pair => {
              const [k, v] = pair as [string, string]
              return (
                <div key={k} className="flex items-center justify-between p-3 rounded-xl bg-white/4 text-sm">
                  <span className="text-gray-400">{k}</span>
                  <span className="font-semibold text-white">{v}</span>
                </div>
              )
            })}

            {/* Quick approve from detail modal */}
            {canApprove(viewModal.status as string) && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { approveMut.mutate(viewModal.id as string); setViewModal(null) }}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve & Activate
                </button>
                <button
                  onClick={() => { setViewModal(null); setRejectModal({ id: viewModal.id as string, name: (viewModal.client as Record<string,string>)?.name ?? '?' }) }}
                  className="btn-danger flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            )}

            {/* View Slip button */}
            {(() => {
              const txns = (viewModal.transactions as Record<string, unknown>[] | null) ?? []
              const hasSlip = txns.length > 0 && ((txns[0] as Record<string, unknown>).slips as unknown[])?.length > 0
              return hasSlip ? (
                <button
                  onClick={() => { setViewModal(null); setDrawerSub(viewModal) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 text-sm font-semibold transition-colors border border-blue-500/20 mt-2"
                >
                  <Eye className="w-4 h-4" /> View Payment Slip
                </button>
              ) : null
            })()}
          </div>
        )}
      </Modal>

      {/* Subscription slip drawer */}
      {drawerSub && (
        <SubSlipDrawer
          sub={drawerSub}
          onClose={() => setDrawerSub(null)}
          onApprove={() => { approveMut.mutate(drawerSub.id as string); setDrawerSub(null) }}
          onReject={() => { setDrawerSub(null); setRejectModal({ id: drawerSub.id as string, name: (drawerSub.client as Record<string, string>)?.name ?? '?' }) }}
          approving={approveMut.isPending}
        />
      )}
    </div>
  )
}
