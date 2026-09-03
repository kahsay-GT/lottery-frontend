import { useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search, CheckCircle2, Clock, XCircle, Ticket,
  AlertCircle, RefreshCw, ShieldCheck, ShieldAlert,
  DollarSign, Calendar, Hash, ArrowRight, Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { paymentsApi } from '../../lib/api'
import { fmt$, fmtDateTime } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { useTrackPayment } from '../../hooks/useSocket'
import type { PaymentStatusPayload } from '../../hooks/useSocket'
import { PublicNav } from '../../components/layout/PublicNav'
import { useLang } from '../../context/LangContext'

type PaymentData = {
  id: string; referenceCode: string; amount: string|number; currency: string
  status: string; rejectionReason?: string|null; notes?: string|null
  createdAt: string; updatedAt: string
  lottery?: { id: string; name: string; slug: string }|null
  tickets?: { ticketNumber: string }[]
  metadata?: { verificationStatus?: string; verificationReason?: string; verifiedAt?: string; provider?: string; verifiedTransactionRef?: string; detectedAmount?: number }|null
}

function LiveDot({ active }: { active: boolean }) {
  const { t } = useLang()
  if (!active) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:99, background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.2)' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:'#34d399', animation:'pulse 1.5s ease-in-out infinite', display:'inline-block' }}/>
      <span style={{ fontSize:11.5, fontWeight:600, color:'#34d399' }}>{t('track','liveUpdates')}</span>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value, mono=false, copyable=false }: {
  icon: React.ElementType; label: string; value: string; mono?: boolean; copyable?: boolean
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon style={{ width:14, height:14, color:'#6b7280' }}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:10.5, color:'#6b7280', margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
        <p style={{ fontSize:13.5, color:'#e2e4ea', margin:0, fontFamily:mono?'monospace':undefined, letterSpacing:mono?'0.05em':undefined, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</p>
      </div>
      {copyable && (
        <button
          onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied!') }}
          style={{ padding:5, borderRadius:6, background:'none', border:'none', cursor:'pointer', color:'#4b5563', flexShrink:0 }}
          onMouseEnter={e => (e.currentTarget.style.color='#9ca3af')}
          onMouseLeave={e => (e.currentTarget.style.color='#4b5563')}
        >
          <Copy style={{ width:12, height:12 }}/>
        </button>
      )}
    </div>
  )
}

export function TrackPayment() {
  const { t } = useLang()
  const [params] = useSearchParams()
  const [code, setCode]         = useState(params.get('code') ?? '')
  const [search, setSearch]     = useState(params.get('code') ?? '')
  const [liveActive, setLiveActive] = useState(false)
  const qc = useQueryClient()

  const STATUS_CONFIG: Record<string, { icon: React.ElementType; iconColor: string; gradientFrom: string; gradientTo: string; border: string; message: string }> = {
    INITIATED:    { icon: Clock,        iconColor:'#9ca3af', gradientFrom:'rgba(107,114,128,0.15)', gradientTo:'rgba(75,85,99,0.08)',   border:'rgba(107,114,128,0.25)', message: t('track','statusInitiated')    },
    SUBMITTED:    { icon: Clock,        iconColor:'#fbbf24', gradientFrom:'rgba(245,158,11,0.15)',  gradientTo:'rgba(217,119,6,0.06)',  border:'rgba(245,158,11,0.3)',   message: t('track','statusSubmitted')    },
    UNDER_REVIEW: { icon: AlertCircle,  iconColor:'#60a5fa', gradientFrom:'rgba(59,130,246,0.15)',  gradientTo:'rgba(37,99,235,0.06)',  border:'rgba(59,130,246,0.3)',   message: t('track','statusUnderReview') },
    APPROVED:     { icon: CheckCircle2, iconColor:'#34d399', gradientFrom:'rgba(16,185,129,0.18)',  gradientTo:'rgba(5,150,105,0.06)',  border:'rgba(16,185,129,0.35)',  message: t('track','statusApproved')    },
    REJECTED:     { icon: XCircle,      iconColor:'#f87171', gradientFrom:'rgba(239,68,68,0.15)',   gradientTo:'rgba(220,38,38,0.06)',  border:'rgba(239,68,68,0.3)',    message: t('track','statusRejected')    },
    REFUNDED:     { icon: RefreshCw,    iconColor:'#a78bfa', gradientFrom:'rgba(139,92,246,0.15)',  gradientTo:'rgba(124,58,237,0.06)', border:'rgba(139,92,246,0.3)',   message: t('track','statusRefunded')    },
  }
  const VERIFY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    VERIFIED:       { icon: ShieldCheck, color:'#34d399', label: t('track','verifiedOnline')  },
    AUTO_APPROVED:  { icon: ShieldCheck, color:'#34d399', label: t('track','autoVerified')    },
    PENDING_MANUAL: { icon: ShieldAlert, color:'#fbbf24', label: t('track','pendingManual')   },
    FAILED:         { icon: ShieldAlert, color:'#f87171', label: t('track','verifyFailed')    },
    DUPLICATE:      { icon: ShieldAlert, color:'#f87171', label: t('track','duplicate')       },
  }

  const { data: pay, isLoading, isError, refetch } = useQuery<PaymentData>({
    queryKey: ['track', search],
    queryFn:  () => paymentsApi.track(search).then(r => r.data?.data),
    enabled: !!search, retry: false,
  })

  const handleLiveUpdate = useCallback((payload: PaymentStatusPayload) => {
    setLiveActive(true)
    qc.setQueryData(['track', search], (old: PaymentData|undefined) => {
      if (!old) return old
      return {
        ...old,
        status: payload.status,
        updatedAt: payload.updatedAt,
        rejectionReason: payload.rejectionReason ?? old.rejectionReason,
        tickets: payload.tickets ? payload.tickets.map(t => ({ ticketNumber: t })) : old.tickets,
        metadata: payload.verificationStatus
          ? { ...old.metadata, verificationStatus: payload.verificationStatus, verificationReason: payload.verificationReason }
          : old.metadata,
      }
    })
    if (payload.status === 'APPROVED')         toast.success(t('track','statusApproved'), { duration: 6000 })
    else if (payload.status === 'REJECTED')    toast.error(t('track','statusRejected') + ' ' + (payload.rejectionReason ?? ''))
    else if (payload.status === 'UNDER_REVIEW') toast.info(t('track','statusUnderReview'))
  }, [search, qc, t])

  useTrackPayment(search || undefined, handleLiveUpdate)

  const cfg        = pay ? (STATUS_CONFIG[pay.status] ?? STATUS_CONFIG.INITIATED) : null
  const verifyCfg  = pay?.metadata?.verificationStatus ? (VERIFY_CONFIG[pay.metadata.verificationStatus] ?? null) : null
  const hasTickets   = pay?.status === 'APPROVED' && (pay.tickets?.length ?? 0) > 0
  const hasRejection = pay?.status === 'REJECTED'
  const hasPending   = ['SUBMITTED','UNDER_REVIEW'].includes(pay?.status ?? '')

  return (
    <div style={{ minHeight:'100svh', background:'#08090f' }}>
      <PublicNav/>

      <main style={{ padding:'clamp(12px,2.5vw,28px) clamp(16px,4vw,24px) clamp(16px,3vw,32px)' }}>
        <div style={{ width:'100%', maxWidth:820, margin:'0 auto' }}>

          {/* ── Header ───────────────────────────────────────────── */}
          <div style={{ textAlign:'center', marginBottom:'clamp(12px,2vw,20px)' }}>
            <div style={{ width:44, height:44, borderRadius:14, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.22)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', boxShadow:'0 6px 20px rgba(99,102,241,0.18)' }}>
              <Search style={{ width:20, height:20, color:'#818cf8' }}/>
            </div>
            <h1 style={{ fontSize:'clamp(18px,3.5vw,24px)', fontWeight:800, color:'#fff', margin:'0 0 4px', letterSpacing:'-0.02em' }}>{t('track','title')}</h1>
            <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>{t('track','subtitle')}</p>
          </div>

          {/* ── Search bar ───────────────────────────────────────── */}
          <div style={{
            display:'flex', gap:8,
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.09)',
            borderRadius:18, padding:8,
            maxWidth:540, margin:'0 auto clamp(16px,2vw,24px)',
            boxShadow:'0 4px 24px rgba(0,0,0,0.3)',
          }}>
            <input
              className="input-dark"
              style={{ flex:1, fontFamily:'monospace', letterSpacing:'0.08em', textTransform:'uppercase', fontSize:15, height:42, background:'transparent', border:'none', boxShadow:'none', minWidth:0 }}
              placeholder={t('track','placeholder')}
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && setSearch(code)}
            />
            <button
              onClick={() => { setSearch(code); setLiveActive(false) }}
              disabled={!code.trim()}
              className="btn-primary"
              style={{ padding:'0 clamp(14px,3vw,24px)', height:42, borderRadius:12, fontSize:14, flexShrink:0, whiteSpace:'nowrap' }}
            >
              {t('track','trackBtn')}
            </button>
          </div>

          {/* ── Loading ──────────────────────────────────────────── */}
          {isLoading && (
            <div style={{ display:'flex', justifyContent:'center', padding:'48px 0' }}>
              <Spinner className="w-10 h-10"/>
            </div>
          )}

          {/* ── Not found ────────────────────────────────────────── */}
          {isError && search && (
            <div style={{ maxWidth:440, margin:'0 auto', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:18, padding:'28px 24px', textAlign:'center' }}>
              <XCircle style={{ width:40, height:40, color:'#f87171', margin:'0 auto 12px' }}/>
              <p style={{ fontSize:15, color:'#fca5a5', margin:'0 0 6px', fontWeight:700 }}>{t('track','notFound')}</p>
              <p style={{ fontSize:13, color:'#6b7280', margin:0, lineHeight:1.6 }}>{t('track','notFoundSub').replace('{code}', search)}</p>
            </div>
          )}

          {/* ── Result card ──────────────────────────────────────── */}
          {pay && cfg && (
            <div style={{
              background:'rgba(255,255,255,0.025)',
              border:`1px solid ${cfg.border}`,
              borderRadius:22,
              overflow:'hidden',
              boxShadow:`0 0 60px ${cfg.gradientFrom}, 0 2px 40px rgba(0,0,0,0.4)`,
              animation:'fadeIn 0.3s ease',
            }}>
              {/* ── Status banner ──────────────────────────────── */}
              <div style={{
                padding:'clamp(14px,2vw,18px) clamp(16px,2.5vw,22px)',
                background:`linear-gradient(135deg, ${cfg.gradientFrom} 0%, ${cfg.gradientTo} 100%)`,
                borderBottom:`1px solid ${cfg.border}`,
                display:'flex', alignItems:'center', gap:16, flexWrap:'wrap',
              }}>
                <div style={{ width:42, height:42, borderRadius:'50%', background:cfg.gradientFrom, border:`2px solid ${cfg.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 4px 20px ${cfg.gradientFrom}` }}>
                  <cfg.icon style={{ width:22, height:22, color:cfg.iconColor }}/>
                </div>
                <div style={{ flex:1, minWidth:180 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                    <StatusBadge status={pay.status}/>
                    <LiveDot active={liveActive}/>
                  </div>
                  <p style={{ fontSize:'clamp(12px,2vw,13.5px)', color:'#9ca3af', margin:0, lineHeight:1.55 }}>{cfg.message}</p>
                </div>
                <button
                  onClick={() => refetch()}
                  style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#4b5563', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'6px 12px', cursor:'pointer', flexShrink:0, transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color='#9ca3af'; e.currentTarget.style.background='rgba(255,255,255,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.color='#4b5563'; e.currentTarget.style.background='rgba(255,255,255,0.05)' }}
                >
                  <RefreshCw style={{ width:12, height:12 }}/> {t('track','refresh')}
                </button>
              </div>

              {/* ── Two-column body ──────────────────────────────── */}
              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                gap:0,
              }}>
                {/* Left — details */}
                <div style={{ padding:'clamp(12px,2vw,18px)', borderRight:'1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize:10.5, fontWeight:700, color:'#4b5563', textTransform:'uppercase', letterSpacing:'0.08em', margin:'0 0 4px' }}>
                    {t('track','refCode')}
                  </p>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                    <span style={{ fontFamily:'monospace', fontWeight:900, fontSize:'clamp(14px,2.5vw,18px)', color:'#818cf8', letterSpacing:'0.1em' }}>{pay.referenceCode}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(pay.referenceCode); toast.success('Copied!') }}
                      style={{ padding:5, borderRadius:6, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.2)', cursor:'pointer', color:'#818cf8', flexShrink:0 }}
                    >
                      <Copy style={{ width:12, height:12 }}/>
                    </button>
                  </div>
                  <DetailRow icon={DollarSign} label={t('track','amount')}      value={fmt$(Number(pay.amount))}/>
                  <DetailRow icon={Ticket}     label={t('track','lottery')}     value={pay.lottery?.name ?? '—'}/>
                  <DetailRow icon={Calendar}   label={t('track','submitted')}   value={fmtDateTime(pay.createdAt)}/>
                  <DetailRow icon={Calendar}   label={t('track','lastUpdated')} value={fmtDateTime(pay.updatedAt)}/>
                </div>

                {/* Right — status-specific content */}
                <div style={{ padding:'clamp(12px,2vw,18px)', display:'flex', flexDirection:'column', gap:16 }}>

                  {/* Tickets */}
                  {hasTickets && (
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, color:'#34d399', margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.07em', display:'flex', alignItems:'center', gap:5 }}>
                        <Ticket style={{ width:12, height:12 }}/> {t('track','yourTickets')}
                      </p>
                      <div style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.18)', borderRadius:14, padding:'14px 16px' }}>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                          {pay.tickets!.map(t2 => (
                            <span key={t2.ticketNumber} style={{ fontFamily:'monospace', fontWeight:800, fontSize:'clamp(12px,2.5vw,15px)', background:'rgba(16,185,129,0.15)', color:'#6ee7b7', border:'1px solid rgba(16,185,129,0.25)', padding:'5px 10px', borderRadius:8, letterSpacing:'0.1em' }}>
                              #{t2.ticketNumber}
                            </span>
                          ))}
                        </div>
                        {pay.lottery?.slug && (
                          <Link to={`/lotteries/${pay.lottery.slug}`} style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:14, fontSize:13, color:'#34d399', textDecoration:'none', fontWeight:600 }}>
                            {t('track','viewLottery')} <ArrowRight style={{ width:12, height:12 }}/>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Approved but no tickets yet */}
                  {pay.status === 'APPROVED' && !hasTickets && (
                    <div style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.18)', borderRadius:14, padding:'20px', textAlign:'center' }}>
                      <CheckCircle2 style={{ width:32, height:32, color:'#34d399', margin:'0 auto 10px' }}/>
                      <p style={{ fontSize:14, fontWeight:700, color:'#34d399', margin:'0 0 4px' }}>{t('track','allSet')}</p>
                      <p style={{ fontSize:13, color:'#9ca3af', margin:0, lineHeight:1.6 }}>{t('track','allSetSub')}</p>
                    </div>
                  )}

                  {/* Rejected */}
                  {hasRejection && (
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, color:'#f87171', margin:'0 0 10px', textTransform:'uppercase', letterSpacing:'0.07em', display:'flex', alignItems:'center', gap:5 }}>
                        <XCircle style={{ width:12, height:12 }}/> {t('track','rejectionReason')}
                      </p>
                      <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:14, padding:'14px 16px' }}>
                        <p style={{ fontSize:13.5, color:'#fca5a5', margin:0, lineHeight:1.6 }}>{pay.rejectionReason || pay.notes || 'No reason provided.'}</p>
                      </div>
                      <p style={{ fontSize:12.5, color:'#6b7280', marginTop:12, lineHeight:1.6 }}>{t('track','contactOperator')}</p>
                    </div>
                  )}

                  {/* Verification badge */}
                  {verifyCfg && pay.status === 'UNDER_REVIEW' && (
                    <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: pay.metadata?.verificationReason ? 8 : 0 }}>
                        <verifyCfg.icon style={{ width:16, height:16, color:verifyCfg.color, flexShrink:0 }}/>
                        <span style={{ fontSize:13, fontWeight:600, color:verifyCfg.color }}>{verifyCfg.label}</span>
                        {pay.metadata?.provider && pay.metadata.provider !== 'UNKNOWN' && (
                          <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6b7280', background:'rgba(255,255,255,0.06)', padding:'2px 8px', borderRadius:99 }}>{pay.metadata.provider}</span>
                        )}
                      </div>
                      {pay.metadata?.verificationReason && (
                        <p style={{ fontSize:12.5, color:'#9ca3af', margin:0, lineHeight:1.6 }}>{pay.metadata.verificationReason.split(/[.!]/)[0].trim()}.</p>
                      )}
                      {pay.metadata?.verifiedTransactionRef && (
                        <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:12 }}>
                          <span style={{ color:'#6b7280' }}>Txn Ref</span>
                          <span style={{ fontFamily:'monospace', color:'#c8cad8' }}>{pay.metadata.verifiedTransactionRef}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pending — what happens next */}
                  {hasPending && (
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, color:'#60a5fa', margin:'0 0 12px', textTransform:'uppercase', letterSpacing:'0.07em' }}>{t('track','whatNext')}</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {([
                          { n:'1', label: t('track','slipUploaded'),     done: true },
                          { n:'2', label: t('track','adminReviews'),     done: pay.status === 'UNDER_REVIEW' },
                          { n:'3', label: t('track','ticketsConfirmed'), done: false },
                        ] as { n: string; label: string; done: boolean }[]).map(({ n, label, done }) => (
                          <div key={n} style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background:done?'rgba(52,211,153,0.2)':'rgba(255,255,255,0.06)', border:`1px solid ${done?'rgba(52,211,153,0.4)':'rgba(255,255,255,0.1)'}`, color:done?'#34d399':'#6b7280' }}>
                              {done ? '✓' : n}
                            </div>
                            <span style={{ fontSize:13, color:done?'#c8cad8':'#6b7280', fontWeight:done?500:400 }}>{label}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize:12, color:'#4b5563', marginTop:14, lineHeight:1.6 }}>
                        {t('track','reviewTime').replace(t('track','within24hrs'), `<strong style="color:#6b7280">${t('track','within24hrs')}</strong>`)}
                      </p>
                    </div>
                  )}

                  {/* Initiated — upload slip prompt */}
                  {pay.status === 'INITIATED' && (
                    <div style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.18)', borderRadius:14, padding:'20px', textAlign:'center' }}>
                      <p style={{ fontSize:14, fontWeight:700, color:'#a5b4fc', margin:'0 0 8px' }}>{t('track','nextUploadSlip')}</p>
                      <p style={{ fontSize:13, color:'#6b7280', margin:'0 0 16px', lineHeight:1.6 }}>{t('track','uploadSlipMsg')}</p>
                      {pay.lottery?.slug && (
                        <Link to={`/lotteries/${pay.lottery.slug}`} className="btn-primary" style={{ display:'inline-flex', gap:6, fontSize:13, padding:'9px 20px', textDecoration:'none', borderRadius:10 }}>
                          {t('track','goToLottery')} <ArrowRight style={{ width:13, height:13 }}/>
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Refunded */}
                  {pay.status === 'REFUNDED' && (
                    <div style={{ background:'rgba(139,92,246,0.07)', border:'1px solid rgba(139,92,246,0.18)', borderRadius:14, padding:'20px', textAlign:'center' }}>
                      <RefreshCw style={{ width:28, height:28, color:'#a78bfa', margin:'0 auto 10px' }}/>
                      <p style={{ fontSize:14, fontWeight:700, color:'#c4b5fd', margin:'0 0 4px' }}>{t('track','refunded')}</p>
                      <p style={{ fontSize:13, color:'#9ca3af', margin:0, lineHeight:1.6 }}>{t('track','refundedMsg')}</p>
                    </div>
                  )}

                  {/* Empty right panel fallback */}
                  {!hasTickets && !hasRejection && !hasPending && pay.status !== 'INITIATED' && pay.status !== 'REFUNDED' && pay.status !== 'APPROVED' && (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, opacity:0.4, padding:'24px 0' }}>
                      <AlertCircle style={{ width:32, height:32, color:'#6b7280', marginBottom:8 }}/>
                      <p style={{ fontSize:13, color:'#6b7280', margin:0 }}>No additional details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  )
}
