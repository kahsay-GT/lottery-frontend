import logoSrc from '../../assets/logo.png'

interface LogoProps {
  /** Height in px — width scales automatically. Default 36 */
  height?: number
  /** Extra inline styles on the <img> */
  style?: React.CSSProperties
  className?: string
}

export function Logo({ height = 36, style, className }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Edilegna Lottery"
      height={height}
      style={{ height, width: 'auto', display: 'block', objectFit: 'contain', ...style }}
      className={className}
    />
  )
}
