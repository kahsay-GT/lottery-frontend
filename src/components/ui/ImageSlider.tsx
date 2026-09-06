/**
 * ImageSlider — two variants:
 *
 * <CardSlider>   compact auto-sliding strip for lottery cards (stops on hover)
 * <DetailSlider> full-width hero slider with arrows + dots for detail pages
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Ticket } from 'lucide-react'

export type SliderImage = { id: string; url: string }

// ─── helpers ──────────────────────────────────────────────────────────────────

function resolveUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  // Relative paths like /api/v1/files/download/:id must go to the backend port
  const backendBase = import.meta.env.VITE_API_URL
    ? new URL(import.meta.env.VITE_API_URL).origin
    : `${window.location.protocol}//${window.location.hostname}:3000`
  return `${backendBase}${url}`
}

// ─── Card Slider (used inside public lottery cards) ───────────────────────────

interface CardSliderProps {
  images: SliderImage[]
  /** gradient fallback class when no images */
  gradientClass?: string
  alt?: string
}

export function CardSlider({ images, gradientClass = 'from-indigo-900/80 via-purple-900/60', alt = 'Lottery' }: CardSliderProps) {
  const [idx, setIdx]       = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef            = useRef<ReturnType<typeof setInterval>>()

  const count = images.length

  const next = useCallback(() => setIdx(i => (i + 1) % count), [count])
  const prev = useCallback(() => setIdx(i => (i - 1 + count) % count), [count])

  // Auto-advance every 3 s, pause on hover
  useEffect(() => {
    if (count <= 1 || paused) return
    timerRef.current = setInterval(next, 3000)
    return () => clearInterval(timerRef.current)
  }, [count, paused, next])

  // No images — render gradient placeholder (slots let parent overlay badges etc.)
  if (count === 0) {
    return (
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
    )
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {images.map((img, i) => (
        <img
          key={img.id}
          src={resolveUrl(img.url)}
          alt={`${alt} ${i + 1}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 w-full h-full transition-opacity duration-700"
          style={{
            opacity: i === idx ? 1 : 0,
            zIndex: i === idx ? 1 : 0,
            objectFit: 'cover',
            objectPosition: 'center center',
          }}
          draggable={false}
        />
      ))}

      {/* Dark gradient overlay so text on top stays readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%, transparent 100%)',
        }}
      />

      {/* Prev / Next arrows — only when hovering and >1 image */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); prev() }}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            style={{ zIndex: 3, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)' }}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-white" />
          </button>
          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); next() }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
            style={{ zIndex: 3, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)' }}
            aria-label="Next image"
          >
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </>
      )}

      {/* Dots */}
      {count > 1 && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1"
          style={{ zIndex: 3 }}
        >
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); setIdx(i) }}
              aria-label={`Go to image ${i + 1}`}
              style={{
                width:  i === idx ? 16 : 6,
                height: 6,
                borderRadius: 99,
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.35)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Detail Slider (hero banner on lottery detail page) ───────────────────────

interface DetailSliderProps {
  images: SliderImage[]
  banner?: string | null   // legacy single banner fallback
  alt?: string
}

export function DetailSlider({ images, banner, alt = 'Lottery' }: DetailSliderProps) {
  // Merge legacy banner into images list if no images exist
  const slides: SliderImage[] = images.length > 0
    ? images
    : banner
      ? [{ id: '__banner__', url: banner }]
      : []

  const [idx, setIdx]       = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef            = useRef<ReturnType<typeof setInterval>>()
  const count               = slides.length

  const next = useCallback(() => setIdx(i => (i + 1) % count), [count])
  const prev = useCallback(() => setIdx(i => (i - 1 + count) % count), [count])

  useEffect(() => {
    if (count <= 1 || paused) return
    timerRef.current = setInterval(next, 4000)
    return () => clearInterval(timerRef.current)
  }, [count, paused, next])

  // No images at all — render nothing (parent shows its own fallback)
  if (count === 0) return null

  return (
    <div
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((img, i) => (
        <img
          key={img.id}
          src={resolveUrl(img.url)}
          alt={`${alt} ${i + 1}`}
          fetchpriority={i === 0 ? 'high' : 'low'}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding={i === 0 ? 'sync' : 'async'}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center center',
            opacity: i === idx ? 1 : 0,
            transition: 'opacity 0.7s ease',
            display: 'block',
          }}
          draggable={false}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      ))}

      {/* Overlay gradient — only at the very bottom for text legibility */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, transparent 0%, transparent 50%, rgba(0,0,0,0.45) 100%)',
          zIndex: 2,
        }}
      />

      {/* Arrows */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous image"
            style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.55)', cursor: 'pointer', zIndex: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')}
          >
            <ChevronLeft style={{ width: 20, height: 20, color: '#fff', display: 'block' }} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next image"
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.55)', cursor: 'pointer', zIndex: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.55)')}
          >
            <ChevronRight style={{ width: 20, height: 20, color: '#fff', display: 'block' }} />
          </button>
        </>
      )}

      {/* Dots */}
      {count > 1 && (
        <div
          style={{
            position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 6, zIndex: 4,
          }}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Go to image ${i + 1}`}
              style={{
                width: i === idx ? 24 : 8, height: 8, borderRadius: 99,
                background: i === idx ? '#fff' : 'rgba(255,255,255,0.35)',
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'all 0.35s', display: 'block',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Admin / Client image-manager strip ──────────────────────────────────────

interface ImageManagerProps {
  lotteryId: string
  images: SliderImage[]
  onUpload: (file: File) => Promise<void>
  onDelete: (imageId: string) => Promise<void>
  uploading?: boolean
  maxImages?: number
}

export function ImageManager({
  images,
  onUpload,
  onDelete,
  uploading = false,
  maxImages = 10,
}: ImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { onUpload(f); e.target.value = '' }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) onUpload(f)
  }

  const canAdd = images.length < maxImages

  return (
    <div className="space-y-3">
      {/* Thumbnails grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="relative rounded-xl overflow-hidden border border-white/10 group"
              style={{ aspectRatio: '4/3' }}
            >
              <img
                src={resolveUrl(img.url)}
                alt={`Image ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {/* order badge */}
              <span
                className="absolute top-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(0,0,0,0.65)', color: '#e2e4ea' }}
              >
                {i + 1}
              </span>
              {/* delete button */}
              <button
                type="button"
                onClick={() => onDelete(img.id)}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(239,68,68,0.65)' }}
                aria-label="Delete image"
              >
                <span className="text-white text-xs font-bold">✕ Remove</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / add button */}
      {canAdd && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-white/15 hover:border-primary-500/50 hover:bg-white/3 transition-all cursor-pointer flex items-center justify-center gap-3 p-5"
          >
            {uploading ? (
              <span className="text-sm text-gray-400 animate-pulse">Uploading…</span>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-primary-600/15 flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Add image{' '}
                    <span className="text-gray-500 font-normal text-xs">
                      ({images.length}/{maxImages})
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">Click or drop · JPG, PNG, WebP · max 10 MB</p>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {!canAdd && (
        <p className="text-xs text-amber-400 text-center">
          Maximum {maxImages} images reached. Remove one to add another.
        </p>
      )}
    </div>
  )
}
