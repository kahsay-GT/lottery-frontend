import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CreditCard, Plus, Pencil, Trash2, Building2,
  CheckCircle2, XCircle, ToggleLeft, ToggleRight,
  Landmark,
} from 'lucide-react'
import { adminApi, getErr } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'

// ── Types ────────────────────────────────────────────────────────────────────

interface BankAccount {
  id: string
  accountName: string
  accountNumber: string
  isActive: boolean
  createdAt: string
  bank: { id: string; name: string }
}

// ── Validation schemas ────────────────────────────────────────────────────────

const accountSchema = z.object({
  bankName:      z.string().min(2, 'Bank name is required'),
  accountName:   z.string().min(2, 'Account name is required'),
  accountNumber: z.string().min(4, 'Account number is required'),
})

type AccountForm = z.infer<typeof accountSchema>

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
        background: 'rgba(16,185,129,0.15)', color: '#34d399',
        border: '1px solid rgba(16,185,129,0.3)',
      }}
    >
      <CheckCircle2 style={{ width: 12, height: 12 }} />
      Active
    </span>
  ) : (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
        background: 'rgba(239,68,68,0.12)', color: '#f87171',
        border: '1px solid rgba(239,68,68,0.25)',
      }}
    >
      <XCircle style={{ width: 12, height: 12 }} />
      Inactive
    </span>
  )
}

function BankIcon() {
  return (
    <div
      style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.2))',
        border: '1px solid rgba(99,102,241,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Landmark style={{ width: 20, height: 20, color: '#818cf8' }} />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminPaymentAccounts() {
  const qc = useQueryClient()

  // modal state
  const [addOpen, setAddOpen]       = useState(false)
  const [editTarget, setEditTarget] = useState<BankAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null)

  // form
  const {
    register, handleSubmit, reset, setValue,
    formState: { errors },
  } = useForm<AccountForm>({ resolver: zodResolver(accountSchema) })

  // ── queries ──────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<BankAccount[]>({
    queryKey: ['admin-bank-accounts'],
    queryFn: () => adminApi.bankAccounts().then(r => r.data?.data ?? r.data ?? []),
  })
  const accounts: BankAccount[] = Array.isArray(data) ? data : []

  // ── mutations ─────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (d: AccountForm) => adminApi.createBankAccount(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bank-accounts'] })
      toast.success('Bank account added')
      setAddOpen(false)
      reset()
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AccountForm }) =>
      adminApi.updateBankAccount(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bank-accounts'] })
      toast.success('Bank account updated')
      setEditTarget(null)
      reset()
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.toggleBankAccount(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bank-accounts'] })
      toast.success('Status updated')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteBankAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bank-accounts'] })
      toast.success('Bank account deleted')
      setDeleteTarget(null)
    },
    onError: (e) => toast.error(getErr(e)),
  })

  // ── helpers ───────────────────────────────────────────────────────────────

  function openEdit(account: BankAccount) {
    setEditTarget(account)
    setValue('bankName',      account.bank.name)
    setValue('accountName',   account.accountName)
    setValue('accountNumber', account.accountNumber)
  }

  function closeAdd() {
    setAddOpen(false)
    reset()
  }

  function closeEdit() {
    setEditTarget(null)
    reset()
  }

  const onSubmit = (d: AccountForm) => {
    if (editTarget) {
      updateMut.mutate({ id: editTarget.id, data: d })
    } else {
      createMut.mutate(d)
    }
  }

  const isSaving = createMut.isPending || updateMut.isPending

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.25))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <CreditCard style={{ width: 18, height: 18, color: '#818cf8' }} />
            </div>
            Payment Accounts
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Manage the platform bank accounts that clients and buyers use to make payments.
          </p>
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          Add Bank Account
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
        {[
          { label: 'Total Accounts', value: accounts.length, color: '#818cf8' },
          { label: 'Active',         value: accounts.filter(a => a.isActive).length,  color: '#34d399' },
          { label: 'Inactive',       value: accounts.filter(a => !a.isActive).length, color: '#f87171' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="glass-card"
            style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            <p style={{ fontSize: 11.5, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <Spinner className="w-8 h-8" />
        </div>
      ) : accounts.length === 0 ? (
        /* ── Empty state ── */
        <div
          className="glass-card"
          style={{
            padding: '64px 24px', textAlign: 'center',
            border: '1px dashed rgba(255,255,255,0.1)',
          }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 style={{ width: 28, height: 28, color: '#4f46e5' }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#e5e7eb', marginBottom: 6 }}>No bank accounts yet</p>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            Add your first platform bank account so clients can make payments.
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Add Bank Account
          </button>
        </div>
      ) : (
        /* ── Account cards grid ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="glass-card"
              style={{
                padding: 20,
                border: acc.isActive
                  ? '1px solid rgba(16,185,129,0.2)'
                  : '1px solid rgba(255,255,255,0.07)',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Card header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <BankIcon />
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#f3f4f6', lineHeight: 1.3 }}>
                      {acc.accountName}
                    </p>
                    <p style={{ fontSize: 12, color: '#818cf8', marginTop: 2 }}>
                      {acc.bank.name}
                    </p>
                  </div>
                </div>
                <StatusBadge active={acc.isActive} />
              </div>

              {/* Account details */}
              <div style={{
                background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                padding: '10px 14px', marginBottom: 14,
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Account Number
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#e5e7eb', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                  {acc.accountNumber}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Toggle status */}
                <button
                  onClick={() => toggleMut.mutate({ id: acc.id, isActive: !acc.isActive })}
                  disabled={toggleMut.isPending}
                  title={acc.isActive ? 'Deactivate' : 'Activate'}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.15s',
                    ...(acc.isActive
                      ? {
                          background: 'rgba(239,68,68,0.1)',
                          borderColor: 'rgba(239,68,68,0.25)',
                          color: '#f87171',
                        }
                      : {
                          background: 'rgba(16,185,129,0.1)',
                          borderColor: 'rgba(16,185,129,0.25)',
                          color: '#34d399',
                        }),
                  }}
                >
                  {acc.isActive
                    ? <><ToggleLeft style={{ width: 14, height: 14 }} /> Deactivate</>
                    : <><ToggleRight style={{ width: 14, height: 14 }} /> Activate</>
                  }
                </button>

                {/* Edit */}
                <button
                  onClick={() => openEdit(acc)}
                  title="Edit"
                  style={{
                    padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                    color: '#818cf8', display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                  }}
                >
                  <Pencil style={{ width: 13, height: 13 }} /> Edit
                </button>

                {/* Delete */}
                <button
                  onClick={() => setDeleteTarget(acc)}
                  title="Delete"
                  style={{
                    padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
                    color: '#f87171', display: 'flex', alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={addOpen || editTarget !== null}
        onClose={editTarget ? closeEdit : closeAdd}
        title={editTarget ? 'Edit Bank Account' : 'Add Bank Account'}
        description={editTarget
          ? 'Update the details for this bank account.'
          : 'Add a new platform bank account for receiving payments.'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Bank Name *"
            placeholder="e.g. Commercial Bank of Ethiopia"
            error={errors.bankName?.message}
            {...register('bankName')}
          />
          <Input
            label="Account Name *"
            placeholder="e.g. Lottery SaaS Platform"
            error={errors.accountName?.message}
            {...register('accountName')}
          />
          <Input
            label="Account Number *"
            placeholder="e.g. 1000123456789"
            error={errors.accountNumber?.message}
            {...register('accountNumber')}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
            <button
              type="button"
              onClick={editTarget ? closeEdit : closeAdd}
              style={{
                padding: '9px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#9ca3af', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {isSaving ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <>{editTarget ? <Pencil style={{ width: 15, height: 15 }} /> : <Plus style={{ width: 15, height: 15 }} />}</>
              )}
              {editTarget ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Bank Account"
        description="This action cannot be undone."
        size="sm"
      >
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trash2 style={{ width: 24, height: 24, color: '#f87171' }} />
          </div>
          <p style={{ fontSize: 14, color: '#d1d5db', marginBottom: 6 }}>
            Are you sure you want to delete
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
            {deleteTarget?.accountName} — {deleteTarget?.bank.name}?
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => setDeleteTarget(null)}
              style={{
                padding: '9px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#9ca3af', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              disabled={deleteMut.isPending}
              style={{
                padding: '9px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)',
                color: '#f87171', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {deleteMut.isPending ? <Spinner className="w-4 h-4" /> : <Trash2 style={{ width: 15, height: 15 }} />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
