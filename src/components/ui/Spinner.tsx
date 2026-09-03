import { CSSProperties } from 'react'

export function Spinner({
  className,
  size = 16,
  style,
}: {
  className?: string
  size?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      className={className}
      style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0, ...style }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
