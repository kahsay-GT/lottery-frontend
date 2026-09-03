import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Search, Ticket, Calendar, Phone, Mail,
  UserCheck, DollarSign, CreditCard, X, CheckCircle2,
  Clock, XCircle, ShoppingBag,
} from 'lucide-react'
import { reportsApi, getErr } from '../../lib/api'
import { fmt$, fmtDate, fmtDateTime } from '../../lib/utils'
import { DataTable } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/StatCard'
import { Spinner } from '../../components/ui/Spinner'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Buyer {
  id: string
  name: string
  email: string
  phone?: string
  isGuest: boolean
  createdAt: string
  _count: { tickets: number; payments: number }
}

type DetailTab = 'info' | 'tickets' | 'payments'

// ─── Tab button ───────────────────────────────────────────────────────────────
function Tab({ id, label, icon: Icon, active, onClick, count }: {
  id: DetailTab; label: string; icon: React.ElementType
  active: boolean; onClick: () => void; count?: number
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', border: 'none', transition: 'all 0.15s',
        background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
        color: active ? '#a5b4fc' : '#6b7280',
        outline: active ? '1px solid rgba(99,102,241,0.35)' : 'none',
      }}
    >
      <Icon style={{ width: 14, height: 14 }} />
      {label}
      {count !== undefined && count > 0 && (
        <span style={{
          fontSize: 10.5, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 99,
          background: active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)',
          color: active ? '#c7d2fe' : '#9ca3af',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
        }}>
          {count}
        </span>
      )}
    </button>
  )
}

// ─── Buyer Detail Slide-over ──────────────────────────────────────────────────
function BuyerDetail({ buyer, onClose }: { buyer: Buyer; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>('info')

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['buyer-tickets', buyer.id],
    queryFn: () => reportsApi.buyerTickets(buyer.id, { limit: 50 }).then(r => {
      const p = r.data?.data
      return (Array.isArray(p?.data) ? p.data : []) as Record<string, unknown>[]
    }),
    enabled: tab === 'tickets',
  })

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['buyer-payments', buyer.id],
    queryFn: () => reportsApi.buyerPayments(buyer.id, { limit: 50 }).then(r => {
      const p = r.data?.data
      return (Array.isArray(p?.data) ? p.data : []) as Record<string, unknown>[]
    }),
    enabled: tab === 'payments',
  })

  const tickets  = ticketsData  ?? []
  const payments = paymentsData ?? []

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 51,
        width: '100%', maxWidth: 520,
        background: '#0f1018', borderLeft: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-24px 0 80px rgba(0,0,0,0.5)',
        animation: 'slideInRight 0.22s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: '#0d0e1a', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 13, flexShrink: 0,
              background: 'linear-gradient(135deg,rgba(99,102,241,0.35),rgba(139,92,246,0.25))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900, color: '#818cf8',
            }}>
              {buyer.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{buyer.name}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{buyer.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 7, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <Tab id="info"     label="Info"     icon={UserCheck}  active={tab === 'info'}     onClick={() => setTab('info')} />
          <Tab id="tickets"  label="Tickets"  icon={Ticket}     active={tab === 'tickets'}  onClick={() => setTab('tickets')}  count={buyer._count.tickets} />
          <Tab id="payments" label="Payments" icon={CreditCard} active={tab === 'payments'} onClick={() => setTab('payments')} count={buyer._count.payments} />
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* ── Info Tab ── */}
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type badge */}
              <div>
                {buyer.isGuest
                  ? <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30">Guest Buyer</span>
                  : <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit"><UserCheck className="w-3 h-3" />Registered</span>}
              </div>

              {/* Stats strip */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Tickets Bought', value: buyer._count.tickets, color: '#818cf8', icon: Ticket },
                  { label: 'Payments Made',  value: buyer._count.payments, color: '#34d399', icon: DollarSign },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Contact details */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '4px 14px' }}>
                {[
                  { icon: Mail,     label: 'Email',   value: buyer.email },
                  { icon: Phone,    label: 'Phone',   value: buyer.phone ?? '—' },
                  { icon: Calendar, label: 'Joined',  value: fmtDate(buyer.createdAt) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 13, height: 13, color: '#818cf8' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 10.5, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                      <p style={{ fontSize: 13.5, color: '#e2e4ea', margin: 0 }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tickets Tab ── */}
          {tab === 'tickets' && (
            ticketsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner className="w-8 h-8" /></div>
            ) : tickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280' }}>
                <Ticket style={{ width: 36, height: 36, margin: '0 auto 12px', color: '#374151' }} />
                <p style={{ fontSize: 14 }}>No tickets yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tickets.map((t, i) => {
                  const lot = t.lottery as Record<string, unknown> | null
                  return (
                    <div key={String(t.id ?? i)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e4ea', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {String(lot?.name ?? '—')}
                          </p>
                          <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#818cf8', margin: 0 }}>
                            #{String(t.ticketNumber ?? '—')}
                          </p>
                        </div>
                        <StatusBadge status={String(t.status ?? '')} />
                      </div>
                      {t.purchasedAt !== undefined && t.purchasedAt !== null && (
                        <p style={{ fontSize: 11.5, color: '#6b7280', marginTop: 6 }}>
                          Purchased {fmtDate(String(t.purchasedAt))}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ── Payments Tab ── */}
          {tab === 'payments' && (
            paymentsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner className="w-8 h-8" /></div>
            ) : payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280' }}>
                <CreditCard style={{ width: 36, height: 36, margin: '0 auto 12px', color: '#374151' }} />
                <p style={{ fontSize: 14 }}>No payments yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {payments.map((p, i) => {
                  const lot = p.lottery as Record<string, unknown> | null
                  const status = String(p.status ?? '')
                  return (
                    <div key={String(p.id ?? i)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e4ea', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {String(lot?.name ?? '—')}
                          </p>
                          <p style={{ fontSize: 11.5, fontFamily: 'monospace', color: '#6b7280', margin: 0 }}>
                            {String(p.referenceCode ?? '')}
                          </p>
                        </div>
                        <StatusBadge status={status} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#34d399' }}>{fmt$(Number(p.amount ?? 0))}</span>
                        <span style={{ fontSize: 11.5, color: '#6b7280' }}>{fmtDate(String(p.createdAt ?? ''))}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ClientBuyers() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['buyers', page, search],
    queryFn: () => reportsApi.buyers({ page, limit: 20, search: search || undefined }).then(r => r.data?.data),
  })
  const rows  = (data?.data ?? []) as Buyer[]
  const meta  = data?.meta
  const total = meta?.total ?? 0
  const guests     = rows.filter(r => r.isGuest).length
  const registered = rows.filter(r => !r.isGuest).length

  const cols = [
    {
      key: 'name', header: 'Buyer',
      cell: (r: Buyer) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(99,102,241,0.4),rgba(139,92,246,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#a5b4fc', flexShrink: 0 }}>
            {r.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e4ea', margin: 0 }}>{r.name}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone', header: 'Phone',
      cell: (r: Buyer) => <span style={{ fontSize: 13, color: '#9ca3af' }}>{r.phone ?? '—'}</span>,
    },
    {
      key: 'type', header: 'Type',
      cell: (r: Buyer) => r.isGuest
        ? <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30">Guest</span>
        : <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><UserCheck className="w-3 h-3" />Registered</span>,
    },
    {
      key: 'tickets', header: 'Tickets',
      cell: (r: Buyer) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 700, color: '#fff' }}>
          <Ticket style={{ width: 13, height: 13, color: '#818cf8' }} />
          {r._count?.tickets ?? 0}
        </span>
      ),
    },
    {
      key: 'payments', header: 'Payments',
      cell: (r: Buyer) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 700, color: '#fff' }}>
          <CreditCard style={{ width: 13, height: 13, color: '#34d399' }} />
          {r._count?.payments ?? 0}
        </span>
      ),
    },
    {
      key: 'joined', header: 'Joined',
      cell: (r: Buyer) => <span style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(r.createdAt)}</span>,
    },
    {
      key: 'actions', header: '',
      cell: (r: Buyer) => (
        <button
          onClick={() => setSelectedBuyer(r)}
          style={{ fontSize: 12.5, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 8px', borderRadius: 6 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          View →
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Buyers</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          All lottery participants — click a row to see their tickets &amp; payments
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Buyers"  value={total}      icon={Users}      iconBg="bg-primary-500/20"  iconColor="text-primary-400" />
        <StatCard title="Registered"    value={registered} icon={UserCheck}  iconBg="bg-emerald-500/20" iconColor="text-emerald-400" />
        <StatCard title="Guests"        value={guests}     icon={Users}      iconBg="bg-amber-500/20"   iconColor="text-amber-400" />
      </div>

      <div className="glass-card p-5 space-y-4">
        <div style={{ position: 'relative', maxWidth: 360 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#6b7280' }} />
          <input className="input-dark" style={{ paddingLeft: 36 }} placeholder="Search by name or email…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <DataTable
          columns={cols}
          data={rows as never[]}
          isLoading={isLoading}
          meta={meta}
          onPage={setPage}
          emptyMsg="No buyers yet"
          onRowClick={(r) => setSelectedBuyer(r as unknown as Buyer)}
        />
      </div>

      {selectedBuyer && (
        <BuyerDetail buyer={selectedBuyer} onClose={() => setSelectedBuyer(null)} />
      )}
    </div>
  )
}
