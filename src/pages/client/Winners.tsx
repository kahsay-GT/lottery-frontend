import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Ticket, CheckCircle2, Shield } from 'lucide-react'
import { lotteriesApi, drawsApi } from '../../lib/api'
import { fmtDate, fmt$ } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { StatCard } from '../../components/ui/StatCard'

export function ClientWinners() {
  const [selectedId, setSelectedId] = useState('')
  const [verifyOpen, setVerifyOpen] = useState(false)

  const { data: lotsRes } = useQuery({ queryKey: ['lots-all'], queryFn: () => lotteriesApi.list({ page: 1, limit: 100 }).then(r => r.data?.data) })
  const lots = ((lotsRes?.data ?? lotsRes ?? []) as Record<string, unknown>[])
    .filter(l => ['DRAWING', 'COMPLETED'].includes(l.status as string))

  const { data: drawRes, isLoading: drawLoading } = useQuery({
    queryKey: ['draw-results', selectedId],
    queryFn: () => drawsApi.results(selectedId).then(r => r.data?.data),
    enabled: !!selectedId,
  })
  const draw = drawRes
  const winners = (draw?.winners ?? []) as Record<string, unknown>[]

  const { data: verRes, isLoading: verLoading, refetch } = useQuery({
    queryKey: ['verify', selectedId],
    queryFn: () => drawsApi.verify(selectedId).then(r => r.data?.data),
    enabled: false,
  })
  const verify = verRes

  const medals = [
    { e: '🥇', c: 'from-yellow-600/30', b: 'border-yellow-500/30', lc: 'text-yellow-300' },
    { e: '🥈', c: 'from-slate-500/30', b: 'border-slate-400/30', lc: 'text-gray-300' },
    { e: '🥉', c: 'from-orange-700/30', b: 'border-orange-500/30', lc: 'text-orange-300' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-400" />Winners</h1>
          <p className="text-sm text-gray-400">View draw results and verify integrity</p>
        </div>
        {selectedId && draw && (
          <button onClick={() => { setVerifyOpen(true); refetch() }}
            className="btn-secondary flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4" /> Verify Draw
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Completed Draws" value={lots.length} icon={Trophy} iconBg="bg-yellow-500/20" iconColor="text-yellow-400" />
        <StatCard title="Winners Selected" value={winners.length} icon={CheckCircle2} iconBg="bg-emerald-500/20" iconColor="text-emerald-400" />
        <StatCard title="Total Lotteries" value={lots.length} icon={Ticket} iconBg="bg-primary-500/20" iconColor="text-primary-400" />
      </div>

      {/* Lottery selector */}
      <div className="glass-card p-6">
        <h2 className="section-title mb-4">Select Lottery to View Results</h2>
        {lots.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No completed draws yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lots.map(l => (
              <button key={l.id as string} onClick={() => setSelectedId(l.id as string)}
                className={`flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 text-left transition-all hover:shadow-lg ${selectedId === l.id ? 'border-primary-500 bg-primary-500/10' : 'border-white/10 hover:border-white/25 glass'}`}>
                <div className="flex w-full items-center justify-between">
                  <p className="font-semibold text-white text-sm truncate max-w-[140px]">{l.name as string}</p>
                  <StatusBadge status={l.status as string} className="text-xs" />
                </div>
                <p className="text-xs text-gray-400">Draw: {fmtDate(l.drawDate as string)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Winners */}
      {selectedId && (
        drawLoading ? <div className="flex justify-center py-10"><Spinner className="w-8 h-8" /></div>
        : winners.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No winners yet — execute the draw first</p>
          </div>
        ) : (
          <div className="space-y-4">
            {draw?.draw && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-300">Cryptographic Draw Hash</p>
                  <p className="text-xs font-mono text-emerald-400 truncate">{(draw.draw as Record<string,string>).hash}</p>
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {winners.map((w, i) => {
                const m = medals[i] ?? { e: '🏅', c: 'from-primary-600/20', b: 'border-primary-500/20', lc: 'text-primary-300' }
                const prize = w.prize as Record<string, unknown>
                const tkt = w.ticket as Record<string, unknown>
                return (
                  <div key={i} className={`rounded-2xl bg-gradient-to-br ${m.c} to-transparent border-2 ${m.b} p-5`}>
                    <div className="flex items-start gap-3">
                      <span className="text-4xl">{m.e}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold ${m.lc}`}>{prize?.title as string ?? 'Prize'}</p>
                        <p className="text-xs font-mono text-gray-400 mt-0.5">Ticket #{tkt?.ticketNumber as string}</p>
                        {prize?.prizeValue !== undefined && <p className="text-sm font-bold text-white mt-1">{fmt$(Number(prize.prizeValue))}</p>}
                        {w.publishedAt ? <p className="text-xs text-gray-400 mt-1">Published {fmtDate(w.publishedAt as string)}</p> : <span className="text-xs text-amber-300">Not published</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* Verify Modal */}
      <Modal open={verifyOpen} onClose={() => setVerifyOpen(false)} title="Draw Verification" size="md">
        {verLoading ? <div className="flex justify-center py-8"><Spinner /></div> : verify && (
          <div className="space-y-4">
            <div className={`flex items-center gap-4 p-5 rounded-2xl ${verify.verified ? 'bg-emerald-500/10 border-2 border-emerald-500/30' : 'bg-red-500/10 border-2 border-red-500/30'}`}>
              <CheckCircle2 className={`w-10 h-10 ${verify.verified ? 'text-emerald-400' : 'text-red-400'}`} />
              <div>
                <p className={`text-xl font-black ${verify.verified ? 'text-emerald-300' : 'text-red-300'}`}>{verify.verified ? 'Verified ✓' : 'Failed ✗'}</p>
                <p className="text-sm text-gray-400">{verify.verified ? 'Draw is authentic — hashes match' : 'Tampering detected'}</p>
              </div>
            </div>
            {[['Algorithm', verify.algorithm], ['Stored Hash', verify.storedHash], ['Computed Hash', verify.computedHash]].map(([k, v]) => (
              <div key={String(k)} className="rounded-xl bg-white/4 p-3">
                <p className="text-xs text-gray-400 mb-1">{String(k)}</p>
                <p className="text-xs font-mono text-gray-200 break-all">{String(v)}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
