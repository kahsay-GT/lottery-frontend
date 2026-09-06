import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowLeft, Ticket, Save } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { lotteriesApi, getErr } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Spinner } from '../../components/ui/Spinner'
import { fmt$ } from '../../lib/utils'
import { ImageManager, type SliderImage } from '../../components/ui/ImageSlider'

// ─── Schema (same shape as create, all optional for updates) ──────────────────
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
  ticketPrice:     z.coerce.number().min(0.01, 'Must be > 0'),
  totalTickets:    z.coerce.number().int().min(1, 'Min 1'),
  ticketStart:     z.coerce.number().int().min(1, 'Min 1').optional(),
  ticketEnd:       z.coerce.number().int().min(1).optional(),
  saleStartDate:   z.string().min(1, 'Required'),
  saleEndDate:     z.string().min(1, 'Required'),
  drawDate:        z.string().min(1, 'Required'),
  visibility:      z.enum(['PUBLIC', 'PRIVATE', 'UNLISTED']),
  termsConditions: z.string().optional(),
  prizes:          z.array(prizeSchema).min(1, 'Add at least one prize'),
}).superRefine((d, ctx) => {
  if (d.ticketStart !== undefined && d.totalTickets) {
    const end = d.ticketEnd ?? (d.ticketStart + d.totalTickets - 1)
    if (end - d.ticketStart + 1 !== d.totalTickets) {
      ctx.addIssue({ code: 'custom', path: ['ticketEnd'], message: `Range ${d.ticketStart}–${end} must span exactly ${d.totalTickets} tickets` })
    }
  }
})

type F = z.infer<typeof schema>

/** Convert a UTC ISO string to the local "datetime-local" value (YYYY-MM-DDTHH:mm) */
function toDatetimeLocal(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Images section ───────────────────────────────────────────────────────────
function ImagesSection({ lotteryId, initial }: { lotteryId: string; initial: SliderImage[] }) {
  const [images, setImages]       = useState<SliderImage[]>(initial)
  const [uploading, setUploading] = useState(false)

  // Sync if parent reloads
  useEffect(() => { setImages(initial) }, [initial])

  const handleUpload = async (file: File) => {
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
    try {
      await lotteriesApi.deleteImage(lotteryId, imageId)
      setImages(prev => prev.filter(i => i.id !== imageId))
      toast.success('Image removed')
    } catch (e) {
      toast.error(getErr(e))
    }
  }

  return (
    <div className="glass-card p-6 space-y-3">
      <h2 className="section-title flex items-center gap-2">
        <Ticket className="w-4 h-4 text-primary-400" /> Lottery Images
        <span className="text-xs font-normal text-gray-500 ml-1">optional · up to 10 · uploads immediately</span>
      </h2>
      <p className="text-xs text-gray-500">
        Images slide automatically on the public card and detail page.
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

export function ClientEditLottery() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  // ── Load existing lottery ──────────────────────────────────────────────────
  const { data: lotRes, isLoading } = useQuery({
    queryKey: ['lot-edit', id],
    queryFn: () => lotteriesApi.get(id!).then(r => r.data?.data ?? r.data),
    enabled: Boolean(id),
  })
  const lot = lotRes

  // ── Form ──────────────────────────────────────────────────────────────────
  const {
    register, control, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'STANDARD', visibility: 'PUBLIC',
      prizes: [{ rank: 1, title: 'First Prize', prizeValue: 0, quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'prizes' })
  const ticketPrice      = Number(watch('ticketPrice') || 0)
  const totalTickets     = Number(watch('totalTickets') || 0)
  const ticketStart      = Number(watch('ticketStart') || 1)
  const ticketEndPreview = totalTickets > 0 ? ticketStart + totalTickets - 1 : null

  // Populate form once data arrives
  useEffect(() => {
    if (!lot) return
    const prizes = (lot.prizes ?? []) as Record<string, unknown>[]
    reset({
      name:            String(lot.name ?? ''),
      description:     String(lot.description ?? ''),
      ticketPrice:     Number(lot.ticketPrice ?? 0),
      totalTickets:    Number(lot.totalTickets ?? 0),
      ticketStart:     Number(lot.ticketStart ?? 1),
      ticketEnd:       lot.ticketEnd ? Number(lot.ticketEnd) : undefined,
      saleStartDate:   toDatetimeLocal(String(lot.saleStartDate ?? '')),
      saleEndDate:     toDatetimeLocal(String(lot.saleEndDate ?? '')),
      drawDate:        toDatetimeLocal(String(lot.drawDate ?? '')),
      visibility:      (lot.visibility as F['visibility']) ?? 'PUBLIC',
      termsConditions: String(lot.termsConditions ?? ''),
      prizes: prizes.length > 0
        ? prizes.map(p => ({
            rank:        Number(p.rank ?? 1),
            title:       String(p.title ?? ''),
            description: String(p.description ?? ''),
            prizeValue:  Number(p.prizeValue ?? 0),
            quantity:    Number(p.quantity ?? 1),
          }))
        : [{ rank: 1, title: 'First Prize', prizeValue: 0, quantity: 1 }],
    })
  }, [lot, reset])

  // ── Mutation ──────────────────────────────────────────────────────────────
  const mut = useMutation({
    mutationFn: (d: F) => lotteriesApi.update(id!, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-lotteries'] })
      qc.invalidateQueries({ queryKey: ['lot', id] })
      qc.invalidateQueries({ queryKey: ['lot-edit', id] })
      toast.success('Lottery updated!')
      navigate(`/client/lotteries/${id}`)
    },
    onError: (e) => toast.error(getErr(e)),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner className="w-10 h-10" />
      </div>
    )
  }

  if (!lot) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#6b7280' }}>
        Lottery not found.{' '}
        <Link to="/client/lotteries" style={{ color: '#818cf8' }}>Go back</Link>
      </div>
    )
  }

  const status = String(lot.status ?? '')
  const isEditable = ['DRAFT', 'PUBLISHED', 'SELLING'].includes(status)

  if (!isEditable) {
    return (
      <div className="space-y-4">
        <Link to={`/client/lotteries/${id}`}>
          <button className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#f87171', margin: '0 0 8px' }}>Cannot Edit</p>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
            Lotteries with status <strong style={{ color: '#e2e4ea' }}>{status}</strong> can no longer be edited.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Link to={`/client/lotteries/${id}`}>
          <button className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>
        <div style={{ flex: 1 }}>
          <h1 className="page-title flex items-center gap-2">
            <Ticket className="w-6 h-6 text-primary-400" /> Edit Lottery
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Editing: <strong style={{ color: '#e2e4ea' }}>{String(lot.name)}</strong>
            <span style={{ marginLeft: 10, fontSize: 11.5, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
              {status}
            </span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(d => mut.mutate(d))} className="space-y-5">

        {/* Basic Info + Tickets & Pricing — side by side */}
        <div className="grid grid-cols-2 gap-5 items-start">

          {/* Basic Info */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="section-title">Basic Information</h2>
            <Input label="Lottery Name *" placeholder="Summer Jackpot 2026"
              error={errors.name?.message} {...register('name')} />
            <Textarea label="Description" placeholder="Describe your lottery…"
              {...register('description')} />
            <Select label="Visibility *"
              options={[
                { value: 'PUBLIC',   label: 'Public' },
                { value: 'PRIVATE',  label: 'Private' },
                { value: 'UNLISTED', label: 'Unlisted' },
              ]}
              {...register('visibility')} />
          </div>

          {/* Tickets & Pricing */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="section-title">Tickets &amp; Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Ticket Price ($) *" type="number" step="0.01" min="0.01"
                error={errors.ticketPrice?.message} {...register('ticketPrice')} />
              <Input label="Total Tickets *" type="number" min="1"
                error={errors.totalTickets?.message} {...register('totalTickets')} />
            </div>

            {/* Ticket Number Range */}
            <div style={{
              padding: '16px 18px', borderRadius: 14,
              background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                Ticket Number Range
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Number *"
                  type="number" min="1"
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
                <Input
                  label="End Number"
                  type="number" min="1"
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

            {ticketPrice > 0 && totalTickets > 0 && (
              <div style={{
                borderRadius: 16, padding: '14px 18px',
                background: 'linear-gradient(135deg,rgba(79,70,229,0.15),rgba(124,58,237,0.1))',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Potential Revenue (sold out)
                  </p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 }}>
                    {fmt$(ticketPrice * totalTickets)}
                  </p>
                </div>
                <Ticket style={{ width: 40, height: 40, color: 'rgba(99,102,241,0.3)' }} />
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
        <div className="glass-card p-6 space-y-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="section-title">Prizes</h2>
            <button type="button"
              onClick={() => append({ rank: fields.length + 1, title: '', prizeValue: 0, quantity: 1 })}
              className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Prize
            </button>
          </div>
          {errors.prizes?.message && (
            <p style={{ fontSize: 12, color: '#f87171' }}>{errors.prizes.message as string}</p>
          )}
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-5 gap-3 p-4 rounded-2xl bg-white/4 border border-white/8">
              <Input label="Rank" type="number" min="1" {...register(`prizes.${i}.rank`)} />
              <Input label="Title *" placeholder="First Prize"
                error={errors.prizes?.[i]?.title?.message} {...register(`prizes.${i}.title`)} />
              <Input label="Description" placeholder="Optional" {...register(`prizes.${i}.description`)} />
              <Input label="Value ($)" type="number" step="0.01" min="0"
                {...register(`prizes.${i}.prizeValue`)} />
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <Input label="Qty" type="number" min="1" {...register(`prizes.${i}.quantity`)} />
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(i)}
                    style={{ marginBottom: 2, padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; (e.currentTarget as HTMLButtonElement).style.background = 'none' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Images */}
        <ImagesSection
          lotteryId={id!}
          initial={((lot.images ?? []) as { id: string; url: string }[])}
        />

        {/* Terms */}
        <div className="glass-card p-6">
          <Textarea label="Terms &amp; Conditions"
            placeholder="Enter terms and conditions…"
            rows={4} {...register('termsConditions')} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Link to={`/client/lotteries/${id}`}>
            <button type="button" className="btn-secondary">Cancel</button>
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || mut.isPending}
            className="btn-primary flex items-center gap-2 px-6"
          >
            {isSubmitting || mut.isPending
              ? <Spinner />
              : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  )
}
