import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft, Zap, XCircle, Trophy, Shield,
  CheckCircle2, Ticket, DollarSign, Archive, Pencil,
  Plus, Trash2, FileSpreadsheet, Download, Loader2,
  UserCheck, Hash, ChevronDown, ChevronUp,
} from 'lucide-react'
import { lotteriesApi, drawsApi, reportsApi, getErr } from '../../lib/api'
import { fmt$, fmtDate } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'

// ── Manual winner entry modal ──────────────────────────────────────────────
interface ManualEntry {
  prizeId: string
  ticketNumber: string
  winnerName: string
}

function ManualDrawModal({
  lotteryId,
  prizes,
  ticketStart,
  ticketEnd,
  onClose,
  onSuccess,
}: {
  lotteryId: string
  prizes: Record<string, unknown>[]
  ticketStart: number
  ticketEnd: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [entries, setEntries] = useState<ManualEntry[]>(
    prizes.map(p => ({ prizeId: p.id as string, ticketNumber: '', winnerName: '' }))
  )
  const [submitting, setSubmitting] = useState(false)

  const updateEntry = (i: number, field: keyof ManualEntry, val: string) =>
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e))

  const handleSubmit = async () => {
    const invalid = entries.filter(e => !e.ticketNumber.trim() || !e.winnerName.trim())
    if (invalid.length) { toast.error('Fill in all ticket numbers and winner names'); return }
    setSubmitting(true)
    try {
      await drawsApi.manual(lotteryId, entries)
      toast.success('Winners recorded! Review and publish results.')
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(getErr(e))
    } finally {
      setSubmitting(false)
    }
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Ticket range info */}
      <div style={{
        padding: '12px 16px', borderRadius: 12,
        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Hash style={{ width: 16, height: 16, color: '#818cf8', flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', margin: 0 }}>
            Valid ticket range: <span style={{ fontFamily: 'monospace', color: '#e2e4ea' }}>{ticketStart} – {ticketEnd}</span>
          </p>
          <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>
            Enter the ticket numbers drawn in your physical lottery
          </p>
        </div>
      </div>

      {/* Winner rows */}
      {entries.map((entry, i) => {
        const prize = prizes[i]
        return (
          <div key={entry.prizeId} style={{
            padding: '16px', borderRadius: 14,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {/* Prize header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{medals[i] ?? '🏅'}</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
                  {String(prize.title ?? '')}
                </p>
                <p style={{ fontSize: 11.5, color: '#34d399', margin: '2px 0 0', fontWeight: 600 }}>
                  {fmt$(Number(prize.prizeValue ?? 0))}
                  {Number(prize.quantity ?? 1) > 1 && (
                    <span style={{ color: '#6b7280', fontWeight: 400 }}> × {Number(prize.quantity)}</span>
                  )}
                </p>
              </div>
            </div>
            {/* Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                  Ticket Number *
                </label>
                <div style={{ position: 'relative' }}>
                  <Ticket style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#6b7280' }} />
                  <input
                    className="input-dark"
                    style={{ paddingLeft: 32, fontFamily: 'monospace', fontSize: 14, fontWeight: 700 }}
                    placeholder={`e.g. ${ticketStart}`}
                    value={entry.ticketNumber}
                    onChange={e => updateEntry(i, 'ticketNumber', e.target.value.trim())}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>
                  Winner Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <UserCheck style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#6b7280' }} />
                  <input
                    className="input-dark"
                    style={{ paddingLeft: 32 }}
                    placeholder="Full name"
                    value={entry.winnerName}
                    onChange={e => updateEntry(i, 'winnerName', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
        <button className="btn-secondary" style={{ flex: 1, height: 44 }} onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn-primary"
          style={{ flex: 2, height: 44, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting
            ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Saving…</>
            : <><Trophy style={{ width: 16, height: 16 }} /> Record Winners</>}
        </button>
      </div>
    </div>
  )
}

// ── Excel export modal ─────────────────────────────────────────────────────
function ExportModal({ lotteryId, lotteryName, onClose }: {
  lotteryId: string
  lotteryName: string
  onClose: () => void
}) {
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)

  const sheets = [
    { icon: '📋', label: 'Summary',     desc: 'Lottery info, ticket range, revenue, buyer count' },
    { icon: '🎫', label: 'All Tickets', desc: 'Every ticket with buyer name, email, phone & payment ref' },
    { icon: '👥', label: 'Buyers',      desc: 'Each buyer: full name, email, phone, all ticket numbers, total paid' },
    { icon: '🏆', label: 'Winners',     desc: 'Prize winners with ticket numbers' },
    { icon: '🎁', label: 'Prizes',      desc: 'Prize list with values and quantities' },
  ]

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await reportsApi.exportExcel(lotteryId)
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${lotteryName.replace(/\s+/g, '-').toLowerCase()}-report.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setDone(true)
      toast.success('Excel report downloaded!')
    } catch (e) {
      toast.error(getErr(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header visual */}
      <div style={{
        borderRadius: 16, padding: '20px',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.08) 100%)',
        border: '1px solid rgba(52,211,153,0.25)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))',
          border: '1px solid rgba(52,211,153,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
        }}>
          📊
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Excel Report</p>
          <p style={{ fontSize: 12.5, color: '#6b7280', margin: '3px 0 0', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lotteryName}
          </p>
        </div>
      </div>

      {/* Sheets included */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>
          Sheets included
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {sheets.map(s => (
            <div key={s.label} style={{
              padding: '10px 12px', borderRadius: 12,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e4ea', margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Download button */}
      {done ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '14px', borderRadius: 14,
          background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)',
          color: '#34d399', fontSize: 14, fontWeight: 700,
        }}>
          <CheckCircle2 style={{ width: 18, height: 18 }} /> Downloaded successfully!
        </div>
      ) : (
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-primary"
          style={{ height: 50, fontSize: 15, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          {exporting
            ? <><Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> Generating…</>
            : <><Download style={{ width: 18, height: 18 }} /> Download Excel (.xlsx)</>}
        </button>
      )}

      <button className="btn-secondary" style={{ height: 40 }} onClick={onClose}>
        Close
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export function ClientLotteryDetail() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [verifyOpen, setVerifyOpen]     = useState(false)
  const [manualOpen, setManualOpen]     = useState(false)
  const [exportOpen, setExportOpen]     = useState(false)

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: lotRaw, isLoading } = useQuery({
    queryKey: ['lot', id],
    queryFn: () => lotteriesApi.get(id!).then(r => r.data?.data ?? r.data),
    enabled: Boolean(id),
  })

  const { data: statsRaw } = useQuery({
    queryKey: ['lot-stats', id],
    queryFn: () => lotteriesApi.stats(id!).then(r => r.data?.data ?? r.data),
    enabled: Boolean(id),
  })

  const { data: drawRaw } = useQuery({
    queryKey: ['draw', id],
    queryFn: () => drawsApi.results(id!).then(r => r.data?.data ?? r.data),
    enabled: ['DRAWING', 'COMPLETED'].includes(String(lotRaw?.status ?? '')),
  })

  const { data: verRaw, refetch: refetchVerify } = useQuery({
    queryKey: ['verify', id],
    queryFn: () => drawsApi.verify(id!).then(r => r.data?.data ?? r.data),
    enabled: false,
  })

  const lot    = lotRaw    as Record<string, unknown> | null | undefined
  const stats  = statsRaw  as Record<string, unknown> | null | undefined
  const draw   = drawRaw   as Record<string, unknown> | null | undefined
  const verify = verRaw    as Record<string, unknown> | null | undefined

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['lot', id] })

  const publishMut = useMutation({
    mutationFn: () => lotteriesApi.publish(id!),
    onSuccess: () => { invalidate(); toast.success('Lottery published!') },
    onError: (e) => toast.error(getErr(e)),
  })
  const closeMut = useMutation({
    mutationFn: () => lotteriesApi.close(id!),
    onSuccess: () => { invalidate(); toast.success('Sales closed') },
    onError: (e) => toast.error(getErr(e)),
  })
  const drawMut = useMutation({
    mutationFn: () => drawsApi.execute(id!),
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ['draw', id] }); toast.success('Draw executed!') },
    onError: (e) => toast.error(getErr(e)),
  })
  const pubResMut = useMutation({
    mutationFn: () => drawsApi.publish(id!),
    onSuccess: () => { invalidate(); toast.success('Results published!') },
    onError: (e) => toast.error(getErr(e)),
  })
  const archiveMut = useMutation({
    mutationFn: () => lotteriesApi.archive(id!),
    onSuccess: () => { invalidate(); toast.success('Archived') },
    onError: (e) => toast.error(getErr(e)),
  })

  // ── Loading / not found ────────────────────────────────────────────────────
  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Spinner className="w-10 h-10" />
    </div>
  )
  if (!lot) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>Lottery not found.</p>
      <Link to="/client/lotteries" className="btn-secondary">← Back to lotteries</Link>
    </div>
  )

  // ── Derived values ─────────────────────────────────────────────────────────
  const s           = String(lot.status ?? '')
  const prizes      = (lot.prizes ?? []) as Record<string, unknown>[]
  const tickets     = (stats as Record<string, Record<string, unknown>> | null)?.tickets ?? {}
  const revenue     = Number((stats as Record<string, unknown> | null)?.revenue ?? 0)
  const winners     = (draw?.winners ?? []) as Record<string, unknown>[]
  const canEdit     = ['DRAFT', 'PUBLISHED', 'SELLING'].includes(s)
  const ticketStart = Number(lot.ticketStart ?? 1)
  const ticketEnd   = Number(lot.ticketEnd ?? ticketStart + Number(lot.totalTickets ?? 0) - 1)
  const isManual    = (draw as Record<string,unknown> | null)?.draw
    ? String(((draw as Record<string,unknown>)?.draw as Record<string,unknown>)?.drawMethod ?? '') === 'MANUAL'
    : false

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }}>
        <Link to="/client/lotteries">
          <button className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="page-title">{String(lot.name ?? '')}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusBadge status={s} />

          {canEdit && (
            <Link to={`/client/lotteries/${id}/edit`}>
              <button className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
                <Pencil className="w-4 h-4" /> Edit
              </button>
            </Link>
          )}

          {/* Export button — always available */}
          <button
            onClick={() => setExportOpen(true)}
            className="btn-secondary flex items-center gap-2 text-sm px-4 py-2"
            style={{ borderColor: 'rgba(52,211,153,0.3)', color: '#34d399' }}
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>

          {s === 'DRAFT' && (
            <button onClick={() => publishMut.mutate()} disabled={publishMut.isPending}
              className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
              {publishMut.isPending ? <Spinner /> : <><Zap className="w-4 h-4" /> Publish</>}
            </button>
          )}
          {['PUBLISHED', 'SELLING'].includes(s) && (
            <button onClick={() => closeMut.mutate()} disabled={closeMut.isPending}
              className="btn-danger flex items-center gap-2 text-sm px-4 py-2">
              {closeMut.isPending ? <Spinner /> : <><XCircle className="w-4 h-4" /> Close Sales</>}
            </button>
          )}
          {s === 'CLOSED' && (
            <>
              <button onClick={() => drawMut.mutate()} disabled={drawMut.isPending}
                className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
                {drawMut.isPending ? <Spinner /> : <><Zap className="w-4 h-4" /> Auto Draw</>}
              </button>
              <button onClick={() => setManualOpen(true)}
                className="btn-secondary flex items-center gap-2 text-sm px-4 py-2"
                style={{ borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24' }}>
                <Trophy className="w-4 h-4" /> Manual Winners
              </button>
            </>
          )}
          {s === 'DRAWING' && (
            <button onClick={() => pubResMut.mutate()} disabled={pubResMut.isPending}
              className="btn-primary text-sm px-4 py-2">
              {pubResMut.isPending ? <Spinner /> : 'Publish Results'}
            </button>
          )}
          {s === 'COMPLETED' && (
            <button onClick={() => archiveMut.mutate()} disabled={archiveMut.isPending}
              className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
              {archiveMut.isPending ? <Spinner /> : <><Archive className="w-4 h-4" /> Archive</>}
            </button>
          )}
          {['DRAWING', 'COMPLETED'].includes(s) && (
            <button onClick={() => { setVerifyOpen(true); refetchVerify() }}
              className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
              <Shield className="w-4 h-4" /> Verify Draw
            </button>
          )}
        </div>
      </div>

      {/* ── Ticket Range Badge ── */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 10,
        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
      }}>
        <Hash style={{ width: 14, height: 14, color: '#818cf8' }} />
        <span style={{ fontSize: 12.5, color: '#9ca3af' }}>Ticket range:</span>
        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#e2e4ea' }}>
          {ticketStart} – {ticketEnd}
        </span>
        <span style={{ fontSize: 11.5, color: '#6b7280' }}>
          ({Number(lot.totalTickets ?? 0).toLocaleString()} tickets)
        </span>
      </div>

      {/* ── Stats + Details ── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Ticket Stats */}
        <div className="lg:col-span-2 glass-card p-6 space-y-4">
          <h2 className="section-title">Ticket Statistics</h2>
          <div className="grid grid-cols-3 gap-4">
            {([
              ['Available',       String(tickets.available      ?? '—'), 'text-blue-400'],
              ['Pending Payment', String(tickets.pendingPayment ?? '—'), 'text-amber-400'],
              ['Sold',            String(tickets.sold           ?? '—'), 'text-emerald-400'],
            ] as [string, string, string][]).map(([label, value, color]) => (
              <div key={String(label)} style={{
                borderRadius: 16, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', padding: '16px', textAlign: 'center',
              }}>
                <p className={`text-3xl font-black ${String(color)}`}>{String(value)}</p>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{String(label)}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {Number(lot.totalTickets ?? 0) > 0 && (() => {
            const sold  = Number(tickets.sold  ?? 0)
            const total = Number(lot.totalTickets ?? 1)
            const pct   = Math.round((sold / total) * 100)
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, color: '#9ca3af' }}>
                    {sold.toLocaleString()} / {total.toLocaleString()} sold
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: pct >= 80 ? '#f87171' : '#818cf8' }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: pct >= 80 ? 'linear-gradient(90deg,#f87171,#ef4444)' : 'linear-gradient(90deg,#818cf8,#6366f1)', transition: 'width 0.4s' }} />
                </div>
              </div>
            )
          })()}

          {/* Revenue */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 16,
            borderRadius: 14, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
          }}>
            <DollarSign style={{ width: 24, height: 24, color: '#34d399' }} />
            <div>
              <p style={{ fontSize: 11.5, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total Revenue
              </p>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0 }}>
                {fmt$(revenue)}
              </p>
            </div>
          </div>
        </div>

        {/* Details panel */}
        <div className="glass-card p-6 space-y-0">
          <h2 className="section-title mb-3">Details</h2>
          {[
            ['Ticket Price',  fmt$(Number(lot.ticketPrice ?? 0))],
            ['Total Tickets', Number(lot.totalTickets ?? 0).toLocaleString()],
            ['Ticket Range',  `${ticketStart} – ${ticketEnd}`],
            ['Sale Start',    lot.saleStartDate ? fmtDate(String(lot.saleStartDate)) : '—'],
            ['Sale End',      lot.saleEndDate   ? fmtDate(String(lot.saleEndDate))   : '—'],
            ['Draw Date',     lot.drawDate      ? fmtDate(String(lot.drawDate))      : '—'],
            ['Visibility',    String(lot.visibility ?? '—')],
          ].map(([k, v]) => (
            <div key={String(k)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 13.5, padding: '10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ color: '#6b7280' }}>{String(k)}</span>
              <span style={{ fontWeight: 600, color: k === 'Ticket Range' ? '#818cf8' : '#e2e4ea', fontFamily: k === 'Ticket Range' ? 'monospace' : undefined }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Prizes ── */}
      {prizes.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="section-title mb-4">Prizes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {prizes.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0', borderBottom: i < prizes.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{['🥇', '🥈', '🥉'][i] ?? '🏅'}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e4ea', margin: 0 }}>
                      {String(p.title ?? '')}
                    </p>
                    {Boolean(p.description) && (
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{String(p.description)}</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>×{Number(p.quantity ?? 1)}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#34d399' }}>
                    {fmt$(Number(p.prizeValue ?? 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Winners ── */}
      {winners.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" /> Winners
            {isManual && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', padding: '2px 8px', borderRadius: 99 }}>
                Manual Entry
              </span>
            )}
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {winners.map((w, i) => {
              const prize        = w.prize  as Record<string, unknown> | null
              const ticket       = w.ticket as Record<string, unknown> | null
              const buyerName    = String(
                w.buyerName ??
                (w.winner as Record<string, unknown> | null)?.name ??
                w.guestName ?? 'Winner'
              )
              const ticketNumber = String(ticket?.ticketNumber ?? w.ticketNumber ?? '—')
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 14,
                  borderRadius: 14, background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{['🥇', '🥈', '🥉'][i] ?? '🏅'}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e4ea', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {buyerName}
                    </p>
                    <p style={{ fontSize: 12, color: '#818cf8', margin: '2px 0 0', fontFamily: 'monospace', fontWeight: 700 }}>
                      #{ticketNumber}
                    </p>
                    {prize?.title != null && (
                      <p style={{ fontSize: 12, color: '#fbbf24', margin: '2px 0 0' }}>
                        {String(prize.title)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── T&C ── */}
      {Boolean(lot.termsConditions) && (
        <div className="glass-card p-6">
          <h2 className="section-title mb-3">Terms &amp; Conditions</h2>
          <p style={{ fontSize: 13.5, color: '#9ca3af', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
            {String(lot.termsConditions)}
          </p>
        </div>
      )}

      {/* ── Manual Winners Modal ── */}
      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Record Manual Winners" size="md">
        <ManualDrawModal
          lotteryId={id!}
          prizes={prizes}
          ticketStart={ticketStart}
          ticketEnd={ticketEnd}
          onClose={() => setManualOpen(false)}
          onSuccess={() => {
            invalidate()
            qc.invalidateQueries({ queryKey: ['draw', id] })
          }}
        />
      </Modal>

      {/* ── Excel Export Modal ── */}
      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export Lottery Report" size="sm">
        <ExportModal
          lotteryId={id!}
          lotteryName={String(lot.name ?? '')}
          onClose={() => setExportOpen(false)}
        />
      </Modal>

      {/* ── Verify Draw Modal ── */}
      <Modal open={verifyOpen} onClose={() => setVerifyOpen(false)} title="Draw Integrity Verification" size="md">
        {!verify ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spinner className="w-8 h-8" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: 20, borderRadius: 14,
              background: verify.verified ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
              border: `2px solid ${verify.verified ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              <CheckCircle2 style={{ width: 36, height: 36, flexShrink: 0, color: verify.verified ? '#34d399' : '#f87171' }} />
              <div>
                <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: verify.verified ? '#34d399' : '#f87171' }}>
                  {verify.verified ? 'Verified ✓' : 'Failed ✗'}
                </p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0' }}>
                  {verify.verified ? 'Hashes match — draw is authentic' : 'Hash mismatch — draw may be tampered'}
                </p>
              </div>
            </div>
            {[
              ['Algorithm',    verify.algorithm],
              ['Draw Time',    verify.drawnAt ? fmtDate(String(verify.drawnAt)) : '—'],
              ['Stored Hash',  verify.storedHash],
              ['Computed Hash',verify.computedHash],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ borderRadius: 10, background: 'rgba(255,255,255,0.04)', padding: '10px 14px' }}>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{String(k)}</p>
                <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#e2e4ea', margin: 0, wordBreak: 'break-all' }}>{String(v ?? '—')}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
