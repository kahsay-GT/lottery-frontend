import { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Column<T = any> {
  key: string
  header: string
  cell?: (row: T) => ReactNode
  className?: string
  width?: string
}

interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props<T = any> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  emptyMsg?: string
  meta?: Meta
  onPage?: (p: number) => void
  onRowClick?: (row: T) => void
  compact?: boolean
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 rounded-md animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: i === 0 ? '60%' : '80%' }} />
        </td>
      ))}
    </tr>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T = any>({
  columns, data, isLoading, emptyMsg = 'No records found',
  meta, onPage, onRowClick, compact = false,
}: Props<T>) {
  const cellPad = compact ? '10px 16px' : '13px 16px'

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-2xl" style={{ background: 'rgba(255,255,255,0.025)' }}>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.className ?? ''}
                  style={{
                    width: col.width,
                    padding: compact ? '10px 16px' : '12px 16px',
                    textAlign: 'left',
                    fontSize: 11, fontWeight: 700, color: '#6b7280',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16" style={{ color: '#4b5563', fontSize: '13.5px' }}>
                  <div className="flex flex-col items-center gap-2">
                    <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.04)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0H4" /></svg>
                    </div>
                    <span>{emptyMsg}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < data.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                  className="transition-colors"
                  onClick={() => onRowClick?.(row)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={col.className ?? ''}
                      style={{ fontSize: '13.5px', color: '#c8cad8', verticalAlign: 'middle', padding: cellPad }}
                    >
                      {col.cell ? col.cell(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPage?.(meta.page - 1)} disabled={meta.page <= 1} className="btn-icon">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span style={{ fontSize: '13px', color: '#9ca3af', padding: '0 8px', minWidth: 80, textAlign: 'center' }}>
              Page {meta.page} / {meta.totalPages}
            </span>
            <button onClick={() => onPage?.(meta.page + 1)} disabled={meta.page >= meta.totalPages} className="btn-icon">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
