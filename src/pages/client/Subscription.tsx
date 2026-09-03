import { useRef, useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CheckCircle2, Package, AlertCircle, Upload,
  Clock, Eye, RefreshCw, ArrowRight, Ticket,
  Copy, Loader2, Landmark,
} from 'lucide-react'
import { plansApi, publicApi, api as apiClient, getErr } from '../../lib/api'
import { fmt$, fmtDate } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import { useSubscriptionEvents } from '../../hooks/useSocket'
import type { SocketNotification } from '../../hooks/useSocket'
import { Spinner } from '../../components/ui/Spinner'

// ── Constants ──────────────────────────────────────────────────────────────
const ALLOWED_SLIP_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SLIP_SIZE = 5 * 1024 * 1024 // 5 MB

// ── Types ──────────────────────────────────────────────────────────────────
interface BankAccount {
  id: string
  accountName: string
  accountNumber: string
  isActive: boolean
  bank: { id: string; name: string }
}

// ── Inline slip upload section ─────────────────────────────────────────────
function SlipUploadSection({
  subId, amount, banks, banksLoading, onSuccess,
}: {
  subId: string
  amount: number
  banks: BankAccount[]
  banksLoading: boolean
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      if (!ALLOWED_SLIP_TYPES.includes(f.type)) {
        toast.error('Invalid file type. Please upload a JPG, PNG, or PDF.')
      } else if (f.size > MAX_SLIP_SIZE) {
        toast.error('File is too large. Maximum size is 5 MB.')
      } else {
        setFile(f)
      }
    }
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!file) { toast.error('Select a payment slip file'); return }
    if (!ALLOWED_SLIP_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPG, PNG, or PDF.')
      return
    }
    if (file.size > MAX_SLIP_SIZE) {
      toast.error('File is too large. Maximum size is 5 MB.')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await apiClient.post(`/plans/my-subscriptions/${subId}/submit-slip`, fd)
      toast.success('Payment slip submitted! Admin will verify shortly.')
      onSuccess()
    } catch (e) {
      toast.error(getErr(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Row 1: Complete Payment + Transfer To ───────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Card 1 — Complete Payment */}
        <div style={{
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(5,150,105,0.18) 0%, rgba(16,185,129,0.08) 100%)',
          border: '1px solid rgba(52,211,153,0.25)',
          padding: '18px 16px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
            Complete Payment
          </p>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {fmt$(amount)}
          </p>
          <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Transfer exactly this amount</p>
        </div>

        {/* Card 2 — Transfer To */}
        <div style={{
          borderRadius: 16,
          background: 'rgba(99,102,241,0.07)',
          border: '1px solid rgba(99,102,241,0.2)',
          padding: '18px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
          overflow: 'hidden',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
            Transfer To
          </p>
          {banksLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 12 }}>
              <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Loading…
            </div>
          ) : banks.length === 0 ? (
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Contact admin for bank details</p>
          ) : (
            banks.slice(0, 1).map(b => (
              <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Landmark style={{ width: 12, height: 12, color: '#818cf8', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.bank.name}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.accountName}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#e2e4ea', letterSpacing: '0.04em' }}>
                    {b.accountNumber}
                  </span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(b.accountNumber); toast.success('Copied!') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 2, display: 'flex', flexShrink: 0 }}
                  >
                    <Copy style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                {banks.length > 1 && (
                  <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>+{banks.length - 1} more account{banks.length > 2 ? 's' : ''}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Row 2: Your Payment Receipt ─────────────────────── */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          borderRadius: 16,
          background: file ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.02)',
          border: `2px dashed ${file ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.12)'}`,
          padding: '28px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
          position: 'relative',
        }}
        onMouseEnter={e => { if (!file) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.4)' }}
        onMouseLeave={e => { if (!file) (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          style={{ display: 'none' }}
          onChange={pickFile}
        />

        {file ? (
          /* ── File selected state ── */
          <>
            {preview ? (
              <img src={preview} alt="preview" style={{ maxHeight: 100, maxWidth: '100%', borderRadius: 12, objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload style={{ width: 26, height: 26, color: '#34d399' }} />
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#34d399', margin: 0 }}>✓ {file.name}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>{(file.size / 1024).toFixed(1)} KB · tap to change</p>
            </div>
          </>
        ) : (
          /* ── Empty state ── */
          <>
            {/* Glow orb */}
            <div style={{
              position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 120, height: 120, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(99,102,241,0.2)',
            }}>
              <Upload style={{ width: 26, height: 26, color: '#818cf8' }} />
            </div>
            <div style={{ textAlign: 'center', zIndex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#f3f4f6', margin: '0 0 4px' }}>
                Your Payment Receipt *
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                JPG, PNG or PDF · max 5 MB
              </p>
            </div>
            <span style={{
              fontSize: 12, color: '#818cf8',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              padding: '5px 14px', borderRadius: 99,
              zIndex: 1,
            }}>
              📷 Camera or gallery supported
            </span>
          </>
        )}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!file || uploading}
        className="btn-primary"
        style={{ width: '100%', padding: '13px 0', fontSize: 15, gap: 8, borderRadius: 14 }}
      >
        {uploading
          ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Uploading…</>
          : <><Upload style={{ width: 16, height: 16 }} /> Submit Payment Slip</>}
      </button>
    </div>
  )
}

// ── Main Subscription Page ─────────────────────────────────────────────────
export function ClientSubscription() {
  const qc = useQueryClient()

  useSubscriptionEvents(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['my-sub'] })
    }, [qc]),
    useCallback((n: SocketNotification) => {
      if (n.type === 'success') toast.success(n.title, { description: n.message, duration: 8000 })
      else if (n.type === 'error') toast.error(n.title, { description: n.message })
      else toast.info(n.message)
    }, []),
  )

  const { data: subRes, isLoading: subLoading, refetch: refetchSub } = useQuery({
    queryKey: ['my-sub'],
    queryFn: () => plansApi.myActive().then(r => r.data?.data),
    refetchInterval: 30_000,
  })

  const { data: plansRes, isLoading: plansLoading } = useQuery({
    queryKey: ['public-plans'],
    queryFn: () => plansApi.list().then(r => r.data?.data),
  })

  const { data: banksRes, isLoading: banksLoading } = useQuery({
    queryKey: ['platform-banks'],
    queryFn: () => publicApi.bankAccounts().then(r => {
      const d = r.data?.data ?? r.data ?? []
      return (Array.isArray(d) ? d : []) as BankAccount[]
    }),
  })

  const sub = subRes ?? null
  const subStatus: string = (sub as Record<string, unknown>)?.status as string ?? ''
  const plans = (Array.isArray(plansRes) ? plansRes : (plansRes as Record<string,unknown>)?.data ?? []) as Record<string, unknown>[]
  const banks: BankAccount[] = banksRes ?? []

  const showPlans = !sub || ['EXPIRED', 'CANCELLED'].includes(subStatus)
  const isActive = subStatus === 'ACTIVE'
  const needsSlip = ['PENDING', 'AWAITING_PAYMENT'].includes(subStatus)
  const underReview = subStatus === 'UNDER_REVIEW'

  const cancelMut = useMutation({
    mutationFn: (id: string) => plansApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-sub'] }); toast.success('Subscription cancelled') },
    onError: (e) => toast.error(getErr(e)),
  })

  const subMut = useMutation({
    mutationFn: (d: { planId: string; billingCycle: 'MONTHLY' | 'YEARLY' }) => plansApi.subscribe(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-sub'] }); toast.success('Plan selected! Upload your payment slip to activate.') },
    onError: (e) => toast.error(getErr(e)),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-400" /> Subscription
          </h1>
          <p className="text-sm text-gray-400">Manage your plan to start creating lotteries</p>
        </div>
        {sub && (
          <button onClick={() => refetchSub()} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        )}
      </div>

      {/* Loading */}
      {subLoading && <div className="flex justify-center py-12"><Spinner className="w-8 h-8" /></div>}

      {/* Current subscription card */}
      {!subLoading && sub && !showPlans && (
        <div className={`glass-card p-6 border ${
          isActive    ? 'border-emerald-500/25 bg-emerald-500/5' :
          needsSlip   ? 'border-amber-500/25 bg-amber-500/5' :
          underReview ? 'border-purple-500/25 bg-purple-500/5' :
          'border-white/10'
        }`}>
          {/* Status row */}
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                isActive    ? 'bg-emerald-500/20' :
                needsSlip   ? 'bg-amber-500/20' :
                underReview ? 'bg-purple-500/20' : 'bg-white/10'
              }`}>
                {isActive    ? <CheckCircle2 className="w-7 h-7 text-emerald-400" /> :
                 needsSlip   ? <Clock className="w-7 h-7 text-amber-400" /> :
                 underReview ? <Eye className="w-7 h-7 text-purple-400" /> :
                               <AlertCircle className="w-7 h-7 text-gray-400" />}
              </div>
              <div>
                <p className="text-xl font-bold text-white">{(sub.plan as Record<string, string>)?.name ?? 'Plan'}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {isActive    ? 'Active — you can create lotteries' :
                   needsSlip   ? 'Transfer the amount below, then upload your receipt' :
                   underReview ? 'Slip received — admin is verifying' :
                   'Processing…'}
                </p>
              </div>
            </div>
            <StatusBadge status={subStatus} />
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              ['Price',      fmt$(Number(sub.price ?? 0))],
              ['Billing',    sub.billingCycle],
              ['Lotteries',  `${(sub.plan as Record<string, unknown>)?.maxLotteriesPerCycle ?? '—'}/cycle`],
              ['Expires',    sub.expiresAt ? fmtDate(sub.expiresAt as string) : 'On approval'],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl bg-white/5 border border-white/8 p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{String(k)}</p>
                <p className="font-bold text-white text-sm">{String(v)}</p>
              </div>
            ))}
          </div>

          {/* Step tracker */}
          {!isActive && (
            <div style={{
              marginBottom: 20, paddingTop: 20,
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', margin: '0 0 20px' }}>
                Activation Steps
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 0 }}>
                {[
                  { label: 'Subscribe',    icon: '✦', done: true,         active: false },
                  { label: 'Upload Slip',  icon: '↑', done: underReview,  active: needsSlip },
                  { label: 'Admin Review', icon: '◎', done: false,        active: underReview },
                  { label: 'Active',       icon: '🎉', done: false,       active: false },
                ].map((s, i, arr) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
                    {/* Step bubble + label */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 80 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: s.done ? 14 : 13,
                        fontWeight: 800,
                        transition: 'all 0.2s',
                        background: s.done
                          ? 'rgba(52,211,153,0.2)'
                          : s.active
                            ? 'rgba(251,191,36,0.15)'
                            : 'rgba(255,255,255,0.04)',
                        border: s.done
                          ? '2px solid rgba(52,211,153,0.6)'
                          : s.active
                            ? '2px solid rgba(251,191,36,0.5)'
                            : '2px solid rgba(255,255,255,0.1)',
                        color: s.done ? '#34d399' : s.active ? '#fbbf24' : '#4b5563',
                        boxShadow: s.active ? '0 0 14px rgba(251,191,36,0.2)' : s.done ? '0 0 12px rgba(52,211,153,0.15)' : 'none',
                      }}>
                        {s.done ? '✓' : s.icon}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, textAlign: 'center', lineHeight: 1.3,
                        color: s.done ? '#34d399' : s.active ? '#fbbf24' : '#4b5563',
                      }}>
                        {s.label}
                      </span>
                    </div>
                    {/* Connector line */}
                    {i < arr.length - 1 && (
                      <div style={{
                        width: 40, height: 2, marginBottom: 24, flexShrink: 0,
                        background: s.done
                          ? 'linear-gradient(90deg, rgba(52,211,153,0.6), rgba(52,211,153,0.2))'
                          : 'rgba(255,255,255,0.07)',
                        borderRadius: 99,
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline payment section — shown when slip is needed */}
          {needsSlip && (
            <div style={{
              marginTop: 4,
              padding: '20px',
              borderRadius: 18,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <SlipUploadSection
                subId={sub.id as string}
                amount={Number(sub.price ?? 0)}
                banks={banks}
                banksLoading={banksLoading}
                onSuccess={() => { qc.invalidateQueries({ queryKey: ['my-sub'] }); refetchSub() }}
              />
            </div>
          )}

          {/* Under review notice */}
          {underReview && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 text-sm mt-4">
              <Eye className="w-4 h-4 shrink-0" /> Slip submitted — awaiting admin approval
            </div>
          )}

          {/* Active actions */}
          {isActive && (
            <div className="flex flex-wrap gap-3 mt-2">
              <a href="/client/lotteries/new"
                className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
                <Ticket className="w-4 h-4" /> Create a Lottery <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={() => { if (confirm('Cancel subscription?')) cancelMut.mutate(sub.id as string) }}
                disabled={cancelMut.isPending}
                className="btn-danger text-sm flex items-center gap-2"
              >
                {cancelMut.isPending ? <Spinner /> : 'Cancel Subscription'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* No subscription notice */}
      {!subLoading && (!sub || showPlans) && (
        <div className="glass-card p-6 border border-dashed border-white/15 text-center">
          <AlertCircle className="w-10 h-10 text-gray-500 mx-auto mb-2" />
          <p className="font-semibold text-gray-200">
            {sub && ['EXPIRED', 'CANCELLED'].includes(subStatus)
              ? `Subscription ${subStatus.toLowerCase()} — choose a new plan below`
              : 'No subscription yet — choose a plan to get started'}
          </p>
        </div>
      )}

      {/* Plans grid */}
      {showPlans && (
        <div>
          <h2 className="section-title mb-5">Available Plans</h2>
          {plansLoading ? (
            <div className="flex justify-center py-10"><Spinner className="w-8 h-8" /></div>
          ) : plans.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">No plans available. Contact the admin.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-5">
              {plans.map((plan, i) => (
                <div key={plan.id as string}
                  className={`glass-card p-6 flex flex-col transition-all duration-200 hover:-translate-y-1 ${
                    i === 1 ? 'ring-1 ring-primary-500/40 shadow-xl shadow-primary-900/20' : ''
                  }`}>
                  {i === 1 && (
                    <span className="self-start badge bg-primary-600/30 text-primary-300 border border-primary-500/30 mb-3 text-xs">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name as string}</h3>
                  <p className="text-sm text-gray-400 mb-4">{plan.description as string}</p>
                  <div className="mb-5">
                    <span className="text-3xl font-black text-white">{fmt$(Number(plan.monthlyPrice))}</span>
                    <span className="text-gray-400 text-sm">/mo</span>
                    <p className="text-xs text-gray-500 mt-0.5">or {fmt$(Number(plan.yearlyPrice))}/year</p>
                  </div>
                  <ul className="space-y-2 text-sm mb-6 flex-1">
                    {[
                      `${plan.maxLotteriesPerCycle} lotteries per billing cycle`,
                      `Up to ${Number(plan.maxTicketsPerLottery).toLocaleString()} tickets/lottery`,
                      `${plan.storageQuotaGb}GB file storage`,
                      plan.hasReporting && 'Advanced analytics & reports',
                      plan.hasApiAccess && 'API access',
                      `${plan.supportLevel} support`,
                    ].filter(Boolean).map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2 text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        {f as string}
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button
                      onClick={() => subMut.mutate({ planId: plan.id as string, billingCycle: 'MONTHLY' })}
                      disabled={subMut.isPending}
                      className="btn-secondary text-sm py-2.5"
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => subMut.mutate({ planId: plan.id as string, billingCycle: 'YEARLY' })}
                      disabled={subMut.isPending}
                      className="btn-primary text-sm py-2.5 flex items-center justify-center gap-1"
                    >
                      {subMut.isPending ? <Spinner className="w-3 h-3" /> : null} Yearly
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
