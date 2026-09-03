/**
 * SlipViewer
 *
 * Fullscreen payment-slip viewer with:
 *   – Scroll-wheel zoom (Ctrl+Wheel or plain Wheel)
 *   – Pinch-to-zoom on mobile (touch events)
 *   – Click-and-drag to pan when zoomed
 *   – Double-click to toggle fit ↔ 200 %
 *   – Keyboard: Escape → close, +/- → zoom, 0 → reset
 *   – Animated zoom level pill in the corner
 *   – Download button
 *   – Works with both image and PDF blobs
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { FileText, Download, X, ImageOff, Loader2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface Props {
  /** Object URL (blob:) or data URL for the slip */
  blobUrl: string | null
  mimeType?: string
  loading?: boolean
  error?: boolean
  /** File name used for the download attribute */
  fileName?: string
  onClose: () => void
}

const MIN_SCALE = 0.5
const MAX_SCALE = 8
const STEP      = 0.25

function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)) }

export function SlipViewer({ blobUrl, mimeType = 'image/jpeg', loading = false, error = false, fileName, onClose }: Props) {
  const isPdf  = mimeType.includes('pdf')
  const isImg  = !isPdf

  // ── Zoom / pan state ──────────────────────────────────────────────────────
  const [scale, setScale]   = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [showHint, setShowHint] = useState(true)     // "scroll to zoom" hint

  const dragging    = useRef(false)
  const lastPos     = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef       = useRef<HTMLImageElement>(null)

  // Hide hint after 2.5 s
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 2500)
    return () => clearTimeout(t)
  }, [])

  // Reset when a new blob arrives
  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [blobUrl])

  // ── Close on Escape, +/- / 0 to zoom ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (!isImg) return
      if (e.key === '+' || e.key === '=') setScale(s => clamp(s + STEP, MIN_SCALE, MAX_SCALE))
      if (e.key === '-')                   setScale(s => clamp(s - STEP, MIN_SCALE, MAX_SCALE))
      if (e.key === '0')                  { setScale(1); setOffset({ x: 0, y: 0 }) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, isImg])

  // ── Wheel zoom (zoom toward cursor) ──────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!isImg || !blobUrl) return
    e.preventDefault()
    const delta   = e.deltaY < 0 ? STEP : -STEP
    const next    = clamp(scale + delta, MIN_SCALE, MAX_SCALE)

    if (containerRef.current && imgRef.current) {
      const rect  = containerRef.current.getBoundingClientRect()
      const cx    = e.clientX - rect.left - rect.width  / 2
      const cy    = e.clientY - rect.top  - rect.height / 2
      const ratio = next / scale
      setOffset(o => ({ x: cx + (o.x - cx) * ratio, y: cy + (o.y - cy) * ratio }))
    }
    setScale(next)
    setShowHint(false)
  }, [isImg, blobUrl, scale])

  // ── Mouse drag to pan ────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1 || !isImg) return
    dragging.current = true
    lastPos.current  = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }, [scale, isImg])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setOffset(o => ({ x: o.x + dx, y: o.y + dy }))
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = false }, [])

  // ── Touch pinch-to-zoom ───────────────────────────────────────────────────
  const lastTouchDist = useRef<number | null>(null)
  const onTouchStart  = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.hypot(dx, dy)
    }
  }, [])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX
      const dy   = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const ratio = dist / lastTouchDist.current
      lastTouchDist.current = dist
      setScale(s => clamp(s * ratio, MIN_SCALE, MAX_SCALE))
      e.preventDefault()
    }
  }, [])
  const onTouchEnd = useCallback(() => { lastTouchDist.current = null }, [])

  // ── Double-click to toggle fit ↔ 2× ─────────────────────────────────────
  const onDblClick = useCallback(() => {
    if (!isImg) return
    if (scale > 1.1) { setScale(1); setOffset({ x: 0, y: 0 }) }
    else             { setScale(2) }
  }, [scale, isImg])

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }) }

  const scalePct = Math.round(scale * 100)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column',
        animation: 'slipFadeIn 0.2s ease',
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', flexShrink: 0,
        background: 'rgba(13,14,26,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Left: title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText style={{ width: 16, height: 16, color: '#818cf8' }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>Payment Slip</p>
            {isImg && blobUrl && (
              <p style={{ fontSize: 11, color: '#4b5563', margin: 0 }}>
                Scroll to zoom · drag to pan · double-click to fit
              </p>
            )}
          </div>
        </div>

        {/* Right: zoom controls + download + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isImg && blobUrl && (
            <>
              {/* Zoom out */}
              <button
                onClick={() => setScale(s => clamp(s - STEP, MIN_SCALE, MAX_SCALE))}
                disabled={scale <= MIN_SCALE}
                title="Zoom out  (−)"
                style={iconBtn}
              >
                <ZoomOut style={{ width: 15, height: 15 }} />
              </button>

              {/* Zoom level pill — click to reset */}
              <button
                onClick={reset}
                title="Reset zoom (0)"
                style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                  background: scale !== 1 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                  color: scale !== 1 ? '#a5b4fc' : '#6b7280',
                  minWidth: 52, textAlign: 'center', transition: 'all 0.15s',
                  fontFamily: 'monospace',
                }}
              >
                {scalePct}%
              </button>

              {/* Zoom in */}
              <button
                onClick={() => setScale(s => clamp(s + STEP, MIN_SCALE, MAX_SCALE))}
                disabled={scale >= MAX_SCALE}
                title="Zoom in  (+)"
                style={iconBtn}
              >
                <ZoomIn style={{ width: 15, height: 15 }} />
              </button>

              {/* Fit */}
              <button onClick={reset} title="Fit to screen" style={iconBtn}>
                <Maximize2 style={{ width: 14, height: 14 }} />
              </button>

              <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
            </>
          )}

          {blobUrl && (
            <a
              href={blobUrl}
              download={fileName ?? `slip.${isPdf ? 'pdf' : 'jpg'}`}
              title="Download"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                borderRadius: 9, fontSize: 12.5, fontWeight: 600, textDecoration: 'none',
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                color: '#818cf8', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.28)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')}
            >
              <Download style={{ width: 13, height: 13 }} /> Download
            </a>
          )}

          <button
            onClick={onClose}
            title="Close  (Esc)"
            style={{
              ...iconBtn,
              marginLeft: 4,
              background: 'rgba(239,68,68,0.1)',
              borderColor: 'rgba(239,68,68,0.2)',
              color: '#f87171',
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* ── Image canvas ────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onDoubleClick={onDblClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          flex: 1, overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: loading || error ? 'default' : scale > 1 ? 'grab' : 'zoom-in',
          userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 style={{ width: 26, height: 26, color: '#818cf8', animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ fontSize: 13.5, color: '#6b7280', margin: 0 }}>Loading slip…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ImageOff style={{ width: 26, height: 26, color: '#f87171' }} />
            </div>
            <p style={{ fontSize: 14, color: '#f87171', fontWeight: 600, margin: 0 }}>Couldn't load slip</p>
            <p style={{ fontSize: 12.5, color: '#6b7280', margin: 0 }}>The file may have been deleted or is unavailable</p>
          </div>
        )}

        {/* PDF */}
        {blobUrl && !error && isPdf && (
          <iframe
            src={blobUrl}
            title="Payment slip PDF"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}

        {/* Image with transform */}
        {blobUrl && !error && isImg && (
          <img
            ref={imgRef}
            src={blobUrl}
            alt="Payment slip"
            draggable={false}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: scale <= 1 ? 12 : 4,
              boxShadow: scale <= 1
                ? '0 8px 40px rgba(0,0,0,0.6)'
                : '0 2px 20px rgba(0,0,0,0.4)',
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'center center',
              transition: dragging.current ? 'none' : 'transform 0.12s ease, border-radius 0.2s',
              willChange: 'transform',
            }}
          />
        )}

        {/* Scroll-to-zoom hint */}
        {showHint && isImg && blobUrl && !loading && !error && (
          <div style={{
            position: 'absolute', bottom: 20,
            left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 99, padding: '7px 18px',
            fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap',
            animation: 'slipHintFade 2.5s ease forwards',
            pointerEvents: 'none',
          }}>
            🖱 Scroll to zoom · drag to pan · double-click to fit
          </div>
        )}

        {/* Zoom level overlay — shown when zoomed in */}
        {isImg && scale !== 1 && blobUrl && (
          <div style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '4px 10px',
            fontSize: 11.5, fontWeight: 700, color: '#a5b4fc',
            fontFamily: 'monospace', pointerEvents: 'none',
            backdropFilter: 'blur(4px)',
          }}>
            {scalePct}%
          </div>
        )}
      </div>

      {/* ── Footer hint for admin ────────────────────────────────────────── */}
      {blobUrl && !error && isImg && (
        <div style={{
          padding: '10px 20px', flexShrink: 0, textAlign: 'center',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(13,14,26,0.8)',
          fontSize: 12, color: '#374151',
        }}>
          ✓ Verify: correct amount · correct account · reference code visible
        </div>
      )}

      <style>{`
        @keyframes slipFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slipHintFade {
          0%   { opacity: 0;   transform: translateX(-50%) translateY(6px); }
          15%  { opacity: 1;   transform: translateX(-50%) translateY(0); }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─── shared icon button style ─────────────────────────────────────────────────
const iconBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  cursor: 'pointer', color: '#9ca3af', flexShrink: 0, transition: 'all 0.15s',
}
