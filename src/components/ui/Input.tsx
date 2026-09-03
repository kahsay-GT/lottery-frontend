import { forwardRef, InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, className, id, style, ...props }, ref) => {
    const iid = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div style={{ width: '100%' }}>
        {label && <label htmlFor={iid} className="label">{label}</label>}
        <input
          ref={ref}
          id={iid}
          className={`input-dark ${className ?? ''}`}
          style={{
            ...(error ? { borderColor: 'rgba(239,68,68,0.5)' } : {}),
            ...style,
          }}
          {...props}
        />
        {error && <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 4 }}>{error}</p>}
        {hint && !error && <p style={{ fontSize: 11.5, color: '#6b7280', marginTop: 4 }}>{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
