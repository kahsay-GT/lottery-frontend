const STATUS_STYLES: Record<string, { bg: string; color: string; dot?: string }> = {
  ACTIVE:           { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', dot: '#34d399' },
  APPROVED:         { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', dot: '#34d399' },
  SOLD:             { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', dot: '#34d399' },
  SELLING:          { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', dot: '#34d399' },
  COMPLETED:        { bg: 'rgba(20,184,166,0.12)',  color: '#2dd4bf', dot: '#2dd4bf' },
  PUBLISHED:        { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8', dot: '#818cf8' },
  PENDING:          { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', dot: '#fbbf24' },
  AWAITING_PAYMENT: { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', dot: '#fbbf24' },
  SUBMITTED:        { bg: 'rgba(139,92,246,0.12)',  color: '#a78bfa', dot: '#a78bfa' },
  UNDER_REVIEW:     { bg: 'rgba(234,179,8,0.12)',   color: '#facc15', dot: '#facc15' },
  DRAFT:            { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' },
  INACTIVE:         { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' },
  SUSPENDED:        { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', dot: '#f87171' },
  REJECTED:         { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', dot: '#f87171' },
  CANCELLED:        { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
  EXPIRED:          { bg: 'rgba(75,85,99,0.15)',    color: '#6b7280' },
  CLOSED:           { bg: 'rgba(239,68,68,0.12)',   color: '#f87171' },
  DRAWING:          { bg: 'rgba(168,85,247,0.12)',  color: '#c084fc', dot: '#c084fc' },
  ARCHIVED:         { bg: 'rgba(55,65,81,0.2)',     color: '#6b7280' },
  REFUNDED:         { bg: 'rgba(139,92,246,0.12)',  color: '#a78bfa' },
  INITIATED:        { bg: 'rgba(239,68,68,0.10)',   color: '#f87171', dot: '#f87171' },
}

interface Props { status: string; label?: string; className?: string }

export function StatusBadge({ status, label, className }: Props) {
  const style = STATUS_STYLES[status] ?? { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' }
  return (
    <span
      className={`badge ${className ?? ''}`}
      style={{ background: style.bg, color: style.color }}
    >
      {style.dot && (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: style.dot, display: 'inline-block', marginRight: 1, flexShrink: 0 }} />
      )}
      {label ?? status}
    </span>
  )
}
