import { forwardRef, SelectHTMLAttributes } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const iid = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div style={{ width: '100%' }}>
        {label && <label htmlFor={iid} className="label">{label}</label>}
        <select
          ref={ref}
          id={iid}
          className={`input-dark ${className ?? ''}`}
          style={error ? { borderColor: 'rgba(239,68,68,0.5)' } : {}}
          {...props}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {error && <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 4 }}>{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
