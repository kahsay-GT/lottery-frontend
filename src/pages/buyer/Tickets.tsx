import { useQuery } from '@tanstack/react-query'
import { authApi } from '../../lib/api'
import { fmt$, fmtDate } from '../../lib/utils'
import { Ticket, Search, Calendar, CheckCircle2, Clock, XCircle, Hash } from 'lucide-react'
import { useState } from 'react'

export function BuyerTickets() {
  const [search, setSearch] = useState('')

  const { data: ticketsRes, isLoading } = useQuery({
    queryKey: ['buyer-tickets'],
    queryFn: () => authApi.buyerTickets().then(r => r.data?.data ?? r.data),
  })
  const allTickets = (ticketsRes as { data?: unknown[] })?.data ?? (Array.isArray(ticketsRes) ? ticketsRes : [])

  const tickets = search
    ? allTickets.filter((t: any) =>
        t.lottery?.name?.toLowerCase().includes(search.toLowerCase()) ||
        String(t.ticketNumber).includes(search)
      )
    : allTickets

  type StatusKey = 'SOLD' | 'PENDING_PAYMENT' | 'CANCELLED' | 'AVAILABLE' | 'RESERVED'

  const statusConfig: Record<StatusKey, {
    label: string
    bg: string
    text: string
    border: string
    icon: React.ReactNode
  }> = {
    SOLD: {
      label: 'Confirmed',
      bg: 'rgba(16,185,129,0.12)',
      text: '#34d399',
      border: 'rgba(52,211,153,0.25)',
      icon: <CheckCircle2 size={12} />,
    },
    PENDING_PAYMENT: {
      label: 'Pending',
      bg: 'rgba(251,191,36,0.10)',
      text: '#fbbf24',
      border: 'rgba(251,191,36,0.25)',
      icon: <Clock size={12} />,
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: 'rgba(239,68,68,0.10)',
      text: '#f87171',
      border: 'rgba(239,68,68,0.2)',
      icon: <XCircle size={12} />,
    },
    AVAILABLE: {
      label: 'Available',
      bg: 'rgba(107,114,128,0.12)',
      text: '#9ca3af',
      border: 'rgba(107,114,128,0.2)',
      icon: <Ticket size={12} />,
    },
    RESERVED: {
      label: 'Reserved',
      bg: 'rgba(99,102,241,0.12)',
      text: '#a5b4fc',
      border: 'rgba(99,102,241,0.25)',
      icon: <Clock size={12} />,
    },
  }

  const getStatus = (key: string) =>
    statusConfig[key as StatusKey] ?? statusConfig.AVAILABLE

  return (
    <div style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>My Tickets</h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 340, marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Search by lottery or ticket #…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-dark"
          style={{ paddingLeft: 36, width: '100%' }}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#6b7280' }}>
          Loading tickets…
        </div>
      ) : tickets.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', borderRadius: 18,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ticket size={26} style={{ color: '#6366f1' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#9ca3af', margin: '0 0 4px' }}>No tickets found</p>
          <p style={{ fontSize: 13, color: '#4b5563', margin: 0 }}>
            {search ? 'Try a different search term.' : 'Purchase a lottery ticket to get started.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(tickets as any[]).map((t: any) => {
            const cfg = getStatus(t.status)
            const hasTicketNum = t.ticketNumber != null && t.ticketNumber !== ''
            return (
              <div
                key={t.id}
                style={{
                  borderRadius: 16, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'border-color 0.2s',
                }}>
                {/* Top stripe — ticket number hero */}
                <div style={{
                  padding: '14px 18px',
                  background: hasTicketNum
                    ? 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))'
                    : 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  {/* Ticket number badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: hasTicketNum
                        ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.25))'
                        : 'rgba(255,255,255,0.05)',
                      border: hasTicketNum ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {hasTicketNum
                        ? <Hash size={18} style={{ color: '#818cf8' }} />
                        : <Ticket size={18} style={{ color: '#4b5563' }} />}
                    </div>
                    {hasTicketNum ? (
                      <div>
                        <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Ticket Number</p>
                        <p style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 900, color: '#a5b4fc', margin: 0, letterSpacing: '0.04em' }}>
                          {String(t.ticketNumber)}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', margin: 0 }}>Number pending</p>
                        <p style={{ fontSize: 11, color: '#374151', margin: '2px 0 0' }}>Assigned after payment</p>
                      </div>
                    )}
                  </div>

                  {/* Status pill */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 11px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                    background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
                    flexShrink: 0,
                  }}>
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </div>

                {/* Bottom row — lottery info */}
                <div style={{
                  padding: '10px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ticket size={15} style={{ color: '#34d399' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e4ea', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.lottery?.name ?? 'Unknown Lottery'}
                      </p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '1px 0 0' }}>
                        {fmt$(Number(t.lottery?.ticketPrice ?? 0))} per ticket
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                    {t.lottery?.drawDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6b7280' }}>
                        <Calendar size={12} />
                        <span style={{ fontSize: 11 }}>{fmtDate(t.lottery.drawDate)}</span>
                      </div>
                    )}
                    {t.purchasedAt && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 10, color: '#4b5563', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Purchased</p>
                        <p style={{ fontSize: 11, color: '#6b7280', margin: '1px 0 0' }}>{fmtDate(t.purchasedAt)}</p>
                      </div>
                    )}
                    {t.payment?.approvedAt && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#34d399',
                        background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                        padding: '3px 8px', borderRadius: 6,
                      }}>
                        Paid
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
