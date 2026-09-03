import { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  iconBg?: string
  iconColor?: string
  trend?: { value: number; label: string }
  className?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, iconBg = 'bg-indigo-500/15', iconColor = 'text-indigo-400', trend, className }: Props) {
  return (
    <div className={`stat-card ${className ?? ''}`}>
      {Icon && (
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p style={{ fontSize: '11.5px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
          {title}
        </p>
        <p style={{ fontSize: '24px', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
          {value}
        </p>
        {subtitle && <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 3 }}>{subtitle}</p>}
        {trend && (
          <p style={{ fontSize: '12px', fontWeight: 600, marginTop: 4, color: trend.value >= 0 ? '#34d399' : '#f87171' }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}
