import { useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus, Trash2, ArrowLeft, Ticket, AlertCircle, CheckCircle2,
  Clock, Package, Images, Lock, Upload,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lotteriesApi, plansApi, getErr } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Spinner } from '../../components/ui/Spinner'
import { fmt$ } from '../../lib/utils'
import { ImageManager, type SliderImage } from '../../components/ui/ImageSlider'

// ─── Zod schema ────────────────────────────────────────────────────────────
const prizeSchema = z.object({
  rank:        z.coerce.number().int().min(1),
  title:       z.string().min(1, 'Required'),
  description: z.string().optional(),
  prizeValue:  z.coerce.number().min(0),
  quantity:    z.coerce.number().int().min(1),
})

const schema = z.object({
  name:            z.string().min(3, 'At least 3 characters'),
  description:     z.string().optional(),
  type:            z.enum(['STANDARD','RAFFLE','SCRATCH_CARD','INSTANT_WIN']),
  ticketPrice:     z.coerce.number().min(0.01, 'Must be > 0'),
  totalTickets:    z.coerce.number().int().min(1, 'Min 1 ticket'),
  ticketStart:     z.coerce.number().int().min(1, 'Min 1').optional(),
  ticketEnd:       z.coerce.number().int().min(1).optional(),
  saleStartDate:   z.string().min(1, 'Required'),
  saleEndDate:     z.string().min(1, 'Required'),
  drawDate:        z.string().min(1, 'Required'),
  visibility:      z.enum(['PUBLIC','PRIVATE','UNLISTED']),
  termsConditions: z.string().optional(),
  prizes: z.array(prizeSchema).min(1, 'Add at least one prize'),
}).superRefine((d, ctx) => {
  if (d.ticketStart !== undefined && d.totalTickets) {
    const end = d.ticketEnd ?? (d.ticketStart + d.totalTickets - 1)
    if (end - d.ticketStart + 1 !== d.totalTickets) {
      ctx.addIssue({ code: 'custom', path: ['ticketEnd'], message: `Range ${d.ticketStart}–${end} must span exactly ${d.totalTickets} tickets` })
    }
  }
})

type F = z.infer<typeof schema>

// ─── Images section ─────────────────────────────────────────────────────────
// Mirrors EditLottery's ImagesSection exactly.
// When lotteryId is null the card renders in a locked/pending state.
function ImagesSection({
  lotteryId,
}: {
  lotteryId: string | null
}) {
  const [images, setImages]       = useState<SliderImage[]>([])
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (file: File) => {
    if (!lotteryId) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 10 * 1024 * 1024)   { toast.error('Image must be under 10 MB'); return }
    setUploading(true)
    try {
      const res = await lotteriesApi.uploadImage(lotteryId, file)
      const img = res.data?.data ?? res.data
      setImages(prev => [...prev, { id: img.id, url: img.url }])
      toast.success('Image uploaded!')
    } catch (e) {
      toast.error(getErr(e))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!lotteryId) return
    try {
      await lotteriesApi.deleteImage(lotteryId, imageId)
      setImages(prev => prev.filter(i => i.id !== imageId))
      toast.success('Image removed')
    } catch (e) {
      toast.error(getErr(e))
    }
  }

  // ── Locked state — shown before lottery is created ──────────────────────
  if (!lotteryId) {
    return (
      <div className="glass-card p-6 space-y-3" style={{ opacity: 0.55 }}>
        <h2 className="section-title flex items-center gap-2">
          <Images className="w-4 h-4 text-primary-400" />
          Lottery Images
          <span className="text-xs font-normal text-gray-500 ml-1">optional · up to 10 photos</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, color: '#6b7280',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 99, padding: '2px 9px', marginLeft: 4,
          }}>
            <Lock style={{ width: 10, height: 10 }} /> Unlocks after creation
          </span>
        </h2>
        <p className="text-xs text-gray-500">
          Images slide automatically on your public lottery card and detail page.
          Recommended: 1200 × 800 px, JPG or WebP.
        </p>
        {/* Placeholder grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 10, pointerEvents: 'none',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              height: 96, borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '2px dashed rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.1)' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Unlocked state — full ImageManager ──────────────────────────────────
  return (
    <div className="glass-card p-6 space-y-3" style={{
      border: '1px solid rgba(52,211,153,0.25)',
      boxShadow: '0 0 0 1px rgba(52,211,153,0.1)',
    }}>
      <h2 className="section-title flex items-center gap-2">
        <Images className="w-4 h-4 text-emerald-400" />
        Lottery Images
        <span className="text-xs font-normal text-gray-500 ml-1">optional · up to 10 · uploads immediately</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 600, color: '#34d399',
          background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)',
          borderRadius: 99, padding: '2px 9px', marginLeft: 4,
        }}>
          <CheckCircle2 style={{ width: 10, height: 10 }} /> Ready
        </span>
      </h2>
      <p className="text-xs text-gray-500">
        Images slide automatically on your public lottery card and detail page.
        Recommended: 1200 × 800 px, JPG or WebP.
      </p>
      <ImageManager
        lotteryId={lotteryId}
        images={images}
        onUpload={handleUpload}
        onDelete={handleDelete}
        uploading={uploading}
      />
    </div>
  )
}

// ─── Subscription gate banner ───────────────────────────────────────────────
function SubGate({ sub }: { sub: Record<string, unknown> | null }) {
  if (!sub) {
    return (
      <div className="glass-card p-8 border border-amber-500/30 bg-amber-500/5 text-center space-y-4">
        <AlertCircle className="w-14 h-14 text-amber-400 mx-auto" />
        <div>
          <h2 className="text-xl font-bold text-white">No Active Subscription</h2>
          <p className="text-gray-400 mt-1 text-sm">
            You need an active subscription before you can create lotteries.
          </p>
        </div>
        <Link to="/client/subscription" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
          <Package className="w-4 h-4" /> Go to Subscription
        </Link>
      </div>
    )
  }

  const status   = sub.status as string
  const planName = (sub.plan as Record<string, string> | null)?.name ?? 'Plan'

  if (status === 'PENDING') {
    return (
      <div className="glass-card p-6 border border-amber-500/30 bg-amber-500/5 space-y-3">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-400 shrink-0" />
          <div>
            <p className="font-bold text-white text-lg">Subscription Pending Approval</p>
            <p className="text-amber-300 text-sm">
              Your <strong>{planName}</strong> subscription is waiting for admin approval.
              Upload your payment slip to speed up the process.
            </p>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <Link to="/client/subscription" className="btn-primary text-sm flex items-center gap-2 px-4 py-2">
            <Package className="w-4 h-4" /> View Subscription &amp; Upload Slip
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'UNDER_REVIEW') {
    return (
      <div className="glass-card p-6 border border-purple-500/30 bg-purple-500/5 space-y-3">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-purple-400 shrink-0" />
          <div>
            <p className="font-bold text-white text-lg">Under Admin Review</p>
            <p className="text-purple-300 text-sm">
              Your payment slip has been submitted. The admin is reviewing it.
              You'll be able to create lotteries once approved — usually within 24 hours.
            </p>
          </div>
        </div>
        <Link to="/client/subscription" className="btn-secondary text-sm inline-flex items-center gap-2 px-4 py-2">
          Check Status
        </Link>
      </div>
    )
  }

  if (status === 'EXPIRED' || status === 'CANCELLED') {
    return (
      <div className="glass-card p-8 border border-red-500/30 bg-red-500/5 text-center space-y-4">
        <AlertCircle className="w-14 h-14 text-red-400 mx-auto" />
        <div>
          <h2 className="text-xl font-bold text-white">
            Subscription {status === 'EXPIRED' ? 'Expired' : 'Cancelled'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Please subscribe to a new plan to continue creating lotteries.
          </p>
        </div>
        <Link to="/client/subscription" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
          <Package className="w-4 h-4" /> Renew Subscription
        </Link>
      </div>
    )
  }

  return null // ACTIVE — show the form
}

// ─── Main page ──────────────────────────────────────────────────────────────
export function ClientNewLottery() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const imagesSectionRef = useRef<HTMLDivElement>(null)

  // createdId is set once the lottery is saved; images section unlocks immediately
  const [createdId, setCreatedId] = useState<string | null>(null)

  // Subscription check
  const { data: subRes, isLoading: subLoading } = useQuery({
    queryKey: ['my-sub'],
    queryFn: () => plansApi.myActive().then(r => r.data?.data),
  })
  const sub      = subRes ?? null
  const isActive = (sub as Record<string, unknown>)?.status === 'ACTIVE'

  const {
    register, control, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'STANDARD', visibility: 'PUBLIC',
      prizes: [{ rank: 1, title: 'First Prize', prizeValue: 0, quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'prizes' })
  const ticketPrice      = Number(watch('ticketPrice')   || 0)
  const totalTickets     = Number(watch('totalTickets')  || 0)
  const ticketStart      = Number(watch('ticketStart')   || 1)
  const ticketEndPreview = totalTickets > 0 ? ticketStart + totalTickets - 1 : null

  // Scroll to images section once lottery is created
  useEffect(() => {
    if (createdId && imagesSectionRef.current) {
      imagesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [createdId])

  const mut = useMutation({
    mutationFn: (d: F) => lotteriesApi.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['client-lotteries'] })
      const id = res.data?.data?.id ?? res.data?.id
      if (id) {
        setCreatedId(id)
        toast.success('Lottery created! Add images below, then finish.')
      } else {
        navigate('/client/lotteries')
      }
    },
    onError: (e) => {
      const msg = getErr(e)
      if (msg.toLowerCase().includes('subscription') || msg.toLowerCase().includes('plan')) {
        toast.error(msg, {
          action: { label: 'Subscription', onClick: () => navigate('/client/subscription') },
          duration: 8000,
        })
      } else {
        toast.error(msg)
      }
    },
  })

  // Plan limits info
  const plan      = sub?.plan as Record<string, unknown> | null
  const planLimits = plan ? {
    maxTickets: Number(plan.maxTicketsPerLottery ?? 0),
    minPrice:   Number(plan.minTicketPrice ?? 0),
    maxPrice:   Number(plan.maxTicketPrice ?? 0),
    quota:      Number(plan.maxLotteriesPerCycle ?? 0),
    used:       Number((sub as Record<string, unknown>)?.lotteriesUsed ?? 0),
  } : null

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/client/lotteries">
          <button className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary-400" /> Create Lottery
          </h1>
          <p className="text-sm text-gray-400">Configure and launch your lottery</p>
        </div>
      </div>

      {/* Loading */}
      {subLoading && (
        <div className="flex justify-center py-10"><Spinner className="w-8 h-8" /></div>
      )}

      {/* Subscription gate */}
      {!subLoading && !isActive && <SubGate sub={sub} />}

      {/* Plan info bar */}
      {!subLoading && isActive && planLimits && (
        <div className="glass-card p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              {(sub?.plan as Record<string, string>)?.name} Plan — Active
            </span>
            <span className="text-gray-400">Max {planLimits.maxTickets.toLocaleString()} tickets</span>
            <span className="text-gray-400">Price: {fmt$(planLimits.minPrice)} – {fmt$(planLimits.maxPrice)}</span>
            <span className="text-gray-400">
              Lotteries: {planLimits.used} / {planLimits.quota} used this cycle
            </span>
          </div>
        </div>
      )}

      {/* ── Created banner ── */}
      {createdId && (
        <div className="glass-card p-5 border border-emerald-500/25 bg-emerald-500/5 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-white">Lottery created!</p>
            <p className="text-sm text-gray-400">
              The form is now locked. Upload photos below, then click <strong className="text-white">Finish</strong>.
            </p>
          </div>
          <button
            onClick={() => navigate('/client/lotteries')}
            className="btn-primary text-sm px-5 py-2 flex items-center gap-2 shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" /> Finish
          </button>
        </div>
      )}

      {/* ── Form (locked via fieldset disabled once created) ── */}
      {!subLoading && isActive && (
        <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-5">

            {/* Basic Info + Tickets & Pricing */}
            <div className="grid grid-cols-2 gap-5 items-start">

              {/* Basic Info */}
              <div className="glass-card p-6 space-y-4" style={createdId ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                <h2 className="section-title">Basic Information</h2>
                <Input label="Lottery Name *" placeholder="Summer Jackpot 2026"
                  error={errors.name?.message} {...register('name')} />
                <Textarea label="Description" placeholder="Describe your lottery…"
                  {...register('description')} />
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Type *"
                    options={[
                      { value: 'STANDARD',     label: 'Standard' },
                      { value: 'RAFFLE',       label: 'Raffle' },
                      { value: 'SCRATCH_CARD', label: 'Scratch Card' },
                      { value: 'INSTANT_WIN',  label: 'Instant Win' },
                    ]}
                    {...register('type')} />
                  <Select label="Visibility *"
                    options={[
                      { value: 'PUBLIC',   label: 'Public' },
                      { value: 'PRIVATE',  label: 'Private' },
                      { value: 'UNLISTED', label: 'Unlisted' },
                    ]}
                    {...register('visibility')} />
                </div>
              </div>

              {/* Tickets & Pricing */}
              <div className="glass-card p-6 space-y-4" style={createdId ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
                <h2 className="section-title">Tickets &amp; Pricing</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Ticket Price *" type="number" step="0.01" min="0.01"
                    error={errors.ticketPrice?.message} {...register('ticketPrice')}
                    hint={planLimits ? `Plan range: ${fmt$(planLimits.minPrice)} – ${fmt$(planLimits.maxPrice)}` : undefined} />
                  <Input label="Total Tickets *" type="number" min="1"
                    error={errors.totalTickets?.message} {...register('totalTickets')}
                    hint={planLimits ? `Plan max: ${planLimits.maxTickets.toLocaleString()}` : undefined} />
                </div>

                {/* Ticket Number Range */}
                <div style={{ padding: '16px 18px', borderRadius: 14, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                    Ticket Number Range
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Start Number *" type="number" min="1"
                      error={errors.ticketStart?.message}
                      hint="First ticket number (e.g. 1 or 1000)"
                      {...register('ticketStart')}
                      onChange={e => {
                        const start = parseInt(e.target.value) || 1
                        register('ticketStart').onChange(e)
                        const total = Number(watch('totalTickets') || 0)
                        if (total > 0) setValue('ticketEnd', start + total - 1)
                      }}
                    />
                    <Input label="End Number" type="number" min="1"
                      error={errors.ticketEnd?.message}
                      hint={ticketEndPreview ? `Auto: ${ticketEndPreview}` : 'Auto-calculated'}
                      {...register('ticketEnd')}
                    />
                  </div>
                  {ticketEndPreview && totalTickets > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>Range preview:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#e2e4ea' }}>
                        {String(ticketStart).padStart(String(ticketEndPreview).length, '0')}
                        {' '}<span style={{ color: '#6b7280' }}>→</span>{' '}
                        {ticketEndPreview}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#34d399' }}>({totalTickets.toLocaleString()} tickets)</span>
                    </div>
                  )}
                </div>

                {/* Revenue preview */}
                {ticketPrice > 0 && totalTickets > 0 && (
                  <div className="rounded-2xl bg-gradient-to-r from-primary-900/40 to-purple-900/40 border border-primary-500/20 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Potential Revenue (if sold out)</p>
                      <p className="text-3xl font-black text-white">{fmt$(ticketPrice * totalTickets)}</p>
                      <p className="text-xs text-gray-500">{totalTickets.toLocaleString()} tickets × {fmt$(ticketPrice)}</p>
                    </div>
                    <Ticket className="w-12 h-12 text-primary-600/30" />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <Input label="Sale Start *" type="datetime-local"
                    error={errors.saleStartDate?.message} {...register('saleStartDate')} />
                  <Input label="Sale End *" type="datetime-local"
                    error={errors.saleEndDate?.message} {...register('saleEndDate')} />
                  <Input label="Draw Date *" type="datetime-local"
                    error={errors.drawDate?.message} {...register('drawDate')} />
                </div>
              </div>

            </div>{/* end two-column row */}

            {/* Prizes */}
            <div className="glass-card p-6 space-y-4" style={createdId ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
              <div className="flex items-center justify-between">
                <h2 className="section-title">Prizes</h2>
                <button type="button"
                  onClick={() => append({ rank: fields.length + 1, title: '', prizeValue: 0, quantity: 1 })}
                  className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Prize
                </button>
              </div>
              {errors.prizes?.message && (
                <p className="text-xs text-red-400">{errors.prizes.message}</p>
              )}
              {fields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-5 gap-3 p-4 rounded-2xl bg-white/4 border border-white/8">
                  <Input label="Rank" type="number" min="1" {...register(`prizes.${i}.rank`)} />
                  <Input label="Title *" placeholder="First Prize"
                    error={errors.prizes?.[i]?.title?.message} {...register(`prizes.${i}.title`)} />
                  <Input label="Description" placeholder="Optional" {...register(`prizes.${i}.description`)} />
                  <Input label="Value" type="number" step="0.01" min="0"
                    {...register(`prizes.${i}.prizeValue`)} />
                  <div className="flex items-end gap-2">
                    <Input label="Qty" type="number" min="1" {...register(`prizes.${i}.quantity`)} />
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(i)}
                        className="mb-0.5 p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

          {/* ── Images — always visible, locks/unlocks based on createdId ── */}
          <div ref={imagesSectionRef}>
            <ImagesSection lotteryId={createdId} />
          </div>

          {/* Terms */}
          <div className="glass-card p-6" style={createdId ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
            <Textarea label="Terms &amp; Conditions"
              placeholder="Enter terms and conditions for this lottery…"
              rows={4} {...register('termsConditions')} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            {createdId ? (
              <button
                type="button"
                onClick={() => navigate('/client/lotteries')}
                className="btn-primary flex items-center gap-2 px-6"
              >
                <CheckCircle2 className="w-4 h-4" /> Finish
              </button>
            ) : (
              <>
                <Link to="/client/lotteries">
                  <button type="button" className="btn-secondary">Cancel</button>
                </Link>
                <button type="submit" disabled={isSubmitting || mut.isPending}
                  className="btn-primary flex items-center gap-2 px-6">
                  {isSubmitting || mut.isPending
                    ? <Spinner />
                    : <><Plus className="w-4 h-4" /> Create Lottery</>}
                </button>
              </>
            )}
          </div>

        </form>
      )}
    </div>
  )
}
