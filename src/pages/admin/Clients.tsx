import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, Power, Users, UserCheck, UserX,
  X, Mail, Phone, Globe, MapPin, Building2,
  Ticket, CreditCard, Calendar, ShoppingCart,
  CheckCircle2, Clock, AlertTriangle, ExternalLink,
  Copy, ChevronRight,
} from 'lucide-react'
import { adminApi, getErr } from '../../lib/api'
import { fmt$, fmtDate } from '../../lib/utils'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/StatCard'
import { Spinner } from '../../components/ui/Spinner'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClientRow {
  id: string
  name: string
  email: string
  businessName: string
  phone?: string
  status: string
  createdAt: string
  _count: { lotteries: number; subscriptions?: number }
}

interface LotterySnap {
  id: string
  name: string
  status: string
  ticketPrice: string | number
  totalTickets: number
  ticketsSold: number
  drawDate: string
  createdAt: string
  _count: { tickets: number; winners: number }
}

interface ClientDetail {
  id: string
  name: string
  email: string
  businessName: string
  phone?: string
  website?: string
  address?: string
  city?: string
  logo?: string
  status: string
  emailVerifiedAt?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  lotteries: LotterySnap[]
  subscriptions: {
    id: string
    status: string
    billingCycle: string
    price: string | number
    createdAt: string
    expiresAt?: string
    plan?: { name: string; monthlyPrice: number }
  }[]
  _count: { lotteries: number; buyers: number; subscriptions: number }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success('Copied!'))
}

function InfoRow({
  icon: Icon, label, value, copyable,
}: {
  icon: React.ElementType; label: string; value?: string | null; copyable?: boolean
}) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 13, height: 13, color: '#818cf8' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ fontSize: 13.5, color: '#e2e4ea', margin: 0, wordBreak: 'break-all' }}>{value}</p>
      </div>
      {copyable && (
        <button onClick={() => copyText(value)} style={{ padding: 4, borderRadius: 6, background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
          <Copy style={{ width: 12, height: 12 }} />
        </button>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '20px 0 10px' }}>
      {children}
    </p>
  )
}

// ── Lottery status icon ───────────────────────────────────────────────────────

function LotteryStatusIcon({ status }: { status: string }) {
  if (['ACTIVE', 'SELLING', 'COMPLETED'].includes(status))
    return <CheckCircle2 style={{ width: 13, height: 13, color: '#34d399', flexShrink: 0 }} />
  if (['DRAFT', 'PENDING'].includes(status))
    return <Clock style={{ width: 13, height: 13, color: '#fbbf24', flexShrink: 0 }} />
  return <AlertTriangle style={{ width: 13, height: 13, color: '#f87171', flexShrink: 0 }} />
}

// ── Client Detail Slide-over Panel ────────────────────────────────────────────

function ClientDetailPanel({
  clientId, onClose, onStatusChange,
}: {
  clientId: string
  onClose: () => void
  onStatusChange: (id: string, action: 'ACTIVATE' | 'SUSPEND') => void
}) {
  const { data, isLoading } = useQuery<ClientDetail>({
    queryKey: ['admin-client', clientId],
    queryFn: () => adminApi.client(clientId).then(r => r.data?.data ?? r.data),
    enabled: Boolean(clientId),
  })

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const c = data
  const activeSub = c?.subscriptions?.[0]
  const lotteries = c?.lotteries ?? []
  const totalRevenue = lotteries.reduce(
    (acc, l) => acc + Number(l.ticketPrice) * l.ticketsSold,
    0,
  )

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 51,
          width: '100%', maxWidth: 520,
          background: '#0f1018',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.5)',
          animation: 'slideInRight 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0, background: '#0d0e1a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg,rgba(99,102,241,0.35),rgba(139,92,246,0.25))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 800, color: '#818cf8', flexShrink: 0,
            }}>
              {c?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
                {isLoading ? 'Loading…' : (c?.businessName ?? c?.name ?? '—')}
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{c?.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#9ca3af' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
              <Spinner className="w-8 h-8" />
            </div>
          ) : c ? (
            <>
              {/* Status + action */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <StatusBadge status={c.status} />
                <button
                  onClick={() => onStatusChange(c.id, c.status === 'ACTIVE' ? 'SUSPEND' : 'ACTIVATE')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                    cursor: 'pointer', border: '1px solid',
                    ...(c.status === 'ACTIVE'
                      ? { background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171' }
                      : { background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)', color: '#34d399' }),
                  }}
                >
                  <Power style={{ width: 13, height: 13 }} />
                  {c.status === 'ACTIVE' ? 'Suspend Client' : 'Activate Client'}
                </button>
              </div>

              {/* Stats strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '16px 0' }}>
                {[
                  { label: 'Lotteries', value: c._count.lotteries, color: '#818cf8' },
                  { label: 'Buyers',    value: c._count.buyers,    color: '#34d399' },
                  { label: 'Revenue',   value: fmt$(totalRevenue),  color: '#fbbf24' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, padding: '12px 10px', textAlign: 'center',
                  }}>
                    <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>{label}</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Contact & Profile */}
              <SectionTitle>Contact &amp; Profile</SectionTitle>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '4px 14px' }}>
                <InfoRow icon={Building2} label="Business Name" value={c.businessName} />
                <InfoRow icon={Users}     label="Full Name"     value={c.name} />
                <InfoRow icon={Mail}      label="Email"         value={c.email} copyable />
                <InfoRow icon={Phone}     label="Phone"         value={c.phone} copyable />
                <InfoRow icon={Globe}     label="Website"       value={c.website} />
                <InfoRow icon={MapPin}    label="Address"       value={[c.address, c.city].filter(Boolean).join(', ')} />
                <InfoRow icon={Calendar}  label="Member Since"  value={fmtDate(c.createdAt)} />
                <InfoRow icon={Calendar}  label="Last Login"    value={c.lastLoginAt ? fmtDate(c.lastLoginAt) : 'Never'} />
                <InfoRow icon={CheckCircle2} label="Email Verified" value={c.emailVerifiedAt ? fmtDate(c.emailVerifiedAt) : 'Not verified'} />
              </div>

              {/* Subscription */}
              <SectionTitle>Current Subscription</SectionTitle>
              {activeSub ? (
                <div style={{
                  background: activeSub.status === 'ACTIVE'
                    ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${activeSub.status === 'ACTIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
                      {activeSub.plan?.name ?? 'Unknown Plan'}
                    </p>
                    <StatusBadge status={activeSub.status} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      ['Price',   fmt$(Number(activeSub.price))],
                      ['Billing', activeSub.billingCycle],
                      ['Started', fmtDate(activeSub.createdAt)],
                      ['Expires', activeSub.expiresAt ? fmtDate(activeSub.expiresAt) : 'On approval'],
                    ].map(([k, v]) => (
                      <div key={String(k)}>
                        <p style={{ fontSize: 11, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</p>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e4ea', margin: 0 }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
                  <CreditCard style={{ width: 24, height: 24, color: '#4b5563', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>No active subscription</p>
                </div>
              )}

              {/* Lotteries list */}
              <SectionTitle>
                Lotteries
                <span style={{ marginLeft: 6, background: 'rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: 20, padding: '1px 8px', fontSize: 11 }}>
                  {c._count.lotteries} total
                </span>
              </SectionTitle>

              {lotteries.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
                  <Ticket style={{ width: 24, height: 24, color: '#4b5563', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>No lotteries yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {lotteries.map(l => {
                    const sellPct = l.totalTickets > 0
                      ? Math.round((l.ticketsSold / l.totalTickets) * 100)
                      : 0
                    return (
                      <div key={l.id} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 12, padding: '12px 14px',
                      }}>
                        {/* Name + status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <LotteryStatusIcon status={l.status} />
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e4ea', margin: 0, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {l.name}
                          </p>
                          <StatusBadge status={l.status} />
                        </div>

                        {/* Metrics row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                          {[
                            { label: 'Ticket Price', value: fmt$(Number(l.ticketPrice)) },
                            { label: 'Tickets Sold', value: `${l.ticketsSold.toLocaleString()} / ${l.totalTickets.toLocaleString()}` },
                            { label: 'Winners',      value: l._count.winners },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ textAlign: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '6px 4px' }}>
                              <p style={{ fontSize: 10.5, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e4ea', margin: 0 }}>{String(value)}</p>
                            </div>
                          ))}
                        </div>

                        {/* Sell progress bar */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>Sold</span>
                            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{sellPct}%</span>
                          </div>
                          <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                            <div style={{
                              height: '100%', borderRadius: 99,
                              width: `${sellPct}%`,
                              background: sellPct >= 80
                                ? 'linear-gradient(90deg,#34d399,#10b981)'
                                : sellPct >= 40
                                  ? 'linear-gradient(90deg,#818cf8,#6366f1)'
                                  : 'linear-gradient(90deg,#6b7280,#4b5563)',
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                        </div>

                        {/* Draw date */}
                        <p style={{ fontSize: 11.5, color: '#6b7280', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar style={{ width: 11, height: 11 }} />
                          Draw: {fmtDate(l.drawDate)}
                        </p>
                      </div>
                    )
                  })}

                  {c._count.lotteries > 10 && (
                    <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', padding: '8px 0' }}>
                      Showing 10 of {c._count.lotteries} lotteries
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p style={{ textAlign: 'center', color: '#6b7280', paddingTop: 60 }}>Client not found</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AdminClients() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-clients', page, search],
    queryFn: () =>
      adminApi.clients({ page, limit: 20, search: search || undefined }).then(r => r.data?.data),
  })

  const clients: ClientRow[] = (data as { data?: ClientRow[] })?.data ?? []
  const meta = (data as {
    meta?: { total: number; page: number; limit: number; totalPages: number }
  })?.meta

  const statusMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'ACTIVATE' | 'SUSPEND' }) =>
      adminApi.clientStatus(id, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-clients'] })
      qc.invalidateQueries({ queryKey: ['admin-client', selectedId] })
      toast.success('Client status updated')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const active    = clients.filter(c => c.status === 'ACTIVE').length
  const suspended = clients.filter(c => c.status === 'SUSPENDED').length

  const cols = [
    {
      key: 'client', header: 'Client',
      cell: (r: ClientRow) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#818cf8', flexShrink: 0,
          }}>
            {r.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e4ea', margin: 0 }}>{r.businessName}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'name', header: 'Full Name',
      cell: (r: ClientRow) => (
        <span style={{ fontSize: 13, color: '#c8cad8' }}>{r.name}</span>
      ),
    },
    {
      key: 'phone', header: 'Phone',
      cell: (r: ClientRow) => (
        <span style={{ fontSize: 13, color: r.phone ? '#9ca3af' : '#4b5563' }}>
          {r.phone ?? '—'}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      cell: (r: ClientRow) => <StatusBadge status={r.status} />,
    },
    {
      key: 'lotteries', header: 'Lotteries',
      cell: (r: ClientRow) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Ticket style={{ width: 13, height: 13, color: '#818cf8' }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#e2e4ea' }}>
            {r._count?.lotteries ?? 0}
          </span>
        </div>
      ),
    },
    {
      key: 'joined', header: 'Joined',
      cell: (r: ClientRow) => (
        <span style={{ fontSize: 12.5, color: '#9ca3af' }}>{fmtDate(r.createdAt)}</span>
      ),
    },
    {
      key: 'actions', header: '',
      cell: (r: ClientRow) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            className="btn-ghost"
            style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={e => { e.stopPropagation(); statusMut.mutate({ id: r.id, action: r.status === 'ACTIVE' ? 'SUSPEND' : 'ACTIVATE' }) }}
          >
            <Power style={{ width: 13, height: 13 }} />
            {r.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
          </button>
          <button
            className="btn-ghost"
            style={{ padding: '6px 8px', fontSize: 12, color: '#818cf8' }}
            onClick={e => { e.stopPropagation(); setSelectedId(r.id) }}
          >
            <ChevronRight style={{ width: 14, height: 14 }} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 className="page-title">Clients</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          Manage all lottery operator accounts · click any row to view full details
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <StatCard title="Total"     value={meta?.total ?? 0} icon={Users}      iconBg="bg-indigo-500/15"  iconColor="text-indigo-400" />
        <StatCard title="Active"    value={active}           icon={UserCheck}  iconBg="bg-emerald-500/15" iconColor="text-emerald-400" />
        <StatCard title="Suspended" value={suspended}        icon={UserX}      iconBg="bg-red-500/15"     iconColor="text-red-400" />
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#6b7280' }} />
          <input
            className="input-dark"
            style={{ paddingLeft: 36 }}
            placeholder="Search by name, email or business…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        {/* Clickable rows */}
        <DataTable
          columns={cols}
          data={clients}
          isLoading={isLoading}
          meta={meta}
          onPage={setPage}
          emptyMsg="No clients found"
          onRowClick={(r) => setSelectedId((r as unknown as ClientRow).id)}
        />
      </div>

      {/* Slide-over panel */}
      {selectedId && (
        <ClientDetailPanel
          clientId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChange={(id, action) => statusMut.mutate({ id, action })}
        />
      )}
    </div>
  )
}
