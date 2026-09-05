/**
 * /:username  — Public operator profile page
 *
 * Three tabs:
 *   1. Active     — PUBLISHED / SELLING lotteries
 *   2. Closed     — CLOSED / DRAWING / COMPLETED / ARCHIVED lotteries
 *   3. Winners    — All winners across every lottery
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Ticket, Trophy, Archive, Calendar,
  Globe, ArrowRight,
  Users, CheckCircle2, Copy, Share2,
} from 'lucide-react'
import { publicApi } from '../../lib/api'
import { fmt$, fmtDate, daysLeft, soldPct, fmtPct } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { PublicNav } from '../../components/layout/PublicNav'
import { useLang } from '../../context/LangContext'

// ─── Types ────────────────────────────────────────────────────────────────────
interface OperatorProfile {
  id: string; username: string; businessName: string; name: string
  logo?: string; website?: string; city?: string; isVerified?: boolean
  createdAt: string; _count: { lotteries: number }
}
interface LotteryRow {
  id: string; name: string; slug: string; description?: string; type: string
  ticketPrice: string | number; totalTickets: number; ticketsSold: number
  drawDate: string; saleEndDate: string; status: string; banner?: string | null
  prizes: { rank: number; title: string; prizeValue: string | number }[]
  _count?: { tickets: number; winners: number }
}
interface WinnerRow {
  id: string; createdAt: string; buyerName: string | null
  ticket: { ticketNumber: string } | null
  prize: { rank: number; title: string; prizeValue: string | number } | null
  lottery: { id: string; name: string; slug: string; drawDate: string }
}
type TabId = 'active' | 'closed' | 'winners'

// ─── Verified badge ───────────────────────────────────────────────────────────
function VerifiedBadge({ small = false }: { small?: boolean }) {
  const { t } = useLang()
  return (
    <span title="Verified Operator" style={{ display: 'inline-flex', alignItems: 'center', gap: small ? 3 : 4, padding: small ? '1px 6px' : '3px 9px', borderRadius: 99, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', fontSize: small ? 10 : 11.5, fontWeight: 700, color: '#34d399', letterSpacing: '0.02em', flexShrink: 0 }}>
      <CheckCircle2 style={{ width: small ? 10 : 12, height: small ? 10 : 12 }} />
      {!small && t('ownerPage', 'verified')}
    </span>
  )
}

// ─── Share profile ────────────────────────────────────────────────────────────
function ShareProfileButton({ username }: { username: string }) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  const handleShare = () => {
    const url = `${window.location.origin}/${username}`
    if (navigator.share) { navigator.share({ title: `${username}'s Lotteries`, url }).catch(()=>null) }
    else { navigator.clipboard.writeText(url).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000) }) }
  }
  return (
    <button onClick={handleShare} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background: copied?'rgba(52,211,153,0.12)':'rgba(255,255,255,0.06)', border:`1px solid ${copied?'rgba(52,211,153,0.3)':'rgba(255,255,255,0.12)'}`, color: copied?'#34d399':'#9ca3af', fontSize:12.5, fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}>
      {copied ? <><Copy style={{width:13,height:13}}/> {t('ownerPage','copied')}</> : <><Share2 style={{width:13,height:13}}/> {t('ownerPage','shareProfile')}</>}
    </button>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ id: _id, label, icon: Icon, active, onClick }: { id: TabId; label: string; icon: React.ElementType; active: boolean; onClick: ()=>void }) {
  return (
    <button onClick={onClick} style={{ flex: 1, minWidth: 0, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'9px 8px', borderRadius:10, fontSize:12.5, fontWeight:600, cursor:'pointer', border:'none', transition:'all 0.18s', background: active?'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.18))':'rgba(255,255,255,0.04)', color: active?'#a5b4fc':'#6b7280', outline: active?'1px solid rgba(99,102,241,0.35)':'1px solid rgba(255,255,255,0.07)', boxShadow: active?'0 4px 14px rgba(99,102,241,0.15)':'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
      <Icon style={{width:13,height:13,flexShrink:0}}/><span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{label}</span>
    </button>
  )
}

// ─── Lottery card ─────────────────────────────────────────────────────────────
function LotteryCard({ lot, username, closed=false }: { lot: LotteryRow; username: string; closed?: boolean }) {
  const { t } = useLang()
  const sold = Number(lot.ticketsSold??0), total = Number(lot.totalTickets??0)
  const barPct = soldPct(sold, total)
  const pctStr = fmtPct(sold, total)
  const dl   = lot.drawDate ? daysLeft(lot.drawDate) : 0
  const topPrize = lot.prizes?.[0]

  return (
    <Link to={`/${username}/lotteries/${lot.slug}`} style={{textDecoration:'none',display:'block'}}>
      <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, overflow:'hidden', transition:'all 0.2s', cursor:'pointer', opacity:closed?0.85:1 }}
        onMouseEnter={e=>{ const el=e.currentTarget as HTMLDivElement; const light=document.documentElement.classList.contains('light'); el.style.borderColor=closed?'rgba(99,102,241,0.25)':'rgba(99,102,241,0.4)'; el.style.transform='translateY(-2px)'; el.style.boxShadow=light?'0 8px 24px rgba(0,0,0,0.1)':'0 8px 30px rgba(0,0,0,0.25)' }}
        onMouseLeave={e=>{ const el=e.currentTarget as HTMLDivElement; const light=document.documentElement.classList.contains('light'); el.style.borderColor=light?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.08)'; el.style.transform='none'; el.style.boxShadow='none' }}>
        {/* Header */}
        <div style={{position:'relative',height:lot.banner?110:'auto',overflow:'hidden'}}>
          {lot.banner ? (
            <>
              <img src={lot.banner} alt={lot.name} style={{width:'100%',height:'100%',objectFit:'cover',display:'block',opacity:closed?0.6:1}}/>
              <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,rgba(0,0,0,0.65) 100%)'}}/>
              <div style={{position:'absolute',bottom:9,left:14,right:14,display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8}}>
                <div style={{minWidth:0}}><h3 style={{fontSize:15,fontWeight:700,color:'#fff',margin:'0 0 2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textShadow:'0 1px 4px rgba(0,0,0,0.6)'}}>{lot.name}</h3><p style={{fontSize:11,color:'rgba(255,255,255,0.6)',margin:0}}>{lot.type.replace(/_/g,' ')}</p></div>
                <StatusBadge status={lot.status}/>
              </div>
            </>
          ) : (
            <div style={{padding:'14px 18px 12px',background:closed?'rgba(107,114,128,0.08)':'rgba(99,102,241,0.07)',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10}}>
              <div style={{minWidth:0}}><h3 style={{fontSize:15,fontWeight:700,color:'#f3f4f6',margin:'0 0 3px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{lot.name}</h3><p style={{fontSize:11.5,color:'#6b7280',margin:0}}>{lot.type.replace(/_/g,' ')}</p></div>
              <StatusBadge status={lot.status}/>
            </div>
          )}
        </div>
        {/* Body */}
        <div style={{padding:'14px 18px'}}>
          <div style={{marginBottom:14}}>
            <div style={{background:'rgba(0,0,0,0.2)',borderRadius:10,padding:'9px 12px'}}>
              <p style={{fontSize:10.5,color:'#6b7280',margin:'0 0 3px',textTransform:'uppercase',letterSpacing:'0.06em'}}>{t('ownerPage','ticket')}</p>
              <p style={{fontSize:18,fontWeight:800,color:'#34d399',margin:0}}>{fmt$(Number(lot.ticketPrice))}</p>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
              <span style={{fontSize:11.5,color:'#6b7280'}}>{sold.toLocaleString()} / {total.toLocaleString()}</span>
              <span style={{fontSize:11.5,fontWeight:700,color:barPct>=80?'#f87171':'#818cf8'}}>{pctStr}</span>
            </div>
            <div style={{height:6,borderRadius:99,background:'rgba(255,255,255,0.07)',overflow:'hidden',width:'100%'}}>
              <div style={{height:6,borderRadius:99,width:`${Math.max(barPct>0?2:0,barPct)}%`,background:closed?'linear-gradient(90deg,#6b7280,#4b5563)':barPct>=80?'linear-gradient(90deg,#f87171,#ef4444)':'linear-gradient(90deg,#818cf8,#6366f1)',transition:'width 0.4s ease'}}/>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:11.5,color:'#9ca3af',display:'flex',alignItems:'center',gap:4}}>
              <Calendar style={{width:11,height:11}}/>
              {closed ? `${t('ownerPage','drawn')} ${fmtDate(lot.drawDate)}` : `${t('ownerPage','draw')} ${fmtDate(lot.drawDate)}`}
            </span>
            {!closed && dl>0 && dl<=7 && (
              <span style={{fontSize:11,fontWeight:700,background:'rgba(245,158,11,0.15)',color:'#fbbf24',border:'1px solid rgba(245,158,11,0.25)',padding:'2px 8px',borderRadius:99}}>
                {t('ownerPage','dLeft').replace('{d}',String(dl))}
              </span>
            )}
            {!closed && (
              <span style={{fontSize:12,color:'#818cf8',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                {t('ownerPage','buyTickets')} <ArrowRight style={{width:12,height:12}}/>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// ─── Winner card ──────────────────────────────────────────────────────────────
function WinnerCard({ w, username }: { w: WinnerRow; username: string }) {
  const medals = ['🥇','🥈','🥉']
  const medal  = medals[(w.prize?.rank??1)-1] ?? '🏅'
  const prizeColors = ['#fbbf24','#9ca3af','#cd7c2f']
  const prizeColor  = prizeColors[(w.prize?.rank??1)-1] ?? '#818cf8'
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'16px 18px', display:'flex', alignItems:'center', gap:14, transition:'border-color 0.2s, transform 0.2s' }}
      onMouseEnter={e=>{ const el=e.currentTarget as HTMLDivElement; const light=document.documentElement.classList.contains('light'); el.style.borderColor='rgba(99,102,241,0.35)'; el.style.transform='translateY(-2px)'; el.style.boxShadow=light?'0 4px 16px rgba(0,0,0,0.08)':'none' }}
      onMouseLeave={e=>{ const el=e.currentTarget as HTMLDivElement; const light=document.documentElement.classList.contains('light'); el.style.borderColor=light?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.08)'; el.style.transform='none'; el.style.boxShadow='none' }}>
      <span style={{fontSize:28,flexShrink:0}}>{medal}</span>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:15,fontWeight:700,color:'#e2e4ea',margin:'0 0 2px'}}>{w.buyerName??'Winner'}</p>
        <p style={{fontSize:12,fontFamily:'monospace',color:'#6b7280',margin:0}}>Ticket #{w.ticket?.ticketNumber??'—'}</p>
        <Link to={`/${username}/lotteries/${w.lottery.slug}`} style={{fontSize:12,color:'#818cf8',textDecoration:'none',marginTop:3,display:'inline-block'}}>{w.lottery.name} →</Link>
      </div>
      <div style={{textAlign:'right',flexShrink:0}}>
        {w.prize && (<><p style={{fontSize:16,fontWeight:800,color:prizeColor,margin:0}}>{fmt$(Number(w.prize.prizeValue))}</p><p style={{fontSize:11.5,color:'#6b7280',margin:'2px 0 0'}}>{w.prize.title}</p></>)}
        <p style={{fontSize:11,color:'#4b5563',marginTop:4}}>{fmtDate(w.lottery.drawDate)}</p>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div style={{textAlign:'center',padding:'64px 24px',background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:20}}>
      <Icon style={{width:40,height:40,color:'#374151',margin:'0 auto 14px'}}/>
      <p style={{fontSize:14,color:'#6b7280',margin:0}}>{message}</p>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number)=>void }) {
  const { t } = useLang()
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
      <button onClick={()=>onPage(page-1)} disabled={page<=1} className="btn-secondary" style={{fontSize:13,padding:'8px 18px'}}>{t('ownerPage','prev')}</button>
      <span style={{fontSize:13,color:'#6b7280'}}>{t('ownerPage','pageOf').replace('{p}',String(page)).replace('{t}',String(total))}</span>
      <button onClick={()=>onPage(page+1)} disabled={page>=total} className="btn-secondary" style={{fontSize:13,padding:'8px 18px'}}>{t('ownerPage','next')}</button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function OwnerPage() {
  const { t } = useLang()
  const { username } = useParams<{ username: string }>()
  const [tab, setTab] = useState<TabId>('active')
  const [activePage,  setActivePage]  = useState(1)
  const [closedPage,  setClosedPage]  = useState(1)
  const [winnersPage, setWinnersPage] = useState(1)

  const { data: profileData, isLoading: profileLoading, isError: profileError } = useQuery<OperatorProfile>({
    queryKey: ['owner-profile', username],
    queryFn: () => publicApi.clientByUsername(username!).then(r => r.data?.data ?? r.data),
    enabled: Boolean(username),
  })
  const { data: activeData,  isLoading: activeLoading  } = useQuery({
    queryKey: ['owner-active',  username, activePage],
    queryFn: () => publicApi.lotteriesByUsername(username!, { page: activePage,  limit: 12 }).then(r => { const d=r.data?.data??r.data; return d as { client?: OperatorProfile; data: LotteryRow[]; meta: { total: number; totalPages: number; page: number; limit: number } } }),
    enabled: Boolean(username) && tab === 'active',
  })
  const { data: closedData,  isLoading: closedLoading  } = useQuery({
    queryKey: ['owner-closed',  username, closedPage],
    queryFn: () => publicApi.closedLotteriesByUsername(username!, { page: closedPage,  limit: 12 }).then(r => { const d=r.data?.data??r.data; return d as { data: LotteryRow[]; meta: { total: number; totalPages: number } } }),
    enabled: Boolean(username) && tab === 'closed',
  })
  const { data: winnersData, isLoading: winnersLoading } = useQuery({
    queryKey: ['owner-winners', username, winnersPage],
    queryFn: () => publicApi.winnersByUsername(username!, { page: winnersPage, limit: 30 }).then(r => { const d=r.data?.data??r.data; return d as { data: WinnerRow[]; meta: { total: number; totalPages: number } } }),
    enabled: Boolean(username) && tab === 'winners',
  })

  const operator        = profileData ?? activeData?.client
  const activeLotteries = activeData?.data  ?? []
  const closedLotteries = closedData?.data  ?? []
  const winners         = winnersData?.data ?? []

  if (profileError) return (
    <div style={{minHeight:'100vh',background:'#08090f'}}>
      <PublicNav/>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'calc(100vh - 64px)'}}>
        <div style={{textAlign:'center'}}>
          <Ticket style={{width:48,height:48,color:'#374151',margin:'0 auto 16px'}}/>
          <h2 style={{fontSize:22,fontWeight:700,color:'#fff',margin:'0 0 8px'}}>{t('ownerPage','operatorNotFound')}</h2>
          <p style={{color:'#6b7280',marginBottom:24}}>{t('ownerPage','noOperatorMsg').replace('{u}',username??'')}</p>
          <Link to="/lotteries" className="btn-primary">{t('ownerPage','browseAll')}</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#08090f'}}>
      <PublicNav/>

      {/* Operator Hero */}
      <div style={{position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'-10%',left:'40%',width:600,height:350,background:'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',pointerEvents:'none'}}/>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'48px 24px 36px'}}>
          {profileLoading && !operator ? (
            <div style={{display:'flex',justifyContent:'center',padding:40}}><Spinner className="w-8 h-8"/></div>
          ) : operator ? (
            <div style={{display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}>
              {/* Avatar */}
              <div style={{width:80,height:80,borderRadius:22,flexShrink:0,background:operator.logo?undefined:'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(124,58,237,0.25))',border:'1px solid rgba(99,102,241,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,fontWeight:900,color:'#818cf8',overflow:'hidden'}}>
                {operator.logo ? <img src={operator.logo} alt={operator.businessName} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : operator.businessName[0].toUpperCase()}
              </div>
              {/* Info */}
              <div  style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:8}}>
                  <h1 style={{fontSize:'clamp(22px,4vw,34px)',fontWeight:900,color:'#fff',letterSpacing:'-0.02em',margin:0}}>{operator.businessName}</h1>
                  {operator.isVerified && <VerifiedBadge/>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                  <span style={{fontSize:13,color:'#6b7280',display:'flex',alignItems:'center',gap:5}}><Users style={{width:12,height:12}}/> {t('ownerPage','lotteryOperator')}</span>
                  {operator.website && <a href={operator.website} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:'#818cf8',textDecoration:'none',display:'flex',alignItems:'center',gap:4}}><Globe style={{width:12,height:12}}/> {t('ownerPage','website')}</a>}
                  <span style={{fontSize:13,color:'#6b7280'}}>{t('ownerPage','since')} {fmtDate(operator.createdAt)}</span>
                </div>
              </div>
              {/* Stats */}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px'}}>
        <div style={{display:'flex',gap:6,flexWrap:'nowrap',overflowX:'hidden'}}>
          <TabBtn id="active"  label={`${t('ownerPage','tabActive')} (${activeData?.meta?.total ?? '—'})`}  icon={Ticket}  active={tab==='active'}  onClick={()=>setTab('active') }/>
          <TabBtn id="closed"  label={`${t('ownerPage','tabClosed')} (${closedData?.meta?.total ?? '—'})`}  icon={Archive} active={tab==='closed'}  onClick={()=>setTab('closed')}/>
          <TabBtn id="winners" label={`${t('ownerPage','tabWinners')} (${winnersData?.meta?.total ?? '—'})`} icon={Trophy}  active={tab==='winners'} onClick={()=>setTab('winners')}/>
        </div>
      </div>

      {/* Tab content */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 24px 64px'}}>
        {tab==='active' && (
          activeLoading ? <div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner className="w-10 h-10"/></div>
          : activeLotteries.length===0 ? <EmptyState icon={Ticket} message={t('ownerPage','noActive')}/>
          : (<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))',gap:18,marginBottom:28}}>{activeLotteries.map(lot=><LotteryCard key={lot.id} lot={lot} username={username!}/>)}</div>{activeData?.meta && activeData.meta.totalPages>1 && <Pagination page={activePage} total={activeData.meta.totalPages} onPage={setActivePage}/>}</>)
        )}
        {tab==='closed' && (
          closedLoading ? <div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner className="w-10 h-10"/></div>
          : closedLotteries.length===0 ? <EmptyState icon={Archive} message={t('ownerPage','noClosed')}/>
          : (<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))',gap:18,marginBottom:28}}>{closedLotteries.map(lot=><LotteryCard key={lot.id} lot={lot} username={username!} closed/>)}</div>{closedData?.meta && closedData.meta.totalPages>1 && <Pagination page={closedPage} total={closedData.meta.totalPages} onPage={setClosedPage}/>}</>)
        )}
        {tab==='winners' && (
          winnersLoading ? <div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner className="w-10 h-10"/></div>
          : winners.length===0 ? <EmptyState icon={Trophy} message={t('ownerPage','noWinners')}/>
          : (<><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))',gap:14,marginBottom:28}}>{winners.map((w,i)=><WinnerCard key={w.id} w={w} username={username!}/>)}</div>{winnersData?.meta && winnersData.meta.totalPages>1 && <Pagination page={winnersPage} total={winnersData.meta.totalPages} onPage={setWinnersPage}/>}</>)
        )}
      </div>

      <footer style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'24px',textAlign:'center'}}>
        <p style={{fontSize:12,color:'#4b5563',margin:0}}>{t('ownerPage','poweredBy')}{' '}<Link to="/" style={{color:'#6b7280',textDecoration:'none',fontWeight:600}}>LotterySaaS</Link></p>
      </footer>
    </div>
  )
}
