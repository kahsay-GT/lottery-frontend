import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle2, XCircle, Eye, Search, ImageOff,
  Clock, FileText, DollarSign, Loader2, Wifi, RotateCcw,
  ExternalLink, Link2, ShieldCheck, AlertTriangle,
  X, Download, ZoomIn, ZoomOut, Maximize2,
  Trash2, ArchiveRestore, Upload, FileSpreadsheet, AlertOctagon,
  Plus, Users, Ticket,
} from 'lucide-react'
import { paymentsApi, clientsApi, lotteriesApi, getErr } from '../../lib/api'
import { getActiveToken, useStaffAuth } from '../../store/auth'
import { fmt$, fmtDate, fmtDateTime } from '../../lib/utils'
import { DataTable, Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { usePaymentEvents } from '../../hooks/useSocket'
import type { SocketNotification } from '../../hooks/useSocket'
import { Spinner } from '../../components/ui/Spinner'
import { StatCard } from '../../components/ui/StatCard'

type PayRow = Record<string, unknown>

// ─── helpers ─────────────────────────────────────────────────────────────────
function metaOf(r: PayRow): Record<string, unknown> {
  return (r.metadata as Record<string, unknown> | null) ?? {}
}

// ─── SlipDrawer ──────────────────────────────────────────────────────────────
function SlipDrawer({
  payment,
  onClose,
  onApprove,
  onReject,
  approving,
}: {
  payment: PayRow
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  approving: boolean
}) {
  const token    = getActiveToken() ?? ''
  const slipUrl  = clientsApi.slipUrl(payment.id as string)
  const meta     = metaOf(payment)
  const buyer    = payment.buyer as Record<string, string> | null
  const slips    = (payment.slips as Array<Record<string, unknown>> | undefined) ?? []
  const lastSlip = slips.length > 0 ? slips[slips.length - 1] : null

  // Receipt URL — three sources in priority order:
  //   1. Client-side QR scan result from the loaded slip image (images only, below)
  //   2. DB value saved by the backend at upload time via quickScanQR
  //   3. DB value from metadata.verifiedReceiptUrl (async OCR pipeline)
  const dbReceiptUrl = (lastSlip?.receiptUrl as string | null | undefined)
    || (meta.verifiedReceiptUrl as string | null | undefined)
    || null

  const txnRef         = meta.verifiedTransactionRef as string | undefined
  const detectedAmount = meta.detectedAmount         as number | undefined
  const provider       = meta.provider               as string | undefined
  const vStatus        = meta.verificationStatus     as string | undefined
  const vReason        = meta.verificationReason     as string | undefined

  const canAct      = ['SUBMITTED', 'UNDER_REVIEW'].includes(payment.status as string)
  const expectedAmt = Number(payment.amount ?? 0)
  const amountMatch = detectedAmount != null && Math.abs(detectedAmount - expectedAmt) < 1

  // ── slip blob ──────────────────────────────────────────────────────────────
  const [blobUrl,     setBlobUrl]     = useState<string | null>(null)
  const [slipMime,    setSlipMime]    = useState('image/jpeg')
  const [slipLoading, setSlipLoading] = useState(false)
  const [slipError,   setSlipError]   = useState(false)
  const [scale,       setScale]       = useState(1)

  // ── client-side QR scan state (images only) ────────────────────────────────
  const [scannedUrl,  setScannedUrl]  = useState<string | null>(null)
  const [qrScanning,  setQrScanning]  = useState(false)
  const [qrDone,      setQrDone]      = useState(false)
  const [qrError,     setQrError]     = useState<string | null>(null)

  // Final receipt URL: live scan → DB value
  const receiptUrl = scannedUrl || dbReceiptUrl || null

  // Default tab: Verify Link if we already have a DB URL, else Slip Image
  const [tab, setTab] = useState<'slip' | 'receipt'>(dbReceiptUrl ? 'receipt' : 'slip')

  // ── Load slip blob ─────────────────────────────────────────────────────────
  const loadSlip = useCallback(async () => {
    if (blobUrl || slipLoading || slipError) return
    setSlipLoading(true)
    try {
      const res = await fetch(slipUrl, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(String(res.status))
      const mime = res.headers.get('Content-Type') ?? 'image/jpeg'
      setSlipMime(mime)
      setBlobUrl(URL.createObjectURL(await res.blob()))
    } catch { setSlipError(true) }
    finally  { setSlipLoading(false) }
  }, [blobUrl, slipLoading, slipError, slipUrl, token])

  useEffect(() => { loadSlip() }, [loadSlip])

  // ── Client-side QR scan — runs after blob loads, images only ──────────────
  // PDFs can't be rendered to canvas in the browser — server handles those.
  const runQrScan = useCallback(async (url: string) => {
    if (qrDone || qrScanning) return
    setQrScanning(true)
    setQrError(null)
    try {
      const img = new Image()
      img.src = url
      await new Promise<void>((res, rej) => {
        img.onload  = () => res()
        img.onerror = () => rej(new Error('img load failed'))
      })

      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      let decoded: string | null = null

      // 1. Native BarcodeDetector (Chrome / Edge — fastest, no library)
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore — BarcodeDetector not yet in TS lib
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
          const results  = await detector.detect(canvas)
          if (results.length > 0) decoded = results[0].rawValue
        } catch { /* fall through */ }
      }

      // 2. jsqr fallback (pure-JS, works in Firefox / Safari)
      if (!decoded) {
        const { default: jsQR } = await import(
          /* @vite-ignore */ 'https://cdn.skypack.dev/jsqr@1.4.0'
        )
        const result = jsQR(
          new Uint8ClampedArray(imageData.data.buffer),
          imageData.width,
          imageData.height,
        )
        if (result) decoded = result.data
      }

      if (decoded) {
        setScannedUrl(decoded)
        // Auto-switch to Verify Link tab when we find a URL
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          setTab('receipt')
        }
      } else {
        setQrError('No QR code found in this slip.')
      }
    } catch (e: any) {
      setQrError('QR scan failed: ' + (e?.message ?? 'unknown'))
    } finally {
      setQrScanning(false)
      setQrDone(true)
    }
  }, [qrDone, qrScanning])

  // Trigger scan once the image blob is ready (skip PDFs — server handles those)
  useEffect(() => {
    if (blobUrl && !slipMime.includes('pdf') && !qrDone) {
      runQrScan(blobUrl)
    }
  }, [blobUrl, slipMime, qrDone, runQrScan])

  const isPdf = slipMime.includes('pdf')

  // verification badge
  const vBadgeClass =
    vStatus === 'VERIFIED' || vStatus === 'AUTO_APPROVED' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' :
    vStatus === 'DUPLICATE'                               ? 'bg-red-500/15    text-red-300    border-red-500/25'     :
    vStatus === 'PENDING_MANUAL'                          ? 'bg-amber-500/15  text-amber-300  border-amber-500/25'   :
                                                           'bg-gray-500/15   text-gray-400   border-gray-500/20'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 'min(700px, 97vw)',
          background: '#0b0c18',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.7)',
          animation: 'drawerIn 0.2s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* ════════════════════════════════════════════════════════════
            HEADER
            ════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 px-5 py-4 border-b border-white/7"
          style={{ background: 'rgba(11,12,24,0.98)' }}>

          {/* Row 1: avatar + buyer + close */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-base font-black text-primary-300 shrink-0 mt-0.5">
              {(buyer?.name?.[0] ?? 'G').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-snug truncate">{buyer?.name ?? 'Guest'}</p>
              {Boolean(buyer?.phone) && <p className="text-xs text-gray-400 font-mono">{String(buyer?.phone)}</p>}
              {Boolean(buyer?.email) && <p className="text-xs text-gray-500 truncate">{String(buyer?.email)}</p>}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/8 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: amount · status · verification · approve / reject */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div className="flex items-baseline gap-1.5 mr-1">
              <span className="text-xl font-black text-emerald-400 tabular-nums">{fmt$(expectedAmt)}</span>
              {detectedAmount != null && (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md border ${
                  amountMatch
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/15    text-red-400    border-red-500/20'
                }`}>
                  {amountMatch ? '✓' : '✗'} detected {fmt$(detectedAmount)}
                </span>
              )}
            </div>
            <StatusBadge status={payment.status as string} />
           
            {provider && provider !== 'UNKNOWN' && (
              <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/8">{provider}</span>
            )}
            {txnRef && (
              <span className="text-xs font-mono text-gray-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/8 truncate max-w-[160px]">{txnRef}</span>
            )}
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

        {/* ════════════════════════════════════════════════════════════
            TAB BAR
            ════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 flex border-b border-white/7 px-5 pt-0.5"
          style={{ background: 'rgba(11,12,24,0.95)' }}>

          <button onClick={() => setTab('slip')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              tab === 'slip' ? 'border-primary-500 text-primary-300' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            <FileText className="w-3.5 h-3.5" />
            Slip Image
            {slipLoading && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
          </button>

          <button onClick={() => setTab('receipt')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              tab === 'receipt' ? 'border-primary-500 text-primary-300' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            <Link2 className="w-3.5 h-3.5" />
            Verify Link
            {qrScanning && !receiptUrl && (
              <Loader2 className="w-3 h-3 animate-spin ml-1 text-amber-400" />
            )}
            {receiptUrl && !qrScanning && (
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════
            CONTENT
            ════════════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-hidden relative">

          {/* ── Slip Image ──────────────────────────────────────────── */}
          {tab === 'slip' && (
            <div className="absolute inset-0 flex flex-col">
              {/* Toolbar */}
              {!isPdf && blobUrl && (
                <div className="shrink-0 flex items-center gap-1.5 px-4 py-2 border-b border-white/6"
                  style={{ background: 'rgba(255,255,255,0.015)' }}>
                  <button onClick={() => setScale(s => Math.max(0.25, +(s - 0.25).toFixed(2)))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-colors">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setScale(1)}
                    className="min-w-[46px] px-2 py-1 rounded-lg text-xs font-mono bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-colors text-center">
                    {Math.round(scale * 100)}%
                  </button>
                  <button onClick={() => setScale(s => Math.min(8, +(s + 0.25).toFixed(2)))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-colors">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setScale(1)} title="Fit"
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-colors">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex-1" />
                  <a href={blobUrl} download={`slip-${payment.id}.jpg`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600/15 border border-primary-500/20 text-primary-300 text-xs font-semibold hover:bg-primary-600/25 transition-colors">
                    <Download className="w-3 h-3" /> Download
                  </a>
                </div>
              )}
              <div className="flex-1 overflow-auto flex items-start justify-center p-4">
                {slipLoading && (
                  <div className="flex flex-col items-center gap-3 mt-16">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                    <p className="text-sm text-gray-500">Loading slip…</p>
                  </div>
                )}
                {slipError && (
                  <div className="flex flex-col items-center gap-3 mt-16">
                    <ImageOff className="w-8 h-8 text-red-400" />
                    <p className="text-sm text-red-400 font-semibold">Couldn't load slip</p>
                  </div>
                )}
                {blobUrl && !slipError && isPdf && (
                  <iframe src={blobUrl} title="slip" className="w-full h-full border-none rounded-lg" />
                )}
                {blobUrl && !slipError && !isPdf && (
                  <img src={blobUrl} alt="Payment slip" draggable={false}
                    style={{
                      maxWidth: '100%',
                      transform: `scale(${scale})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.12s ease',
                      borderRadius: 8,
                      boxShadow: '0 4px 32px rgba(0,0,0,0.55)',
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Verify Link ─────────────────────────────────────────── */}
          {tab === 'receipt' && (
            <div className="absolute inset-0 flex flex-col">

              {/* Scanning banner — shown while image QR scan is in progress */}
              {qrScanning && (
                <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/6"
                  style={{ background: 'rgba(245,158,11,0.08)' }}>
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                  <span className="text-xs text-amber-300 font-semibold">Reading QR code from slip image…</span>
                </div>
              )}

              {receiptUrl ? (
                <>
                  {/* URL bar */}
                  <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/6"
                    style={{ background: 'rgba(255,255,255,0.015)' }}>
                    {/* lock */}
                    <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {/* URL */}
                    <div className="flex-1 min-w-0 px-2.5 py-1 rounded-lg bg-white/5 border border-white/8">
                      <span className="text-xs text-gray-300 font-mono truncate select-all cursor-text block" title={receiptUrl}>
                        {receiptUrl}
                      </span>
                    </div>
                    {/* Copy */}
                    <button
                      onClick={() => { navigator.clipboard.writeText(receiptUrl); toast.success('Link copied') }}
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white/6 hover:bg-white/12 text-gray-400 hover:text-white transition-colors"
                      title="Copy">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>
                    {/* Open */}
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-600/15 border border-primary-500/20 text-primary-300 text-xs font-semibold hover:bg-primary-600/28 transition-colors">
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                  </div>

                  {/* iframe — live CBE / Telebirr receipt */}
                  <iframe key={receiptUrl} src={receiptUrl} title="Receipt verification"
                    className="flex-1 w-full border-none" style={{ background: '#fff' }}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms" />
                </>
              ) : (
                /* No URL yet */
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                  {qrScanning ? (
                    <>
                      <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
                      <p className="text-sm text-gray-400 font-semibold">Scanning QR code…</p>
                      <p className="text-xs text-gray-600">Reading the QR code from the slip image</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-gray-800/60 border border-white/8 flex items-center justify-center">
                        <Link2 className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-400">No verify link found</p>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          {isPdf
                            ? 'PDF QR codes are read by the server at upload time. This slip may not contain a QR code.'
                            : (qrError ?? 'No QR code with a URL was detected in this slip image.')}
                        </p>
                      </div>
                      {/* Retry — images only */}
                      {!isPdf && blobUrl && (
                        <button
                          onClick={() => { setQrDone(false); setQrError(null); runQrScan(blobUrl) }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/6 border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/10 transition-colors"
                        >
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

      <style>{`
        @keyframes drawerIn {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

// ─── BulkImportModal ──────────────────────────────────────────────────────────
// Lets the operator add multiple buyers directly in the browser:
//   • Pick lottery from a dropdown (loaded from API)
//   • Enter buyer rows: Name, Phone, Email (optional), Quantity
//   • Reference Code is NOT entered — the backend generates it automatically
//   • On submit → backend creates buyer + payment + assigns tickets
//   • Result table shows Reference Code + Ticket Numbers per row
function BulkImportModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  type BuyerRow = {
    id:       number
    name:     string
    phone:    string
    email:    string
    quantity: number
  }
  type ResultRow = {
    name:          string
    phone:         string
    lottery:       string
    quantity:      number
    amount:        number
    referenceCode: string
    tickets:       string
    status:        string
    notes:         string
  }

  const [rows, setRows]       = useState<BuyerRow[]>([{ id: 1, name: '', phone: '', email: '', quantity: 1 }])
  const [lotteryId, setLotteryId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]   = useState<{
    imported: number; skipped: number; errors: number
    rows: ResultRow[]
  } | null>(null)
  const nextId = useRef(2)

  // Reset when opened
  useEffect(() => {
    if (open) {
      setRows([{ id: 1, name: '', phone: '', email: '', quantity: 1 }])
      setLotteryId('')
      setResult(null)
      nextId.current = 2
    }
  }, [open])

  // Load lotteries for dropdown
  const { data: lotData, isLoading: lotsLoading } = useQuery({
    queryKey: ['bulk-import-lotteries'],
    queryFn: () =>
      lotteriesApi.list({ limit: 100, status: 'SELLING' })
        .then(r => {
          const payload = r.data?.data
          return (Array.isArray(payload?.data) ? payload.data : []) as { id: string; name: string; ticketPrice: number }[]
        }),
    enabled: open,
  })
  const lotteries = lotData ?? []
  const selectedLottery = lotteries.find(l => l.id === lotteryId)

  const addRow = () => {
    setRows(prev => [...prev, { id: nextId.current++, name: '', phone: '', email: '', quantity: 1 }])
  }

  const removeRow = (id: number) => {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  const updateRow = (id: number, field: keyof BuyerRow, value: string | number) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const isValid = lotteryId && rows.length > 0 && rows.every(r => r.name.trim() && r.phone.trim() && r.quantity >= 1)

  const handleSubmit = async () => {
    if (!isValid || !selectedLottery) return
    setSubmitting(true)
    try {
      const res  = await paymentsApi.bulkImportJson(
        lotteryId,
        rows.map(r => ({
          name:     r.name.trim(),
          phone:    r.phone.trim(),
          email:    r.email.trim() || undefined,
          quantity: r.quantity,
        })),
      )
      const data = res.data?.data ?? res.data
      setResult({
        imported: data.imported ?? 0,
        skipped:  data.skipped  ?? 0,
        errors:   data.errors   ?? 0,
        rows:     data.rows     ?? [],
      })
      onDone()
      toast.success(
        `Bulk import done — ${data.imported ?? 0} imported, ${data.skipped ?? 0} skipped, ${data.errors ?? 0} errors.`,
      )
    } catch (e: any) {
      toast.error(getErr(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const ticketPrice = Number(selectedLottery?.ticketPrice ?? 0)
  const totalQty    = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
  const totalAmt    = totalQty * ticketPrice

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full flex flex-col"
        style={{
          maxWidth: 760,
          background: '#0b0c18',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/25 flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Bulk Import Buyers</p>
              <p className="text-xs text-gray-500">
                Add multiple buyers — lottery selected from dropdown, reference codes generated automatically
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {result ? (
            /* ── Result summary ──────────────────────────────── */
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Imported',  value: result.imported, color: 'text-emerald-400', bg: 'bg-emerald-500/12 border-emerald-500/20' },
                  { label: 'Skipped',   value: result.skipped,  color: 'text-amber-400',   bg: 'bg-amber-500/12   border-amber-500/20' },
                  { label: 'Errors',    value: result.errors,   color: 'text-red-400',     bg: 'bg-red-500/12     border-red-500/20' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-4 text-center ${s.bg}`}>
                    <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Per-row results table */}
              {result.rows.length > 0 && (
                <div className="rounded-xl border border-white/8 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5 text-indigo-400" />
                    <p className="text-xs font-bold text-gray-300">Results per buyer</p>
                  </div>
                  <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                    {result.rows.map((r, i) => {
                      const sc = r.status === 'APPROVED'     ? 'text-emerald-400'
                               : r.status === 'SKIPPED'      ? 'text-amber-400'
                               : r.status === 'UNDER_REVIEW' ? 'text-purple-400'
                               :                               'text-red-400'
                      return (
                        <div key={i} className="px-4 py-2.5 grid gap-x-3 items-start text-xs"
                          style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                          <div>
                            <p className="font-semibold text-white truncate">{r.name}</p>
                            <p className="text-gray-500 truncate">{r.phone}</p>
                          </div>
                          <div>
                            {r.referenceCode
                              ? <p className="font-mono text-indigo-300 font-semibold truncate">{r.referenceCode}</p>
                              : <p className="text-gray-600 italic">—</p>}
                            {r.tickets
                              ? <p className="text-emerald-400 truncate">🎫 {r.tickets}</p>
                              : null}
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${sc}`}>{r.status}</p>
                            {Boolean(r.notes) && <p className="text-gray-500 truncate">{String(r.notes)}</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ── Lottery dropdown ──────────────────────────── */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-indigo-400" />
                  Lottery *
                </label>
                {lotsLoading ? (
                  <div className="h-10 rounded-xl bg-white/4 border border-white/8 flex items-center px-3 gap-2">
                    <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                    <span className="text-sm text-gray-500">Loading lotteries…</span>
                  </div>
                ) : lotteries.length === 0 ? (
                  <div className="h-10 rounded-xl bg-amber-500/8 border border-amber-500/20 flex items-center px-3">
                    <span className="text-sm text-amber-300">No active lotteries found. Start a lottery first.</span>
                  </div>
                ) : (
                  <select
                    value={lotteryId}
                    onChange={e => setLotteryId(e.target.value)}
                    className="w-full h-10 rounded-xl bg-white/4 border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-indigo-500/60 focus:bg-white/6 transition-colors"
                  >
                    <option value="" className="bg-gray-900">— Select a lottery —</option>
                    {lotteries.map(l => (
                      <option key={l.id} value={l.id} className="bg-gray-900">
                        {l.name} {l.ticketPrice ? `(${l.ticketPrice} ETB/ticket)` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* ── Info note ─────────────────────────────────── */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/8 border border-indigo-500/15 text-xs text-indigo-300 leading-relaxed">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-400" />
                <span>
                  <strong>Reference codes are generated automatically</strong> — do not enter them here.
                  Each buyer row will get a unique reference code and assigned ticket numbers in the result file.
                </span>
              </div>

              {/* ── Buyer rows ────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400">Buyers ({rows.length})</label>
                  {ticketPrice > 0 && totalQty > 0 && (
                    <span className="text-xs text-indigo-300 font-semibold">
                      Total: {totalQty} ticket{totalQty !== 1 ? 's' : ''} · {totalAmt.toLocaleString()} ETB
                    </span>
                  )}
                </div>

                {/* Column headers */}
                <div className="grid gap-2 text-xs font-semibold text-gray-500 px-1"
                  style={{ gridTemplateColumns: '1fr 1fr 1fr 60px 28px' }}>
                  <span>Name *</span>
                  <span>Phone *</span>
                  <span>Email</span>
                  <span className="text-center">Qty *</span>
                  <span />
                </div>

                {rows.map((r, idx) => (
                  <div
                    key={r.id}
                    className="grid gap-2 items-center"
                    style={{ gridTemplateColumns: '1fr 1fr 1fr 60px 28px' }}
                  >
                    <input
                      value={r.name}
                      onChange={e => updateRow(r.id, 'name', e.target.value)}
                      placeholder={`Buyer ${idx + 1}`}
                      className="h-9 rounded-lg bg-white/4 border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-gray-600"
                    />
                    <input
                      value={r.phone}
                      onChange={e => updateRow(r.id, 'phone', e.target.value)}
                      placeholder="+251 91 234 5678"
                      type="tel"
                      className="h-9 rounded-lg bg-white/4 border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-gray-600"
                    />
                    <input
                      value={r.email}
                      onChange={e => updateRow(r.id, 'email', e.target.value)}
                      placeholder="optional"
                      type="email"
                      className="h-9 rounded-lg bg-white/4 border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-gray-600"
                    />
                    <input
                      value={r.quantity}
                      onChange={e => updateRow(r.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                      type="number"
                      min={1}
                      max={50}
                      className="h-9 rounded-lg bg-white/4 border border-white/10 text-white text-sm px-2 text-center focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                    <button
                      onClick={() => removeRow(r.id)}
                      disabled={rows.length === 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={addRow}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-dashed border-white/15 text-gray-500 text-sm hover:border-indigo-500/40 hover:text-indigo-300 hover:bg-indigo-500/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add another buyer
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-white/8 shrink-0 flex justify-end gap-3">
          {result ? (
            <>
              <button
                onClick={() => setResult(null)}
                className="btn-secondary flex items-center gap-2"
              >
                <Users className="w-3.5 h-3.5" /> Import More
              </button>
              <button onClick={() => { onDone(); onClose() }} className="btn-primary flex items-center gap-2 px-5">
                <CheckCircle2 className="w-4 h-4" /> Done
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!isValid || submitting || !lotteryId}
                className="btn-primary flex items-center gap-2 px-5 disabled:opacity-40"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
                  : <><Upload className="w-4 h-4" /> Import {rows.length} Buyer{rows.length !== 1 ? 's' : ''}</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ImportPaymentsModal ──────────────────────────────────────────────────────
// Three-stage flow:
//   1. Select lottery from dropdown, then drop / pick a filled .xlsx file
//   2. Upload & show result summary (approved / rejected / skipped / errors)
//   3. Done
function ImportPaymentsModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  type Stage = 'pick' | 'importing' | 'result'
  const [stage, setStage]         = useState<Stage>('pick')
  const [file, setFile]           = useState<File | null>(null)
  const [drag, setDrag]           = useState(false)
  const [lotteryId, setLotteryId] = useState('')
  const [result, setResult]       = useState<{
    approved: number; rejected: number; skipped: number
    errors: { referenceCode: string; reason: string }[]
  } | null>(null)
  const inputRef                  = useRef<HTMLInputElement>(null)
  const [downloading, setDownloading] = useState(false)

  // Reset when modal opens
  useEffect(() => {
    if (open) { setStage('pick'); setFile(null); setResult(null); setLotteryId('') }
  }, [open])

  // Load lotteries for the dropdown
  const { data: lotData, isLoading: lotsLoading } = useQuery({
    queryKey: ['import-lotteries'],
    queryFn: () =>
      lotteriesApi.list({ limit: 100 }).then(r => {
        const payload = r.data?.data
        return (Array.isArray(payload?.data) ? payload.data : []) as { id: string; name: string }[]
      }),
    enabled: open,
  })
  const lotteries       = lotData ?? []
  const selectedLottery = lotteries.find(l => l.id === lotteryId)

  const acceptFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please select an Excel file (.xlsx or .xls)')
      return
    }
    setFile(f)
  }

  const downloadTemplate = async () => {
    setDownloading(true)
    try {
      const res    = await paymentsApi.importTemplate(lotteryId || undefined)
      const blob   = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url    = URL.createObjectURL(blob)
      const a      = document.createElement('a')
      a.href       = url
      const suffix = selectedLottery ? `-${selectedLottery.name.replace(/\s+/g, '-')}` : ''
      a.download   = `payments-import${suffix}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Template downloaded — fill the Status column and re-upload')
    } catch (e: any) {
      toast.error(getErr(e))
    } finally {
      setDownloading(false)
    }
  }

  const runImport = async () => {
    if (!file) return
    setStage('importing')
    try {
      const res  = await paymentsApi.import(file)
      const data = res.data?.data ?? res.data
      if (!data || typeof data !== 'object') {
        toast.error('Unexpected response from server')
        setStage('pick')
        return
      }
      setResult(data)
      setStage('result')
    } catch (e: any) {
      toast.error(getErr(e))
      setStage('pick')
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div
          className="relative w-full flex flex-col"
          style={{
            maxWidth: 580,
            background: '#0b0c18',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
            maxHeight: '90vh',
            overflow: 'hidden',
          }}
        >
          {/* ── Header ───────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/25 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Import Payments via Excel</p>
                <p className="text-xs text-gray-500">
                  {selectedLottery
                    ? <>Lottery: <span className="text-emerald-400 font-semibold">{selectedLottery.name}</span></>
                    : 'Select a lottery, download the template, fill Status, re-upload'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/8 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Stage: pick */}
            {stage === 'pick' && (
              <>
                {/* Lottery dropdown + Download button — side by side */}
                <div className="flex gap-3 items-end">
                  {/* Left: lottery select */}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                      Select Lottery
                      <span className="text-gray-600 font-normal">(optional)</span>
                    </label>
                    {lotsLoading ? (
                      <div className="h-10 rounded-xl bg-white/4 border border-white/8 flex items-center px-3 gap-2">
                        <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                        <span className="text-sm text-gray-500">Loading…</span>
                      </div>
                    ) : (
                      <select
                        value={lotteryId}
                        onChange={e => setLotteryId(e.target.value)}
                        className="w-full h-10 rounded-xl bg-white/4 border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-emerald-500/60 transition-colors"
                      >
                        <option value="" className="bg-gray-900">— All lotteries —</option>
                        {lotteries.map(l => (
                          <option key={l.id} value={l.id} className="bg-gray-900">{l.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Right: download button */}
                  <button
                    onClick={downloadTemplate}
                    disabled={downloading}
                    className="h-10 shrink-0 flex items-center gap-2 px-4 rounded-xl bg-primary-600/15 border border-primary-500/25 text-primary-300 text-sm font-semibold hover:bg-primary-600/25 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {downloading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
                      : <><Download className="w-4 h-4" /> Download Template</>}
                  </button>
                </div>

                {/* How it works */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { n: '1', label: 'Select lottery',    desc: 'Filter pending payments to one lottery (optional)', color: 'text-emerald-400', bg: 'bg-emerald-600/15' },
                    { n: '2', label: 'Download template', desc: 'Pre-filled with buyer names & phones — no ref code or lottery column', color: 'text-primary-400', bg: 'bg-primary-600/15' },
                    { n: '3', label: 'Set APPROVED & upload', desc: 'Only rows marked APPROVED are processed', color: 'text-amber-400', bg: 'bg-amber-600/15' },
                  ].map(s => (
                    <div key={s.n} className="rounded-xl bg-white/4 border border-white/8 p-3 text-center space-y-1.5">
                      <div className={`w-7 h-7 rounded-full ${s.bg} ${s.color} text-xs font-black flex items-center justify-center mx-auto`}>{s.n}</div>
                      <p className={`text-xs font-semibold ${s.color}`}>{s.label}</p>
                      <p className="text-xs text-gray-500 leading-snug">{s.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDrag(true) }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f) }}
                  onClick={() => inputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 flex flex-col items-center gap-3 transition-all ${
                    drag ? 'border-emerald-500 bg-emerald-500/8 scale-[1.01]' :
                    file ? 'border-emerald-500/40 bg-emerald-500/5' :
                           'border-white/15 hover:border-primary-500/50 hover:bg-white/3'
                  }`}
                >
                  <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f) }} />
                  {file ? (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB · click to change</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-white/6 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white">Drop your filled template here</p>
                        <p className="text-xs text-gray-500 mt-0.5">or click to browse · .xlsx / .xls</p>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Stage: importing */}
            {stage === 'importing' && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full border-2 border-primary-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Processing import…</p>
                  <p className="text-xs text-gray-500 mt-1">Matching payments by phone and applying status changes</p>
                </div>
              </div>
            )}

            {/* Stage: result */}
            {stage === 'result' && result && (
              <>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { label: 'Approved', value: result.approved, color: 'text-emerald-400', bg: 'bg-emerald-500/12 border-emerald-500/20' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-5 text-center ${s.bg}`}>
                      <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-sm text-gray-400 mt-1 font-semibold">{s.label}</p>
                    </div>
                  ))}
                </div>

                {result.errors.length > 0 && (
                  <div className="rounded-xl bg-red-500/8 border border-red-500/20 overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-500/15">
                      <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-xs font-bold text-red-300">
                        {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} could not be processed
                      </p>
                    </div>
                    <div className="divide-y divide-red-500/10 max-h-48 overflow-y-auto">
                      {result.errors.map((e, i) => (
                        <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                          <span className="font-mono text-xs text-red-300 font-semibold shrink-0 mt-px">
                            {e.referenceCode.length > 18 ? e.referenceCode.slice(0, 18) + '…' : e.referenceCode}
                          </span>
                          <span className="text-xs text-gray-400">{e.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.errors.length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-300 font-semibold">
                      {result.approved + result.rejected === 0
                        ? 'No rows were approved — all rows had Status = PENDING. Change rows to APPROVED and re-upload.'
                        : 'All rows processed without errors'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Footer ───────────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-white/8 shrink-0 flex justify-end gap-3">
            {stage === 'pick' && (
              <>
                <button onClick={onClose} className="btn-secondary">Cancel</button>
                <button
                  onClick={runImport}
                  disabled={!file}
                  className="btn-primary flex items-center gap-2 px-5 disabled:opacity-40"
                >
                  <Upload className="w-4 h-4" /> Import &amp; Apply
                </button>
              </>
            )}
            {stage === 'importing' && (
              <button disabled className="btn-secondary opacity-50 cursor-not-allowed">Please wait…</button>
            )}
            {stage === 'result' && (
              <>
                <button
                  onClick={() => { setStage('pick'); setFile(null); setResult(null) }}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" /> Import Another
                </button>
                <button onClick={() => { onDone(); onClose() }} className="btn-primary flex items-center gap-2 px-5">
                  <CheckCircle2 className="w-4 h-4" /> Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}


/* ────────────────────────────────────────────────────────
   Main Payments Page
   ──────────────────────────────────────────────────────── */
export function ClientPayments() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const staffAuth = useStaffAuth()
  const isStaff = staffAuth.isAuth && staffAuth.user?.role === 'staff'
  const [search, setSearch] = useState('')

  // ── WebSocket live updates ─────────────────────────────────────────────────
  const [liveCount, setLiveCount] = useState(0)

  usePaymentEvents(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['client-payments'] })
      setLiveCount(n => n + 1)
    }, [qc]),
    useCallback((n: SocketNotification) => {
      if (n.type === 'success') toast.success(n.title + ': ' + n.message, { duration: 6000 })
      else if (n.type === 'error') toast.error(n.title + ': ' + n.message)
      else toast.info(n.message)
    }, []),
  )
  const [statusFilter, setStatusFilter] = useState('')
  const [lotteryFilter, setLotteryFilter] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [rejectId, setRejectId] = useState('')
  const [reason, setReason] = useState('')
  const [viewPayment, setViewPayment] = useState<PayRow | null>(null)
  const [drawerPayment, setDrawerPayment] = useState<PayRow | null>(null)
  const [deleteId, setDeleteId] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [hardDeleteId, setHardDeleteId] = useState('')
  const [staffEditPayment, setStaffEditPayment] = useState<PayRow | null>(null)
  const [showImport, setShowImport]           = useState(false)
  const [showBulkImport, setShowBulkImport]   = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['client-payments', page, search, statusFilter, lotteryFilter, includeDeleted],
    queryFn: () => paymentsApi.list({
      page,
      limit: 20,
      ...(search        ? { search }              : {}),
      ...(statusFilter  ? { status: statusFilter } : {}),
      ...(lotteryFilter ? { lotteryId: lotteryFilter } : {}),
      ...(includeDeleted ? { includeDeleted: 'true' } : {}),
    }).then(r => r.data?.data),
    refetchInterval: 60_000,
  })

  // Fetch lotteries for the filter dropdown — only when authenticated
  const { data: lotData } = useQuery({
    queryKey: ['client-lotteries-simple'],
    queryFn: () => lotteriesApi.list({ limit: 100 }).then(r => {
      const payload = r.data?.data
      return (Array.isArray(payload?.data) ? payload.data : []) as { id: string; name: string }[]
    }),
    enabled: Boolean(getActiveToken()),
  })
  const lotteryOptions = lotData ?? []

  const rows = (data?.data ?? []) as PayRow[]
  const meta = data?.meta

  // Filter locally by status/search (lotteryId is sent server-side)
  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      String(r.referenceCode ?? '').toLowerCase().includes(q) ||
      String((r.buyer as Record<string,string> | null)?.name ?? '').toLowerCase().includes(q) ||
      String((r.buyer as Record<string,string> | null)?.email ?? '').toLowerCase().includes(q)
    const matchStatus = !statusFilter || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const approveMut = useMutation({
    mutationFn: (id: string) => paymentsApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-payments'] })
      toast.success('Payment approved — tickets assigned!')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      paymentsApi.reject(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-payments'] })
      toast.success('Payment rejected and tickets released')
      setRejectId(''); setReason('')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const softDeleteMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      paymentsApi.softDelete(id, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-payments'] })
      toast.success('Payment deleted')
      setDeleteId(''); setDeleteReason('')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const restoreMut = useMutation({
    mutationFn: (id: string) => paymentsApi.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-payments'] })
      toast.success('Payment restored')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const reviewMut = useMutation({
    mutationFn: (id: string) => paymentsApi.review(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-payments'] })
      toast.success('Payment moved to Under Review')
      setStaffEditPayment(null)
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const hardDeleteMut = useMutation({
    mutationFn: (id: string) => paymentsApi.hardDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-payments'] })
      toast.success('Payment permanently deleted')
      setHardDeleteId('')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const pending  = rows.filter(r => ['SUBMITTED','UNDER_REVIEW'].includes(r.status as string)).length
  const approved = rows.filter(r => r.status === 'APPROVED').length
  const totalRev = rows.filter(r => r.status === 'APPROVED').reduce((s, r) => s + Number(r.amount ?? 0), 0)

  const canAct = (s: string) => ['SUBMITTED','UNDER_REVIEW'].includes(s)
  const hasSlip = (r: PayRow) => (r.slips as unknown[] | undefined)?.length ?? 0 > 0

  const cols: Column<PayRow>[] = [
    {
      key: 'ref', header: 'Ref',
      cell: (r) => {
        const code = r.referenceCode as string
        const short = code.slice(0, 2) + '**' + code.slice(-2)
        const isDeleted = !!r.deletedAt
        return (
          <div style={{ opacity: isDeleted ? 0.45 : 1 }}>
            <button
              onClick={() => { navigator.clipboard.writeText(code); toast.success('Copied!') }}
              className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary-300 tracking-wider hover:text-white transition-colors group"
              title={code}
            >
              <span className={isDeleted ? 'line-through' : ''}>{short}</span>
              <svg className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            {isDeleted && (
              <p className="text-xs text-red-400/70 mt-0.5 truncate max-w-[80px]" title={r.deleteReason as string}>
                {r.deleteReason as string}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'buyer', header: 'Buyer',
      cell: (r) => {
        const b = r.buyer as Record<string, string> | null
        return (
          <div>
            <p className="text-sm font-semibold text-white">{b?.name ?? 'Guest'}</p>
            {b?.phone && (
              <p className="text-xs text-gray-300 font-mono">{b.phone}</p>
            )}
            <p className="text-xs text-gray-400">{b?.email ?? '—'}</p>
          </div>
        )
      },
    },
    {
      key: 'lottery', header: 'Lottery',
      cell: (r) => (
        <span className="text-sm text-gray-300">
          {(r.lottery as Record<string,string> | null)?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'amount', header: 'Amount',
      cell: (r) => (
        <span className="font-bold text-emerald-400 text-sm">{fmt$(Number(r.amount ?? 0))}</span>
      ),
    },
    {
      key: 'status', header: 'Status',
      cell: (r) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={r.status as string} />
            {canAct(r.status as string) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Needs review" />
            )}
          </div>
          {r.status === 'INITIATED' && (
            <span className="text-xs text-red-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block shrink-0" />
              No slip uploaded
            </span>
          )}
          {Boolean(r.deletedAt) && (
            <span className="text-xs text-red-400 font-medium flex items-center gap-1">
              <Trash2 className="w-3 h-3 shrink-0" />
              Deleted
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'date', header: 'Date',
      cell: (r) => <span className="text-xs text-gray-400">{fmtDate(r.createdAt as string)}</span>,
    },
    {
      key: 'actions', header: 'Actions',
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          {hasSlip(r) ? (
            <button
              onClick={() => setDrawerPayment(r)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 text-xs font-semibold transition-colors border border-blue-500/20"
              title="View slip"
            >
              <Eye className="w-5 h-5" /> Slip
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-600 px-1">
              <ImageOff className="w-3.5 h-3.5" /> No slip
            </span>
          )}
          
          {['INITIATED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(r.status as string) && !isStaff && !Boolean(r.deletedAt) && (
            <button
              onClick={() => setStaffEditPayment(r)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition-colors border border-indigo-500/20"
              title="Update payment status"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {['INITIATED', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED'].includes(r.status as string) && isStaff && (
            <button
              onClick={() => setStaffEditPayment(r)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition-colors border border-indigo-500/20"
              title="Move to Under Review or Approve"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {/* Soft delete — not available on APPROVED payments */}
          {r.status !== 'APPROVED' && !Boolean(r.deletedAt) && (
            <button
              onClick={() => setDeleteId(r.id as string)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/10 hover:bg-red-600/25 text-red-400 text-xs font-semibold transition-colors border border-red-500/15"
              title="Delete this payment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Restore — only when soft-deleted */}
          {Boolean(r.deletedAt) && (
            <button
              onClick={() => restoreMut.mutate(r.id as string)}
              disabled={restoreMut.isPending}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold transition-colors border border-emerald-500/20"
              title="Restore this payment"
            >
              {restoreMut.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ArchiveRestore className="w-3.5 h-3.5" />}
              Restore
            </button>
          )}
          {Boolean(r.deletedAt) && (
            <button
              onClick={() => setHardDeleteId(r.id as string)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-700/20 hover:bg-red-700/40 text-red-300 text-xs font-semibold transition-colors border border-red-600/25"
              title="Delete permanently — cannot be undone"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Purge
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'actor', header: 'Done By',
      cell: (r) => {
        const approvedByStaff  = r.approvedByStaff  as Record<string, string> | null
        const rejectedByStaff  = r.rejectedByStaff  as Record<string, string> | null
        const approvedByClient = r.approvedByClient as Record<string, string> | null
        const rejectedByClient = r.rejectedByClient as Record<string, string> | null

        if (approvedByStaff) return (
          <div><span className="text-xs font-semibold text-emerald-400">Approved</span><div className="text-xs text-gray-300">{approvedByStaff.name}</div></div>
        )
        if (rejectedByStaff) return (
          <div><span className="text-xs font-semibold text-red-400">Rejected</span><div className="text-xs text-gray-300">{rejectedByStaff.name}</div></div>
        )
        if (approvedByClient) return (
          <div><span className="text-xs font-semibold text-blue-400">By Operator</span><div className="text-xs text-gray-300">{approvedByClient.businessName || approvedByClient.name}</div></div>
        )
        if (rejectedByClient) return (
          <div><span className="text-xs font-semibold text-blue-400">By Operator</span><div className="text-xs text-gray-300">{rejectedByClient.businessName || rejectedByClient.name}</div></div>
        )
        return <span className="text-xs text-gray-600">—</span>
      },
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="text-sm text-gray-400">Review buyer payment slips and approve ticket assignments</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Wifi className="w-3.5 h-3.5" />
              Live · {liveCount} update{liveCount !== 1 ? 's' : ''}
            </div>
          )}
          {pending > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-300 text-sm font-semibold animate-pulse">
              <Clock className="w-4 h-4" />
              {pending} payment{pending !== 1 ? 's' : ''} awaiting review
            </div>
          )}
          {/* Import buttons */}
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/15 border border-emerald-500/25 text-emerald-300 text-sm font-semibold hover:bg-emerald-600/25 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/15 border border-indigo-500/25 text-indigo-300 text-sm font-semibold hover:bg-indigo-600/25 transition-colors"
          >
            <Users className="w-4 h-4" />
            Bulk Import Buyers
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pending Review" value={pending} icon={Clock}
          iconBg="bg-amber-500/20" iconColor="text-amber-400" />
        <StatCard title="Approved" value={approved} icon={CheckCircle2}
          iconBg="bg-emerald-500/20" iconColor="text-emerald-400" />
        <StatCard title="Total Revenue" value={fmt$(totalRev)} icon={DollarSign}
          iconBg="bg-primary-500/20" iconColor="text-primary-400" />
        <StatCard title="Total Payments" value={meta?.total ?? rows.length}
          icon={FileText} iconBg="bg-purple-500/20" iconColor="text-purple-400" />
      </div>

      {/* Table */}
      <div className="glass-card p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-dark pl-9 h-9" placeholder="Search by reference, buyer…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select
            className="input-dark h-9 w-44"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {['INITIATED','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','REFUNDED'].map(s => (
              <option key={s} value={s} className="bg-gray-800">{s}</option>
            ))}
          </select>
          <select
            className="input-dark h-9 w-52"
            value={lotteryFilter}
            onChange={e => { setLotteryFilter(e.target.value); setPage(1) }}
          >
            <option value="">All Lotteries</option>
            {lotteryOptions.map(l => (
              <option key={l.id} value={l.id} className="bg-gray-800">{l.name}</option>
            ))}
          </select>

          {/* Show deleted toggle */}
          <button
            onClick={() => { setIncludeDeleted(v => !v); setPage(1) }}
            className={`flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-semibold border transition-colors ${
              includeDeleted
                ? 'bg-red-600/20 border-red-500/30 text-red-300'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/8'
            }`}
            title={includeDeleted ? 'Hide deleted' : 'Show deleted'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {includeDeleted ? 'Hiding deleted' : 'Show deleted'}
          </button>
        </div>

        <DataTable
          columns={cols}
          data={filtered}
          isLoading={isLoading}
          meta={meta}
          onPage={setPage}
          emptyMsg="No payments yet"
        />
      </div>

      {/* ── SLIP DRAWER ─────────────────────────────────────── */}
      {drawerPayment && (
        <SlipDrawer
          payment={drawerPayment}
          onClose={() => setDrawerPayment(null)}
          onApprove={() => {
            approveMut.mutate(drawerPayment.id as string)
            setDrawerPayment(null)
          }}
          onReject={() => {
            setRejectId(drawerPayment.id as string)
            setDrawerPayment(null)
          }}
          approving={approveMut.isPending}
        />
      )}

      {/* ── REJECT MODAL ──────────────────────────────────────── */}
      <Modal
        open={!!rejectId}
        onClose={() => { setRejectId(''); setReason('') }}
        title="Reject Payment"
        description="The buyer will be notified. Tickets will be released back to available."
        size="sm"
      >
        <div className="space-y-4">
          <Textarea
            label="Reason for rejection *"
            placeholder="e.g. Amount transferred was incorrect, slip unclear, wrong reference code…"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              className="btn-secondary"
              onClick={() => { setRejectId(''); setReason('') }}
            >
              Cancel
            </button>
            <button
              className="btn-danger flex items-center gap-2"
              disabled={!reason.trim() || rejectMut.isPending}
              onClick={() => rejectMut.mutate({ id: rejectId, reason })}
            >
              {rejectMut.isPending ? <Spinner /> : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── SOFT DELETE MODAL ─────────────────────────────────── */}
      <Modal
        open={!!deleteId}
        onClose={() => { setDeleteId(''); setDeleteReason('') }}
        title="Delete Payment"
        description="This is a soft delete — the payment can be restored later. Approved payments cannot be deleted."
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <Trash2 className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300 leading-relaxed">
              The payment will be hidden from the list but preserved in the database. You can restore it at any time using the Restore button.
            </p>
          </div>
          <Textarea
            label="Reason for deletion *"
            placeholder="e.g. Duplicate entry, test payment, buyer requested cancellation…"
            rows={3}
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              className="btn-secondary"
              onClick={() => { setDeleteId(''); setDeleteReason('') }}
            >
              Cancel
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/35 text-red-300 text-sm font-semibold transition-colors border border-red-500/25"
              disabled={!deleteReason.trim() || softDeleteMut.isPending}
              style={{ opacity: !deleteReason.trim() || softDeleteMut.isPending ? 0.5 : 1 }}
              onClick={() => softDeleteMut.mutate({ id: deleteId, reason: deleteReason })}
            >
              {softDeleteMut.isPending ? <Spinner /> : <Trash2 className="w-4 h-4" />}
              Confirm Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* ── STAFF EDIT MODAL ─────────────────────────────────── */}
      <Modal
        open={!!staffEditPayment}
        onClose={() => setStaffEditPayment(null)}
        title="Update Payment Status"
        description="Choose an action for this payment."
        size="sm"
      >
        <div className="space-y-3">
          {/* Under Review — only if INITIATED, SUBMITTED, or REJECTED */}
          {['INITIATED', 'SUBMITTED', 'REJECTED'].includes(staffEditPayment?.status as string) && (
            <button
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-blue-600/12 hover:bg-blue-600/25 border border-blue-500/20 transition-colors text-left"
              disabled={reviewMut.isPending || approveMut.isPending}
              onClick={() => reviewMut.mutate(staffEditPayment!.id as string)}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-300">Mark as Under Review</p>
                <p className="text-xs text-gray-500 mt-0.5">Flag this payment for manual review</p>
              </div>
              {reviewMut.isPending && <Loader2 className="w-4 h-4 text-blue-400 animate-spin ml-auto" />}
            </button>
          )}

          {/* Approve — only if INITIATED, SUBMITTED, UNDER_REVIEW, or REJECTED */}
          {['INITIATED', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED'].includes(staffEditPayment?.status as string) && (
            <button
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-emerald-600/12 hover:bg-emerald-600/25 border border-emerald-500/20 transition-colors text-left"
              disabled={approveMut.isPending || reviewMut.isPending}
              onClick={() => { approveMut.mutate(staffEditPayment!.id as string); setStaffEditPayment(null) }}
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-300">Approve Payment</p>
                <p className="text-xs text-gray-500 mt-0.5">Confirm payment and assign tickets to the buyer</p>
              </div>
              {approveMut.isPending && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin ml-auto" />}
            </button>
          )}

          {/* Reject — only if INITIATED, SUBMITTED, UNDER_REVIEW, or APPROVED */}
          {['INITIATED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(staffEditPayment?.status as string) && (
            <button
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-600/12 hover:bg-red-600/25 border border-red-500/20 transition-colors text-left"
              disabled={reviewMut.isPending || approveMut.isPending}
              onClick={() => {
                setRejectId(staffEditPayment?.id as string ?? '')
                setStaffEditPayment(null)
              }}
            >
              <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-300">Reject Payment</p>
                <p className="text-xs text-gray-500 mt-0.5">Release tickets back to the pool and notify the buyer</p>
              </div>
            </button>
          )}

          <button
            className="btn-secondary w-full mt-1"
            onClick={() => setStaffEditPayment(null)}
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* ── HARD DELETE MODAL ─────────────────────────────────── */}
      <Modal
        open={!!hardDeleteId}
        onClose={() => setHardDeleteId('')}
        title="Delete Permanently"
        description="This cannot be undone. The payment record will be removed from the database forever."
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/12 border border-red-500/25">
            <Trash2 className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-300 leading-relaxed">
              <strong>This action is irreversible.</strong> The payment, its slip records, and all related data will be permanently removed. Tickets linked to this payment will be detached but not deleted.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setHardDeleteId('')}>Cancel</button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-700/30 hover:bg-red-700/50 text-red-200 text-sm font-bold transition-colors border border-red-600/40"
              disabled={hardDeleteMut.isPending}
              style={{ opacity: hardDeleteMut.isPending ? 0.5 : 1 }}
              onClick={() => hardDeleteMut.mutate(hardDeleteId)}
            >
              {hardDeleteMut.isPending ? <Spinner /> : <Trash2 className="w-4 h-4" />}
              Yes, Delete Permanently
            </button>
          </div>
        </div>
      </Modal>

      {/* ── PAYMENT DETAIL MODAL ──────────────────────────────── */}
      <Modal
        open={!!viewPayment}
        onClose={() => setViewPayment(null)}
        title="Payment Details"
        size="md"
      >
        {viewPayment && (
          <div className="space-y-3">
            {/* Buyer header */}
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-11 h-11 rounded-2xl bg-primary-600/25 flex items-center justify-center text-lg font-black text-primary-300 shrink-0">
                {((viewPayment.buyer as Record<string,string> | null)?.name?.[0] ?? 'G').toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">
                  {(viewPayment.buyer as Record<string,string> | null)?.name ?? 'Guest'}
                </p>
                <p className="text-xs text-gray-300 font-mono">
                  {(viewPayment.buyer as Record<string,string> | null)?.phone ?? ''}
                </p>
                <p className="text-xs text-gray-400">
                  {(viewPayment.buyer as Record<string,string> | null)?.email ?? '—'}
                </p>
              </div>
              <StatusBadge status={viewPayment.status as string} />
            </div>

            {/* Details grid */}
            {[
              ['Reference', viewPayment.referenceCode, true],
              ['Amount', fmt$(Number(viewPayment.amount ?? 0)), false],
              ['Lottery', (viewPayment.lottery as Record<string,string> | null)?.name ?? '—', false],
              ['Submitted', fmtDateTime(viewPayment.createdAt as string), false],
              ...(viewPayment.approvedAt ? [['Approved', fmtDateTime(viewPayment.approvedAt as string), false]] : []),
              ...(viewPayment.approvedByStaff ? [['Approved By', (viewPayment.approvedByStaff as Record<string,string>)?.name ?? '—', false]] : []),
              ...(viewPayment.rejectedByStaff ? [['Rejected By', (viewPayment.rejectedByStaff as Record<string,string>)?.name ?? '—', false]] : []),
              ...(viewPayment.rejectionReason ? [['Rejection Reason', viewPayment.rejectionReason as string, false]] : []),
            ].map(([k, v, mono]) => (
              <div key={String(k)} className="flex items-center justify-between p-3 rounded-xl bg-white/4 text-sm">
                <span className="text-gray-400">{String(k)}</span>
                <span className={`font-semibold text-white ${mono ? 'font-mono tracking-wider' : ''}`}>
                  {String(v)}
                </span>
              </div>
            ))}

            {/* Slip preview & actions */}
            <div className="flex gap-2 pt-1">
              {hasSlip(viewPayment) && (
                <button
                  onClick={() => { setViewPayment(null); setDrawerPayment(viewPayment) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 text-sm font-semibold transition-colors border border-blue-500/20"
                >
                  <Eye className="w-4 h-4" /> View Payment Slip
                </button>
              )}
              {canAct(viewPayment.status as string) && (
                <>
                  <button
                    onClick={() => { approveMut.mutate(viewPayment.id as string); setViewPayment(null) }}
                    disabled={approveMut.isPending}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5"
                  >
                    {approveMut.isPending ? <Spinner /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => { setViewPayment(null); setRejectId(viewPayment.id as string) }}
                    className="btn-danger flex items-center gap-2 py-2.5 px-4"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              )}
              {['INITIATED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(viewPayment.status as string) && (
                <button
                  onClick={() => { setViewPayment(null); setStaffEditPayment(viewPayment) }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 text-sm font-semibold transition-colors border border-indigo-500/20"
                >
                  <RotateCcw className="w-4 h-4" /> Edit Status
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── IMPORT EXCEL MODAL ────────────────────────────────── */}
      <ImportPaymentsModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onDone={() => qc.invalidateQueries({ queryKey: ['client-payments'] })}
      />

      {/* ── BULK IMPORT BUYERS MODAL ──────────────────────────── */}
      <BulkImportModal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onDone={() => qc.invalidateQueries({ queryKey: ['client-payments'] })}
      />
    </div>
  )
}
