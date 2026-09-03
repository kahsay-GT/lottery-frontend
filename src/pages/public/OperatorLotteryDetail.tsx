/**
 * /:username/lotteries/:slug  — operator-scoped lottery detail + purchase flow
 * 4-step flow: Prizes → Details → Payment → Done
 */
import { useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Trophy, Ticket, Upload, CheckCircle2, Copy,
  ArrowLeft, ArrowRight, FileText, Phone, User, Hash,
  Banknote, AlertCircle, ExternalLink, Gift, Zap,
} from 'lucide-react'
import { publicApi, ticketsApi, paymentsApi, drawsApi, clientsApi } from '../../lib/api'
import { fmt$, fmtDate, daysLeft, uid } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'
import { StatusBadge } from '../../components/ui/Badge'
import { PublicNav } from '../../components/layout/PublicNav'
import { useLang } from '../../context/LangContext'
import { DetailSlider, type SliderImage } from '../../components/ui/ImageSlider'

type Step = 'prizes' | 'info' | 'upload' | 'done'

function Icon({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, lineHeight: 0 }}>{children}</span>
}

// ─── Step bar ─────────────────────────────────────────────────────────────────
function StepBar({ step, onBack }: { step: Step; onBack?: () => void }) {
  const { t } = useLang()
  const steps: { key: Step; label: string }[] = [
    { key: 'prizes', label: t('lotteryDetail', 'stepPrizes') ?? 'Prizes' },
    { key: 'info',   label: t('lotteryDetail', 'stepInfo')   ?? 'Details' },
    { key: 'upload', label: t('lotteryDetail', 'stepPayment') ?? 'Payment' },
    { key: 'done',   label: t('lotteryDetail', 'stepConfirmed') ?? 'Done' },
  ]
  const current = steps.findIndex(s => s.key === step)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <div style={{ width: 36 }}>
        {onBack && (
          <button type="button" onClick={onBack}
            style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            <ArrowLeft style={{ width: 15, height: 15, display: 'block' }} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        {steps.map((s, i) => {
          const active = i === current, done = i < current
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  background: done ? '#10b981' : active ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(255,255,255,0.06)',
                  border: done ? '2px solid #10b981' : active ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.12)',
                  color: done || active ? '#fff' : '#4b5563',
                  boxShadow: active ? '0 0 14px rgba(99,102,241,0.45)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', color: active ? '#a5b4fc' : done ? '#34d399' : '#4b5563' }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 32, height: 2, margin: '0 4px', marginBottom: 18, borderRadius: 99, background: done ? '#10b981' : 'rgba(255,255,255,0.08)', transition: 'background 0.4s' }} />
              )}
            </div>
          )
        })}
      </div>
      <div style={{ width: 36 }} />
    </div>
  )
}

// ─── File drop zone ───────────────────────────────────────────────────────────
function FileZone({ file, onFile }: { file: File | null; onFile: (f: File) => void }) {
  const { t } = useLang()
  const [drag, setDrag] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (f) onFile(f)
  }, [onFile])
  const isImg = file?.type.startsWith('image/')
  const preview = file && isImg ? URL.createObjectURL(file) : null
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => ref.current?.click()}
      style={{
        cursor: 'pointer', borderRadius: 14,
        border: `2px dashed ${drag ? 'rgba(99,102,241,0.7)' : file ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.12)'}`,
        padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        background: drag ? 'rgba(99,102,241,0.07)' : file ? 'rgba(52,211,153,0.05)' : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s',
      }}>
      <input ref={ref} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      {file ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
          {isImg && preview
            ? <img src={preview} alt="preview" style={{ maxHeight: 130, borderRadius: 10, objectFit: 'contain', display: 'block' }} />
            : <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText style={{ width: 24, height: 24, color: '#6b7280', display: 'block' }} />
              </div>}
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{file.name}</p>
          <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>{(file.size / 1024).toFixed(1)} KB · {t('lotteryDetail', 'clickToChange')}</p>
        </div>
      ) : (
        <>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Upload style={{ width: 22, height: 22, color: '#818cf8', display: 'block' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e4ea', margin: 0 }}>{t('lotteryDetail', 'dropSlip')}</p>
          <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{t('lotteryDetail', 'orClick')}</p>
        </>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  fontSize: 10.5, fontWeight: 700, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function OperatorLotteryDetail() {
  const { t } = useLang()
  const { username, slug } = useParams<{ username: string; slug: string }>()

  const [step, setStep]             = useState<Step>('prizes')
  const [paymentId, setPaymentId]   = useState('')
  const [refCode, setRefCode]       = useState('')
  const [totalAmount, setTotalAmount] = useState(0)
  const [slipFile, setSlipFile]     = useState<File | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied]         = useState(false)

  const schema = z.object({
    buyerName:  z.string().min(2, t('lotteryDetail', 'nameRequired')),
    buyerPhone: z.string().min(6, t('lotteryDetail', 'phoneRequired')),
    quantity:   z.coerce.number().int().min(1).max(50),
  })
  type F = z.infer<typeof schema>

  const { data: lot, isLoading } = useQuery({
    queryKey: ['operator-lot', username, slug],
    queryFn: () => publicApi.lotteryByUsername(username!, slug!).then(r => r.data?.data ?? r.data),
    enabled: Boolean(username && slug),
  })
  const { data: banksRes } = useQuery({
    queryKey: ['lot-banks', lot?.clientId],
    queryFn: () => clientsApi.publicBanks(lot!.clientId as string).then(r => r.data?.data ?? r.data),
    enabled: Boolean(lot?.clientId),
  })
  const banks = (banksRes ?? []) as Array<Record<string, unknown>>

  const { data: drawData } = useQuery({
    queryKey: ['operator-lot-draw', lot?.id],
    queryFn: () => drawsApi.publicResults(lot!.id).then(r => r.data?.data),
    enabled: Boolean(lot?.id) && lot?.status === 'COMPLETED',
  })

  const { register, handleSubmit, watch, formState: { errors } } = useForm<F>({
    resolver: zodResolver(schema), defaultValues: { quantity: 1 },
  })
  const qty         = Number(watch('quantity') || 1)
  const ticketPrice = Number(lot?.ticketPrice ?? 0)
  const total       = qty * ticketPrice

  const copyRef = useCallback(() => {
    navigator.clipboard.writeText(refCode)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }, [refCode])

  const onSubmit = async (d: F) => {
    if (!lot || submitting) return
    setSubmitting(true)
    try {
      const iKey = uid()
      let resId: string
      try {
        const res = await ticketsApi.reserve({ lotteryId: lot.id, quantity: d.quantity, buyerName: d.buyerName, buyerPhone: d.buyerPhone, buyerEmail: undefined, idempotencyKey: iKey })
        resId = res.data?.data?.id ?? res.data?.id
      } catch (e: any) {
        if (e?.response?.status === 409) {
          const ex = e.response.data?.data ?? e.response.data
          resId = ex?.id ?? ex?.reservationId
          if (!resId) throw new Error(t('lotteryDetail', 'reserveError'))
        } else throw e
      }
      let pd: Record<string, unknown>
      try {
        const pay = await paymentsApi.initiate({ lotteryId: lot.id, reservationId: resId!, buyerName: d.buyerName, buyerPhone: d.buyerPhone, buyerEmail: undefined, idempotencyKey: iKey + '-pay' })
        pd = pay.data?.data ?? pay.data
      } catch (e: any) {
        if (e?.response?.status === 409) {
          pd = e.response.data?.data ?? e.response.data ?? {}
          if (!pd.id) throw new Error(t('lotteryDetail', 'reserveError'))
        } else throw e
      }
      setPaymentId(pd!.id as string)
      setRefCode(pd!.referenceCode as string)
      setTotalAmount(qty * ticketPrice)
      setStep('upload')
      toast.success(t('lotteryDetail', 'ticketsReserved'))
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? (e instanceof Error ? e.message : t('lotteryDetail', 'reserveError')))
    } finally { setSubmitting(false) }
  }

  const onUpload = async () => {
    if (!slipFile) { toast.error(t('lotteryDetail', 'selectFile')); return }
    setUploading(true)
    try {
      const res = await paymentsApi.uploadSlip(paymentId, slipFile)
      const data = res.data?.data ?? res.data
      setStep('done')
      if (data?.status === 'APPROVED') toast.success(t('lotteryDetail', 'approved'))
      else toast.success(data?.message ?? 'Payment slip uploaded!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? t('lotteryDetail', 'uploadFailed'))
    } finally { setUploading(false) }
  }

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: '#08090f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner className="w-12 h-12" />
    </div>
  )
  if (!lot) return (
    <div style={{ minHeight: '100vh', background: '#08090f', display: 'flex', flexDirection: 'column' }}>
      <PublicNav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <AlertCircle style={{ width: 56, height: 56, color: '#ef4444', margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{t('lotteryDetail', 'lotteryNotFound')}</h2>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
            <Link to={`/${username}/lotteries`} className="btn-secondary">← Back</Link>
            <Link to="/lotteries" className="btn-primary">Browse All</Link>
          </div>
        </div>
      </div>
    </div>
  )

  const prizes   = (lot.prizes ?? []) as Record<string, unknown>[]
  const sold     = Number(lot.ticketsSold ?? 0)
  const totalTix = Number(lot.totalTickets ?? 0)
  const pct      = totalTix > 0 ? Math.min(100, Math.max(sold > 0 ? 1 : 0, Math.round((sold / totalTix) * 100))) : 0
  const dl       = daysLeft(lot.drawDate as string)
  const canBuy   = ['PUBLISHED', 'SELLING'].includes(lot.status as string)
  const client   = lot.client as Record<string, unknown> | undefined

  const rawImages = (lot.images ?? []) as { id: string; url: string }[]
  const sliderImages: SliderImage[] = rawImages.length > 0
    ? rawImages
    : lot.banner ? [{ id: '__banner__', url: lot.banner as string }] : []

  const primaryBank = banks.find(b => b.isDefault) ?? banks[0]
  const bankName    = primaryBank ? ((primaryBank.bank as Record<string, string>)?.name ?? '') : ''

  const prevStep: Partial<Record<Step, Step>> = { info: 'prizes', upload: 'info' }

  return (
    <div style={{ minHeight: '100vh', background: '#08090f' }}>
      <PublicNav />

      {/* Hero */}
      <div style={{ position: 'relative', height: sliderImages.length > 0 ? 'clamp(220px,45vw,420px)' : 200, background: '#0d0e18', overflow: 'hidden' }}>
        <DetailSlider images={sliderImages} banner={lot.banner as string | null} alt={lot.name as string} />
        {sliderImages.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)', zIndex: 0 }} />
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 90, background: 'linear-gradient(to top,#08090f,transparent)', zIndex: 5, pointerEvents: 'none' }} />
        {client && (
          <Link to={`/${username}/lotteries`} style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none', backdropFilter: 'blur(8px)' }}>
            <ArrowLeft style={{ width: 13, height: 13, color: '#9ca3af', display: 'block' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#d1d5db' }}>{String(client.businessName ?? username)}</span>
          </Link>
        )}
        <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
          <StatusBadge status={lot.status as string} />
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 64px' }}>

        {/* Title + draw date */}
        <div style={{ paddingTop: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: lot.description ? 6 : 14 }}>
            <h1 style={{ fontSize: 'clamp(20px,5vw,32px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
              {lot.name as string}
            </h1>
            {lot.drawDate && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>{fmtDate(lot.drawDate as string)}</p>
                {dl > 0 && <p style={{ fontSize: 11, color: '#fb923c', margin: '2px 0 0', fontWeight: 600, whiteSpace: 'nowrap' }}>{dl}d left</p>}
              </div>
            )}
          </div>
          {lot.description && <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>{lot.description as string}</p>}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
            <span style={{ color: pct >= 80 ? '#fbbf24' : '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              {pct >= 80 && <Zap style={{ width: 11, height: 11, color: '#fbbf24', display: 'block', flexShrink: 0 }} />}
              {pct}% {t('lotteryDetail', 'ticketsSold')}
            </span>
            <span style={{ color: '#6b7280' }}>{(totalTix - sold).toLocaleString()} remaining</span>
          </div>
          <div style={{ height: 10, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, width: `${Math.max(pct > 0 ? 3 : 0, pct)}%`, background: pct >= 80 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#4f46e5,#8b5cf6)', boxShadow: pct >= 80 ? '0 0 10px rgba(245,158,11,0.4)' : '0 0 10px rgba(99,102,241,0.4)', transition: 'width 1.2s ease' }} />
          </div>
        </div>

        {/* ── Flow card ────────────────────────────────────────────────────── */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '20px 20px 0' }}>
            <StepBar step={step} onBack={prevStep[step] ? () => setStep(prevStep[step]!) : undefined} />
          </div>

          {/* ── Step 1: Prizes ───────────────────────────────────────────── */}
          {step === 'prizes' && (
            <div style={{ padding: '0 20px 24px' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon><Gift style={{ width: 19, height: 19, color: '#fbbf24' }} /></Icon>
                {t('lotteryDetail', 'prizePool')}
              </h2>

              {prizes.length > 0 ? prizes.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{['🥇', '🥈', '🥉'][i] ?? '🏅'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title as string}</p>
                    <p style={{ fontSize: 12, color: '#fde68a', margin: 0 }}>{fmt$(Number(p.prizeValue ?? 0))}</p>
                  </div>
                  {Number(p.quantity ?? 1) > 1 && <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>×{Number(p.quantity)}</span>}
                </div>
              )) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.18)', marginBottom: 8 }}>
                  <Trophy style={{ width: 26, height: 26, color: '#fbbf24', flexShrink: 0, display: 'block' }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fde68a', margin: '0 0 2px' }}>{t('lotteryDetail', 'grandPrize')}</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{t('lotteryDetail', 'revealedOnDraw')}</p>
                  </div>
                </div>
              )}

              {canBuy ? (
                <button onClick={() => setStep('info')} className="btn-primary"
                  style={{ width: '100%', height: 52, fontSize: 16, borderRadius: 14, justifyContent: 'center', marginTop: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t('lotteryDetail', 'continue')}
                    <ArrowRight style={{ width: 18, height: 18, display: 'block' }} />
                  </span>
                </button>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                  <AlertCircle style={{ width: 40, height: 40, color: '#6b7280', margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ color: '#9ca3af', fontWeight: 600, margin: 0 }}>
                    {lot.status === 'COMPLETED' ? t('lotteryDetail', 'salesEnded') : `Sales are ${lot.status as string}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Buyer details ────────────────────────────────────── */}
          {step === 'info' && (
            <div style={{ padding: '0 20px 24px' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon><Ticket style={{ width: 19, height: 19, color: '#818cf8' }} /></Icon>
                {t('lotteryDetail', 'buyTickets')}
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Name + Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="buy-grid">
                  <div>
                    <label style={labelStyle}><Icon><User style={{ width: 11, height: 11 }} /></Icon>{t('lotteryDetail', 'fullName')}</label>
                    <input className="input-dark" placeholder="John Doe" {...register('buyerName')} />
                    {errors.buyerName && <p style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>{errors.buyerName.message}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}><Icon><Phone style={{ width: 11, height: 11 }} /></Icon>{t('lotteryDetail', 'phone')}</label>
                    <input className="input-dark" type="tel" placeholder="+251 912 345 678" {...register('buyerPhone')} />
                    {errors.buyerPhone && <p style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>{errors.buyerPhone.message}</p>}
                  </div>
                </div>
                {/* Quantity */}
                <div>
                  <label style={labelStyle}><Icon><Hash style={{ width: 11, height: 11 }} /></Icon>{t('lotteryDetail', 'numTickets')}</label>
                  <input className="input-dark" type="number" min={1} max={50} {...register('quantity')} />
                  {errors.quantity && <p style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>{errors.quantity.message}</p>}
                </div>
                {/* Total */}
                <div style={{ borderRadius: 16, padding: '16px 18px', background: 'linear-gradient(135deg,rgba(79,70,229,0.18),rgba(124,58,237,0.12))', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 10, color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('lotteryDetail', 'totalToPay')}</p>
                    <p style={{ fontSize: 30, fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1 }}>{fmt$(total)}</p>
                    <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{qty} × {fmt$(ticketPrice)}</p>
                  </div>
                  <Ticket style={{ width: 44, height: 44, color: 'rgba(99,102,241,0.25)', display: 'block' }} />
                </div>
                {/* Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setStep('prizes')}
                    style={{ height: 50, padding: '0 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <ArrowLeft style={{ width: 15, height: 15, display: 'block' }} />{t('lotteryDetail', 'back')}
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary"
                    style={{ flex: 1, height: 50, fontSize: 15, borderRadius: 14, justifyContent: 'center' }}>
                    {submitting ? <Spinner /> : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {t('lotteryDetail', 'continue')} <ArrowRight style={{ width: 17, height: 17, display: 'block' }} />
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Step 3: Payment upload ───────────────────────────────────── */}
          {step === 'upload' && (
            <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon><Banknote style={{ width: 19, height: 19, color: '#34d399' }} /></Icon>
                {t('lotteryDetail', 'completePayment')}
              </h2>

              {/* Amount + Bank side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="payment-amounts">
                <div style={{ borderRadius: 14, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', padding: '14px 16px' }}>
                  <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('lotteryDetail', 'transferExactly')}</p>
                  <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0 }}>{fmt$(totalAmount)}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{qty} × {fmt$(ticketPrice)}</p>
                </div>
                {primaryBank && (
                  <div style={{ borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>{t('lotteryDetail', 'paymentDetails') ?? 'Pay to'}</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{bankName}</p>
                    <p style={{ fontSize: 13, color: '#e2e4ea', fontWeight: 600, margin: '2px 0 4px' }}>{primaryBank.accountName as string}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 14, color: '#818cf8', fontFamily: 'monospace', fontWeight: 700, margin: 0 }}>{primaryBank.accountNumber as string}</p>
                      <button onClick={() => { navigator.clipboard.writeText(primaryBank.accountNumber as string); toast.success('Copied!') }}
                        style={{ padding: '4px 8px', borderRadius: 7, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer', color: '#818cf8', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <Copy style={{ width: 11, height: 11, display: 'block' }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Slip upload */}
              <div>
                <p style={{ ...labelStyle, marginBottom: 10 }}>
                  <Icon><Upload style={{ width: 12, height: 12 }} /></Icon>
                  {t('lotteryDetail', 'uploadPaymentSlip')}
                </p>
                <FileZone file={slipFile} onFile={setSlipFile} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep('info')}
                  style={{ height: 50, padding: '0 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <ArrowLeft style={{ width: 15, height: 15, display: 'block' }} />{t('lotteryDetail', 'back')}
                </button>
                <button onClick={onUpload} disabled={uploading || !slipFile} className="btn-primary"
                  style={{ flex: 1, height: 50, fontSize: 15, borderRadius: 14, justifyContent: 'center' }}>
                  {uploading ? <Spinner /> : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 style={{ width: 17, height: 17, display: 'block' }} />{t('lotteryDetail', 'uploadConfirm')}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ─────────────────────────────────────────────── */}
          {step === 'done' && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.14),rgba(5,150,105,0.08))', borderBottom: '1px solid rgba(52,211,153,0.12)', padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: '2px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <CheckCircle2 style={{ width: 38, height: 38, color: '#34d399', display: 'block' }} />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 6px' }}>{t('lotteryDetail', 'allSet')} 🎉</h2>
                <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>{t('lotteryDetail', 'allSetSub')}</p>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Ref code */}
                <div style={{ borderRadius: 14, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', padding: '14px 16px' }}>
                  <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('lotteryDetail', 'yourRefCode')}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 'clamp(15px,4vw,21px)', fontWeight: 900, color: '#818cf8', letterSpacing: '0.06em', wordBreak: 'break-all' }}>{refCode}</span>
                    <button onClick={copyRef}
                      style={{ padding: '7px 12px', borderRadius: 10, background: copied ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', color: copied ? '#34d399' : '#9ca3af', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <Copy style={{ width: 13, height: 13, display: 'block' }} />{copied ? t('lotteryDetail', 'copiedBtn') : t('lotteryDetail', 'copyBtn')}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: '#4b5563', margin: '8px 0 0' }}>{t('lotteryDetail', 'saveCode')}</p>
                  <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle style={{ width: 13, height: 13, color: '#fbbf24', flexShrink: 0, display: 'block' }} />
                    <p style={{ fontSize: 11, color: '#fde68a', margin: 0 }}>{t('lotteryDetail', 'writeAsRef')}</p>
                  </div>
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Link to={`/track?code=${refCode}`} className="btn-primary"
                    style={{ height: 50, fontSize: 15, borderRadius: 14, justifyContent: 'center' }}>
                    <ExternalLink style={{ width: 16, height: 16, display: 'block' }} />{t('lotteryDetail', 'trackPayment')}
                  </Link>
                  <button onClick={() => { setStep('prizes'); setSlipFile(null) }} className="btn-secondary"
                    style={{ height: 46, fontSize: 14, borderRadius: 14 }}>
                    <Ticket style={{ width: 16, height: 16, display: 'block' }} />{t('lotteryDetail', 'buyMore')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Winners */}
      {lot.status === 'COMPLETED' && (drawData?.winners as unknown[])?.length > 0 && (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 48px' }}>
          <h2 style={{ fontSize: 19, fontWeight: 900, color: '#fff', textAlign: 'center', margin: '0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Trophy style={{ width: 20, height: 20, color: '#fbbf24', display: 'block' }} />
            {t('lotteryDetail', 'winners')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(drawData.winners as Record<string, unknown>[]).map((w, i) => {
              const medals = [
                { e: '🥇', color: '#fbbf24', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.18)' },
                { e: '🥈', color: '#9ca3af', bg: 'rgba(156,163,175,0.07)', border: 'rgba(156,163,175,0.18)' },
                { e: '🥉', color: '#cd7c2f', bg: 'rgba(205,124,47,0.07)', border: 'rgba(205,124,47,0.18)' },
              ]
              const m = medals[i] ?? { e: '🏅', color: '#818cf8', bg: 'rgba(99,102,241,0.07)', border: 'rgba(99,102,241,0.18)' }
              const raw = String(w.buyerName ?? w.name ?? 'Winner')
              const masked = raw.length > 2 ? raw.slice(0, 2) + '****' : raw[0] + '***'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16, background: m.bg, border: `1px solid ${m.border}` }}>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{m.e}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{masked}</p>
                    {w.ticketNumber != null && <p style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', margin: 0 }}>#{String(w.ticketNumber)}</p>}
                  </div>
                  {(() => {
                    const prize = w.prize as Record<string, unknown> | undefined
                    return prize?.title ? (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: m.color, margin: 0 }}>{String(prize.title)}</p>
                        <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{fmt$(Number(prize.prizeValue ?? 0))}</p>
                      </div>
                    ) : null
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 479px) {
          .buy-grid        { grid-template-columns: 1fr !important; }
          .payment-amounts { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
