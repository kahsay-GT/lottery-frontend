import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Ticket, ArrowRight, Calendar, Users, Globe, CheckCircle2,
  Share2, Copy,
} from 'lucide-react'
import { publicApi } from '../../lib/api'
import { fmt$, fmtDate, daysLeft, soldPct, fmtPct } from '../../lib/utils'
import { StatusBadge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { PublicNav } from '../../components/layout/PublicNav'
import { useLang } from '../../context/LangContext'
import { CardSlider, type SliderImage } from '../../components/ui/ImageSlider'

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
  images?: { id: string; url: string }[]
}


function VerifiedBadge() {
  const { t } = useLang()
  return (
    <span title="Verified Operator" style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 9px',borderRadius:99,background:'rgba(52,211,153,0.12)',border:'1px solid rgba(52,211,153,0.3)',fontSize:11.5,fontWeight:700,color:'#34d399',flexShrink:0}}>
      <CheckCircle2 style={{width:12,height:12}}/> {t('operatorLotteries','verified')}
    </span>
  )
}

function ShareProfileButton({ username }: { username: string }) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  const handleShare = () => { const url=`${window.location.origin}/${username}`; if(navigator.share){navigator.share({title:`${username}'s Lotteries`,url}).catch(()=>null)}else{navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})} }
  return (
    <button onClick={handleShare} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:copied?'rgba(52,211,153,0.12)':'rgba(255,255,255,0.06)',border:`1px solid ${copied?'rgba(52,211,153,0.3)':'rgba(255,255,255,0.12)'}`,color:copied?'#34d399':'#9ca3af',fontSize:12.5,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>
      {copied ? <><Copy style={{width:13,height:13}}/> {t('operatorLotteries','copied')}</> : <><Share2 style={{width:13,height:13}}/> {t('operatorLotteries','share')}</>}
    </button>
  )
}

function LotteryCard({ lot, username }: { lot: LotteryRow; username: string }) {
  const { t } = useLang()
  const sold = Number(lot.ticketsSold??0), total = Number(lot.totalTickets??0)
  const barPct = soldPct(sold, total)
  const pctStr = fmtPct(sold, total)
  const dl   = lot.drawDate ? daysLeft(lot.drawDate) : 0
  const topPrize = lot.prizes?.[0]

  // Build slider images — prefer images array, fall back to legacy banner
  const sliderImages: SliderImage[] = (lot.images ?? []).length > 0
    ? (lot.images as SliderImage[])
    : lot.banner
      ? [{ id: '__banner__', url: lot.banner }]
      : []

  return (
    <Link to={`/${username}/lotteries/${lot.slug}`} style={{textDecoration:'none',display:'block'}}>
      <div
        className="group"
        style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,overflow:'hidden',transition:'all 0.2s',cursor:'pointer'}}
        onMouseEnter={e=>{const el=e.currentTarget as HTMLDivElement; const light=document.documentElement.classList.contains('light'); el.style.borderColor='rgba(99,102,241,0.4)';el.style.transform='translateY(-3px)';el.style.boxShadow=light?'0 12px 32px rgba(0,0,0,0.12)':'0 12px 40px rgba(0,0,0,0.3)'}}
        onMouseLeave={e=>{const el=e.currentTarget as HTMLDivElement; const light=document.documentElement.classList.contains('light'); el.style.borderColor=light?'rgba(0,0,0,0.1)':'rgba(255,255,255,0.08)';el.style.transform='translateY(0)';el.style.boxShadow='none'}}>

        {/* Image area with slider */}
        <div style={{position:'relative',height:140,overflow:'hidden',flexShrink:0}}>
          <CardSlider
            images={sliderImages}
            gradientClass="from-indigo-900/80 via-purple-900/60"
            alt={lot.name}
          />
          {/* Name + type + status overlaid on the bottom */}
          <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'32px 16px 10px',background:'linear-gradient(to top,rgba(8,9,15,0.9) 0%,transparent 100%)',zIndex:4,display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:10}}>
            <div style={{minWidth:0}}>
              <h3 style={{fontSize:15,fontWeight:700,color:'#fff',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textShadow:'0 1px 4px rgba(0,0,0,0.7)'}}>{lot.name}</h3>
            </div>
            <StatusBadge status={lot.status}/>
          </div>
        </div>

        <div style={{padding:'16px 20px'}}>
          <div style={{marginBottom:16}}>
            <div style={{background:'rgba(0,0,0,0.2)',borderRadius:12,padding:'10px 14px'}}>
              <p style={{fontSize:10.5,color:'#6b7280',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'0.06em'}}>{t('operatorLotteries','ticketPrice')}</p>
              <p style={{fontSize:20,fontWeight:800,color:'#34d399',margin:0}}>{fmt$(Number(lot.ticketPrice))}</p>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:12,color:'#6b7280'}}>{sold.toLocaleString()} / {total.toLocaleString()} {t('operatorLotteries','sold')}</span>
              <span style={{fontSize:12,fontWeight:700,color:barPct>=80?'#f87171':'#818cf8'}}>{pctStr}</span>
            </div>
            <div style={{height:6,borderRadius:99,background:'rgba(255,255,255,0.07)',overflow:'hidden',width:'100%'}}>
              <div style={{height:6,borderRadius:99,width:`${Math.max(barPct>0?2:0,barPct)}%`,transition:'width 0.4s ease',background:barPct>=80?'linear-gradient(90deg,#f87171,#ef4444)':barPct>=50?'linear-gradient(90deg,#fbbf24,#f59e0b)':'linear-gradient(90deg,#818cf8,#6366f1)'}}/>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#9ca3af'}}>
              <Calendar style={{width:12,height:12}}/> {t('operatorLotteries','draw')} {fmtDate(lot.drawDate)}
            </div>
            {dl>0 && dl<=7 && (
              <span style={{fontSize:11,fontWeight:700,background:'rgba(245,158,11,0.15)',color:'#fbbf24',border:'1px solid rgba(245,158,11,0.25)',padding:'2px 9px',borderRadius:99}}>
                {t('operatorLotteries','dLeft').replace('{d}',String(dl))}
              </span>
            )}
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#818cf8',fontWeight:600}}>
              {t('operatorLotteries','buyTickets')} <ArrowRight style={{width:12,height:12}}/>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function OperatorLotteriesPage() {
  const { t } = useLang()
  const { username } = useParams<{ username: string }>()
  const [page, setPage] = useState(1)

  const { data: profileData, isLoading: profileLoading, isError: profileError } = useQuery<OperatorProfile>({
    queryKey: ['operator-profile', username],
    queryFn: () => publicApi.clientByUsername(username!).then(r => r.data?.data ?? r.data),
    enabled: Boolean(username),
  })
  const { data: lotData, isLoading: lotLoading } = useQuery({
    queryKey: ['operator-lotteries', username, page],
    queryFn: () => publicApi.lotteriesByUsername(username!, { page, limit: 12 }).then(r => { const d=r.data?.data??r.data; return d as { client: OperatorProfile; data: LotteryRow[]; meta: { total: number; totalPages: number; page: number; limit: number } } }),
    enabled: Boolean(username),
  })

  const operator  = profileData ?? lotData?.client
  const lotteries = lotData?.data ?? []
  const meta      = lotData?.meta

  if (profileError) return (
    <div style={{minHeight:'100vh',background:'#08090f',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <Ticket style={{width:48,height:48,color:'#374151',margin:'0 auto 16px'}}/>
        <h2 style={{fontSize:20,fontWeight:700,color:'#fff',margin:'0 0 8px'}}>{t('operatorLotteries','operatorNotFound')}</h2>
        <p style={{color:'#6b7280',marginBottom:24}}>{t('operatorLotteries','noOperatorMsg').replace('{u}',username??'')}</p>
        <Link to="/lotteries" className="btn-primary">{t('operatorLotteries','browseAllLot')}</Link>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#08090f'}}>
      <PublicNav/>
      {/* Operator hero */}
      <div style={{position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:'30%',width:600,height:300,background:'radial-gradient(ellipse,rgba(99,102,241,0.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'48px 24px 36px'}}>
          {profileLoading ? (
            <div style={{display:'flex',justifyContent:'center',padding:40}}><Spinner className="w-8 h-8"/></div>
          ) : operator ? (
            <div style={{display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}>
              <div style={{width:72,height:72,borderRadius:20,flexShrink:0,background:operator.logo?undefined:'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(124,58,237,0.25))',border:'1px solid rgba(99,102,241,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:900,color:'#818cf8',overflow:'hidden'}}>
                {operator.logo ? <img src={operator.logo} alt={operator.businessName} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : operator.businessName[0].toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:6}}>
                  <h1 style={{fontSize:'clamp(22px,4vw,32px)',fontWeight:900,color:'#fff',letterSpacing:'-0.02em',margin:0}}>{operator.businessName}</h1>
                  {operator.isVerified && <VerifiedBadge/>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                  <span style={{fontSize:13,color:'#6b7280',display:'flex',alignItems:'center',gap:5}}><Users style={{width:12,height:12}}/> {t('operatorLotteries','lotteryOperator')}</span>
                  {operator.city && <span style={{fontSize:13,color:'#6b7280'}}>📍 {operator.city}</span>}
                  {operator.website && <a href={operator.website} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:'#818cf8',textDecoration:'none',display:'flex',alignItems:'center',gap:5}}><Globe style={{width:12,height:12}}/> {t('operatorLotteries','website')}</a>}
                  <span style={{fontSize:13,color:'#6b7280'}}>{t('operatorLotteries','since')} {fmtDate(operator.createdAt)}</span>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10,alignItems:'flex-end'}}>
                <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'12px 20px',textAlign:'center'}}>
                  <p style={{fontSize:24,fontWeight:900,color:'#fff',margin:0}}>{meta?.total ?? operator._count?.lotteries ?? 0}</p>
                  <p style={{fontSize:11.5,color:'#6b7280',margin:0}}>{t('operatorLotteries','activeLotteries')}</p>
                </div>
                <ShareProfileButton username={username!}/>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Grid */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 24px 64px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
          <h2 style={{fontSize:20,fontWeight:700,color:'#fff',margin:0}}>
            {t('operatorLotteries','activeLotteries')}
            {meta?.total ? <span style={{marginLeft:10,fontSize:14,color:'#6b7280',fontWeight:400}}>{meta.total} {t('operatorLotteries','total')}</span> : null}
          </h2>
        </div>
        {lotLoading ? (
          <div style={{display:'flex',justifyContent:'center',padding:60}}><Spinner className="w-10 h-10"/></div>
        ) : lotteries.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px dashed rgba(255,255,255,0.1)',borderRadius:20}}>
            <Ticket style={{width:40,height:40,color:'#374151',margin:'0 auto 14px'}}/>
            <p style={{fontSize:15,fontWeight:600,color:'#9ca3af',margin:'0 0 6px'}}>{t('operatorLotteries','noLotteries')}</p>
            <p style={{fontSize:13,color:'#6b7280',margin:0}}>{t('operatorLotteries','noLotteriesSub')}</p>
            <Link to="/lotteries" className="btn-secondary" style={{display:'inline-flex',marginTop:20,fontSize:13,gap:6}}>{t('operatorLotteries','browseAll')}</Link>
          </div>
        ) : (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))',gap:20,marginBottom:32}}>
              {lotteries.map(lot => <LotteryCard key={lot.id} lot={lot} username={username!}/>)}
            </div>
            {meta && meta.totalPages > 1 && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
                <button onClick={()=>setPage(p=>p-1)} disabled={page<=1} className="btn-secondary" style={{fontSize:13,padding:'8px 18px'}}>{t('operatorLotteries','prev')}</button>
                <span style={{fontSize:13,color:'#6b7280'}}>{t('operatorLotteries','pageOf').replace('{p}',String(page)).replace('{t}',String(meta.totalPages))}</span>
                <button onClick={()=>setPage(p=>p+1)} disabled={page>=meta.totalPages} className="btn-secondary" style={{fontSize:13,padding:'8px 18px'}}>{t('operatorLotteries','next')}</button>
              </div>
            )}
          </>
        )}
      </div>

      <footer style={{borderTop:'1px solid rgba(255,255,255,0.06)',padding:'24px',textAlign:'center'}}>
        <p style={{fontSize:12,color:'#4b5563',margin:0}}>{t('operatorLotteries','poweredBy')}{' '}<Link to="/" style={{color:'#6b7280',textDecoration:'none',fontWeight:600}}>LotterySaaS</Link></p>
      </footer>
    </div>
  )
}
