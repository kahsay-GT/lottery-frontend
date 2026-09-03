import { forwardRef, TextareaHTMLAttributes } from 'react'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, className, id, ...props }, ref) => {
    const iid = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div style={{ width: '100%' }}>
        {label && <label htmlFor={iid} className="label">{label}</label>}
        <textarea
          ref={ref}
          id={iid}
          className={`input-dark ${className ?? ''}`}
          style={{ height: 'auto', minHeight: 80, padding: '10px 12px', resize: 'vertical', lineHeight: 1.5, ...(error ? { borderColor: 'rgba(239,68,68,0.5)' } : {}) }}
          {...props}
        />
        {error && <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 4 }}>{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
