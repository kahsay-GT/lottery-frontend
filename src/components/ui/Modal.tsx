'use client'
import { useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm: 440, md: 540, lg: 680, xl: 860 }

export function Modal({ open, onClose, title, description, children, size = 'md' }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) { document.addEventListener('keydown', h); document.body.style.overflow = 'hidden' }
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      />
      {/* Panel */}
      <div
        className="animate-slide-up"
        style={{
          position: 'relative', zIndex: 10, width: '100%', maxWidth: sizes[size],
          background: '#13141f', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
        role="dialog" aria-modal="true"
      >
        {/* Header */}
        {(title || description) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              {title && <h2 style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h2>}
              {description && <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0 0' }}>{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="btn-icon"
              style={{ marginLeft: 12, marginTop: -2, flexShrink: 0 }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Body */}
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}
