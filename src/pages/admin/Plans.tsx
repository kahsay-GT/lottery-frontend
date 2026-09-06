import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, CheckCircle2,
  Package, Zap, Crown, Star, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { plansApi, getErr } from '../../lib/api'
import { fmt$ } from '../../lib/utils'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Spinner } from '../../components/ui/Spinner'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  monthlyPrice: number
  yearlyPrice: number
  maxLotteriesPerCycle: number
  maxActiveLotteries: number
  maxTicketsPerLottery: number
  minTicketPrice: number
  maxTicketPrice: number
  storageQuotaGb: number
  hasReporting: boolean
  hasApiAccess: boolean
  supportLevel: string
  sortOrder: number
  isActive: boolean
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const planSchema = z.object({
  name:                  z.string().min(2, 'Name required'),
  description:           z.string().optional(),
  monthlyPrice:          z.coerce.number().min(0),
  yearlyPrice:           z.coerce.number().min(0),
  maxLotteriesPerCycle:  z.coerce.number().int().min(1),
  maxActiveLotteries:    z.coerce.number().int().min(1),
  maxTicketsPerLottery:  z.coerce.number().int().min(1),
  minTicketPrice:        z.coerce.number().min(0),
  maxTicketPrice:        z.coerce.number().min(0),
  storageQuotaGb:        z.coerce.number().int().min(1),
  hasReporting:          z.boolean(),
  hasApiAccess:          z.boolean(),
  supportLevel:          z.string().min(1),
  sortOrder:             z.coerce.number().int().min(0),
})
type PlanForm = z.infer<typeof planSchema>

const PLAN_ICONS = [
  { icon: Zap,    bg: 'bg-blue-500/20',   text: 'text-blue-400' },
  { icon: Star,   bg: 'bg-purple-500/20', text: 'text-purple-400' },
  { icon: Crown,  bg: 'bg-amber-500/20',  text: 'text-amber-400' },
]

const DEFAULT_PLAN_FORM: PlanForm = {
  name: '', description: '',
  monthlyPrice: 0, yearlyPrice: 0,
  maxLotteriesPerCycle: 5, maxActiveLotteries: 2,
  maxTicketsPerLottery: 5000, minTicketPrice: 1, maxTicketPrice: 1000,
  storageQuotaGb: 10, hasReporting: true, hasApiAccess: false,
  supportLevel: 'basic', sortOrder: 0,
}

function planToForm(p: Plan): PlanForm {
  return {
    name:                 p.name,
    description:          p.description ?? '',
    monthlyPrice:         Number(p.monthlyPrice),
    yearlyPrice:          Number(p.yearlyPrice),
    maxLotteriesPerCycle: Number(p.maxLotteriesPerCycle),
    maxActiveLotteries:   Number(p.maxActiveLotteries),
    maxTicketsPerLottery: Number(p.maxTicketsPerLottery),
    minTicketPrice:       Number(p.minTicketPrice),
    maxTicketPrice:       Number(p.maxTicketPrice),
    storageQuotaGb:       Number(p.storageQuotaGb),
    hasReporting:         Boolean(p.hasReporting),
    hasApiAccess:         Boolean(p.hasApiAccess),
    supportLevel:         p.supportLevel ?? 'basic',
    sortOrder:            Number(p.sortOrder) || 0,
  }
}

// ─── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({
  plan, idx, onEdit, onDelete, onToggle, toggling,
}: {
  plan: Plan; idx: number
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  toggling: boolean
}) {
  const { icon: Icon, bg, text } = PLAN_ICONS[idx % 3]
  const { isActive } = plan

  return (
    <div className={`glass-card overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${!isActive ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className={`p-5 border-b border-white/8 ${bg.replace('/20', '/10')}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-6 h-6 ${text}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              <p className="text-xs text-gray-400">{plan.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Toggle */}
            <button
              onClick={onToggle}
              disabled={toggling}
              title={isActive ? 'Deactivate' : 'Activate'}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {toggling
                ? <Spinner className="w-5 h-5" />
                : isActive
                  ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                  : <ToggleLeft className="w-5 h-5 text-gray-500" />}
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/4 border border-white/8 p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Monthly</p>
            <p className="text-2xl font-black text-white">{fmt$(Number(plan.monthlyPrice))}</p>
          </div>
          <div className="rounded-xl bg-white/4 border border-white/8 p-3 text-center">
            <p className="text-xs text-gray-400 mb-0.5">Yearly</p>
            <p className="text-2xl font-black text-white">{fmt$(Number(plan.yearlyPrice))}</p>
            {Number(plan.monthlyPrice) > 0 && (
              <p className="text-xs text-emerald-400">
                Save {Math.round((1 - Number(plan.yearlyPrice) / (Number(plan.monthlyPrice) * 12)) * 100)}%
              </p>
            )}
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-1.5 text-sm">
          {[
            `${plan.maxLotteriesPerCycle} lotteries per billing cycle`,
            `${plan.maxActiveLotteries} active lotteries at once`,
            `Up to ${Number(plan.maxTicketsPerLottery).toLocaleString()} tickets/lottery`,
            `Ticket price: ${fmt$(Number(plan.minTicketPrice))} – ${fmt$(Number(plan.maxTicketPrice))}`,
            `${plan.storageQuotaGb}GB storage`,
            ...(plan.hasReporting ? ['Advanced reporting & analytics'] : []),
            ...(plan.hasApiAccess  ? ['API access'] : []),
            `${plan.supportLevel} support`,
          ].map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-gray-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {/* Status badge */}
        <div className={`text-center py-1.5 rounded-xl text-xs font-semibold ${
          isActive
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
            : 'bg-gray-500/15 text-gray-400 border border-gray-500/20'
        }`}>
          {isActive ? '● Active — visible to clients' : '○ Inactive — hidden from clients'}
        </div>
      </div>
    </div>
  )
}

// ─── Plan Form Modal ───────────────────────────────────────────────────────────
function PlanFormModal({
  open, onClose, editPlan,
}: {
  open: boolean
  onClose: () => void
  editPlan: Plan | null
}) {
  const qc = useQueryClient()
  const isEdit = Boolean(editPlan)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: DEFAULT_PLAN_FORM,
  })

  // Re-initialize form whenever editPlan changes (fixes stale edit data)
  useEffect(() => {
    if (open) {
      reset(editPlan ? planToForm(editPlan) : DEFAULT_PLAN_FORM)
    }
  }, [open, editPlan, reset])

  const createMut = useMutation({
    mutationFn: (d: PlanForm) => plansApi.adminCreate(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
      toast.success('Plan created!')
      onClose()
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const updateMut = useMutation({
    mutationFn: (d: PlanForm) => plansApi.adminUpdate(editPlan!.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
      toast.success('Plan updated!')
      onClose()
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const onSubmit = (d: PlanForm) => isEdit ? updateMut.mutate(d) : createMut.mutate(d)
  const isSaving = isSubmitting || createMut.isPending || updateMut.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Plan' : 'Create New Plan'}
      description={isEdit ? 'Update plan details and pricing' : 'Add a new subscription plan for operators'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

        {/* Name + Sort order */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Plan Name *" placeholder="Starter" error={errors.name?.message} {...register('name')} />
          <Input label="Sort Order" type="number" min="0" hint="Lower = shown first" {...register('sortOrder')} />
        </div>
        <Textarea label="Description" placeholder="Perfect for small lottery operators" {...register('description')} />

        {/* Pricing */}
        <div className="rounded-2xl bg-white/3 border border-white/8 p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Pricing</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Monthly Price ($) *" type="number" step="0.01" min="0"
              error={errors.monthlyPrice?.message} {...register('monthlyPrice')} />
            <Input label="Yearly Price ($) *" type="number" step="0.01" min="0"
              error={errors.yearlyPrice?.message} {...register('yearlyPrice')} />
          </div>
        </div>

        {/* Lottery Limits */}
        <div className="rounded-2xl bg-white/3 border border-white/8 p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Lottery Limits</p>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Lotteries/Cycle *" type="number" min="1"
              error={errors.maxLotteriesPerCycle?.message} {...register('maxLotteriesPerCycle')} />
            <Input label="Active at Once *" type="number" min="1"
              error={errors.maxActiveLotteries?.message} {...register('maxActiveLotteries')} />
            <Input label="Max Tickets/Lottery *" type="number" min="1"
              error={errors.maxTicketsPerLottery?.message} {...register('maxTicketsPerLottery')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min Ticket Price ($)" type="number" step="0.01" min="0"
              {...register('minTicketPrice')} />
            <Input label="Max Ticket Price ($)" type="number" step="0.01" min="0"
              {...register('maxTicketPrice')} />
          </div>
        </div>

        {/* Storage & Support */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Storage Quota (GB) *" type="number" min="1" {...register('storageQuotaGb')} />
          <div>
            <label className="label">Support Level</label>
            <select className="input-dark" {...register('supportLevel')}>
              <option value="basic"      className="bg-gray-800">Basic</option>
              <option value="standard"   className="bg-gray-800">Standard</option>
              <option value="priority"   className="bg-gray-800">Priority</option>
              <option value="enterprise" className="bg-gray-800">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Feature toggles */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-primary-500" {...register('hasReporting')} />
            <span className="text-sm text-gray-300">Advanced Reporting</span>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/8 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-primary-500" {...register('hasApiAccess')} />
            <span className="text-sm text-gray-300">API Access</span>
          </label>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2 border-t border-white/8">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={isSaving} className="btn-primary flex items-center gap-2 px-6">
            {isSaving
              ? <Spinner />
              : <><Plus className="w-4 h-4" />{isEdit ? 'Update Plan' : 'Create Plan'}</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export function AdminPlans() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Fix: adminList returns { data: { data: Plan[], ... } } — unwrap one level
  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: () => plansApi.adminList().then(r => {
      const payload = r.data?.data
      // paginated result: { data: Plan[], total, page, ... }
      if (Array.isArray(payload?.data)) return payload.data as Plan[]
      // flat array
      if (Array.isArray(payload)) return payload as Plan[]
      return [] as Plan[]
    }),
  })
  const plans: Plan[] = data ?? []

  const toggleMut = useMutation({
    mutationFn: (plan: Plan) => {
      setTogglingId(plan.id)
      return plansApi.adminUpdate(plan.id, { isActive: !plan.isActive })
    },
    onSuccess: (_, plan) => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
      toast.success(`Plan ${plan.isActive ? 'deactivated' : 'activated'}`)
    },
    onError: (e) => toast.error(getErr(e)),
    onSettled: () => setTogglingId(null),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => plansApi.adminDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-plans'] })
      toast.success('Plan deleted')
      setDeletePlan(null)
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const openCreate = () => { setEditPlan(null); setFormOpen(true) }
  const openEdit   = (p: Plan) => { setEditPlan(p); setFormOpen(true) }

  const sortedPlans = [...plans].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-400" /> Subscription Plans
          </h1>
          <p className="text-sm text-gray-400">
            Manage the plans that operators subscribe to before creating lotteries
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-5 py-2.5">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {/* Info banner */}
      <div className="glass-card p-4 border border-primary-500/20 bg-primary-500/5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-white">How the subscription flow works</p>
            <p className="text-gray-400 mt-0.5">
              1. Operator selects a plan → <span className="text-amber-300">PENDING</span> →
              2. Uploads bank slip → <span className="text-purple-300">UNDER REVIEW</span> →
              3. You approve here → <span className="text-emerald-300">ACTIVE</span> →
              4. Operator can create lotteries ✓
            </p>
          </div>
        </div>
      </div>

      {/* Plans grid */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="w-10 h-10" /></div>
      ) : sortedPlans.length === 0 ? (
        <div className="glass-card p-16 text-center border border-dashed border-white/15">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Plans Yet</h3>
          <p className="text-gray-400 mb-6">Create your first subscription plan so operators can subscribe.</p>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 mx-auto px-6">
            <Plus className="w-4 h-4" /> Create First Plan
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {sortedPlans.map((plan, idx) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              idx={idx}
              onEdit={() => openEdit(plan)}
              onDelete={() => setDeletePlan(plan)}
              onToggle={() => toggleMut.mutate(plan)}
              toggling={togglingId === plan.id}
            />
          ))}
        </div>
      )}

      {/* Footer stats */}
      {!isLoading && sortedPlans.length > 0 && (
        <p className="text-center text-xs text-gray-500">
          {sortedPlans.filter(p => p.isActive).length} active plan{sortedPlans.filter(p => p.isActive).length !== 1 ? 's' : ''} visible to operators ·{' '}
          {sortedPlans.filter(p => !p.isActive).length} inactive
        </p>
      )}

      {/* Create / Edit modal */}
      <PlanFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditPlan(null) }}
        editPlan={editPlan}
      />

      {/* Delete confirm */}
      <Modal open={!!deletePlan} onClose={() => setDeletePlan(null)} title="Delete Plan" size="sm">
        {deletePlan && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
              Are you sure you want to delete <strong>{deletePlan.name}</strong>?
              This cannot be undone. Plans with active subscriptions cannot be deleted.
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setDeletePlan(null)}>Cancel</button>
              <button
                className="btn-danger flex items-center gap-2"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deletePlan.id)}
              >
                {deleteMut.isPending ? <Spinner /> : <><Trash2 className="w-4 h-4" /> Delete Plan</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
