import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Ticket, CheckCircle2, ArrowRight, ArrowLeft, Zap, Star, Crown,
  Eye, EyeOff, User, Building2, Lock, Globe, Check, Phone,
} from 'lucide-react'
import { publicApi, authApi, getErr } from '../../lib/api'
import { fmt$ } from '../../lib/utils'
import { Spinner } from '../../components/ui/Spinner'
import { PublicNav } from '../../components/layout/PublicNav'
import { useLang } from '../../context/LangContext'

interface Plan {
  id: string; name: string; slug: string; description?: string
  monthlyPrice: number; yearlyPrice: number
  maxLotteriesPerCycle: number; maxActiveLotteries: number; maxTicketsPerLottery: number
  hasReporting: boolean; hasApiAccess: boolean; supportLevel: string
  isActive: boolean; sortOrder: number
}
type BillingCycle = 'MONTHLY' | 'YEARLY'

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, flex:1 }}>
      <div style={{ width:40, height:40, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, transition:'all 0.25s', background: done?'linear-gradient(135deg,#34d399,#10b981)':active?'linear-gradient(135deg,#4f46e5,#7c3aed)':'rgba(255,255,255,0.08)', color:(done||active)?'#fff':'#6b7280', border:done||active?'none':'2px solid rgba(255,255,255,0.1)', boxShadow:active?'0 0 20px rgba(99,102,241,0.4)':'none' }}>
        {done ? <Check style={{width:18,height:18}}/> : n}
      </div>
      <span style={{ fontSize:11.5, fontWeight:600, color:active?'#a5b4fc':done?'#34d399':'#6b7280', textAlign:'center', whiteSpace:'nowrap' }}>{label}</span>
    </div>
  )
}
function StepLine({ done }: { done: boolean }) {
  return <div style={{ height:2, flex:1, marginBottom:26, borderRadius:99, background:done?'linear-gradient(90deg,#34d399,#10b981)':'rgba(255,255,255,0.08)', transition:'background 0.3s' }}/>
}
function Steps({ step }: { step: number }) {
  const { t } = useLang()
  const steps = [t('pricing','step1'), t('pricing','step2'), t('pricing','step3')]
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:0, width:'100%', maxWidth:440, margin:'0 auto 36px' }}>
      {steps.map((label, i) => (
        <><StepDot key={label} n={i+1} label={label} active={step===i+1} done={step>i+1}/>{i<steps.length-1 && <StepLine key={`line-${i}`} done={step>i+1}/>}</>
      ))}
    </div>
  )
}

const PLAN_ICONS  = [Zap, Star, Crown]
const PLAN_COLORS = ['#60a5fa', '#818cf8', '#fbbf24']

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function Step1Plan({ plans, loading, selectedPlan, setSelectedPlan, billing, setBilling, onNext }: {
  plans: Plan[]; loading: boolean; selectedPlan: Plan|null; setSelectedPlan:(p:Plan)=>void; billing: BillingCycle; setBilling:(b:BillingCycle)=>void; onNext:()=>void
}) {
  const { t } = useLang()
  return (
    <div>
      <div style={{textAlign:'center',marginBottom:32}}>
        <h2 style={{fontSize:'clamp(20px,4vw,28px)',fontWeight:800,color:'#fff',margin:'0 0 8px',letterSpacing:'-0.02em'}}>{t('pricing','choosePlanTitle')}</h2>
        <p style={{fontSize:14,color:'#6b7280',margin:0}}>{t('pricing','choosePlanSub')}</p>
      </div>
      {/* Billing toggle */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:0,marginBottom:32,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:4,width:'fit-content',margin:'0 auto 32px'}}>
        {(['MONTHLY','YEARLY'] as BillingCycle[]).map(b => (
          <button key={b} onClick={()=>setBilling(b)} style={{padding:'8px 20px',borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer',border:'none',transition:'all 0.15s',background:billing===b?'linear-gradient(135deg,#4f46e5,#7c3aed)':'transparent',color:billing===b?'#fff':'#9ca3af'}}>
            {b==='MONTHLY' ? t('pricing','monthly') : t('pricing','yearly')}
            {b==='YEARLY' && <span style={{marginLeft:6,fontSize:11,background:'rgba(52,211,153,0.2)',color:'#34d399',padding:'2px 7px',borderRadius:99}}>{t('pricing','save20')}</span>}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{display:'flex',justifyContent:'center',padding:48}}><Spinner className="w-8 h-8"/></div>
      ) : plans.length===0 ? (
        <div style={{textAlign:'center',padding:48,color:'#6b7280',fontSize:14}}>{t('pricing','noPlans')}</div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))',gap:16,marginBottom:32}}>
          {plans.map((plan,i) => {
            const Icon = PLAN_ICONS[i%3], color = PLAN_COLORS[i%3]
            const price = billing==='MONTHLY' ? plan.monthlyPrice : plan.yearlyPrice
            const isSelected = selectedPlan?.id === plan.id
            const isPopular  = i === 1
            return (
              <div key={plan.id} onClick={()=>setSelectedPlan(plan)} style={{position:'relative',cursor:'pointer',borderRadius:20,padding:24,transition:'all 0.2s',background:isSelected?'rgba(79,70,229,0.12)':'rgba(255,255,255,0.03)',border:isSelected?'2px solid rgba(99,102,241,0.6)':'1px solid rgba(255,255,255,0.08)',boxShadow:isSelected?'0 0 30px rgba(99,102,241,0.2)':'none',transform:isSelected?'translateY(-2px)':'none'}}>
                {isPopular && <div style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',color:'#fff',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:99,whiteSpace:'nowrap'}}>{t('pricing','mostPopular')}</div>}
                {isSelected && <div style={{position:'absolute',top:14,right:14,width:22,height:22,borderRadius:'50%',background:'#4f46e5',display:'flex',alignItems:'center',justifyContent:'center'}}><Check style={{width:12,height:12,color:'#fff'}}/></div>}
                <div style={{width:44,height:44,borderRadius:13,background:`${color}22`,border:`1px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:16}}><Icon style={{width:20,height:20,color}}/></div>
                <h3 style={{fontSize:17,fontWeight:800,color:'#fff',margin:'0 0 4px'}}>{plan.name}</h3>
                <p style={{fontSize:12.5,color:'#6b7280',margin:'0 0 18px',minHeight:36}}>{plan.description}</p>
                <div style={{marginBottom:20}}>
                  <span style={{fontSize:32,fontWeight:900,color:'#fff',letterSpacing:'-0.03em'}}>{fmt$(Number(price))}</span>
                  <span style={{fontSize:13,color:'#6b7280'}}>/{billing==='MONTHLY'?t('pricing','mo'):t('pricing','yr')}</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:9}}>
                  {[
                    `${plan.maxLotteriesPerCycle} ${t('pricing','lotteriesCycle')}`,
                    `${plan.maxActiveLotteries} ${t('pricing','activeAtOnce')}`,
                    `${Number(plan.maxTicketsPerLottery).toLocaleString()} ${t('pricing','ticketsPerLottery')}`,
                    ...(plan.hasReporting ? [t('pricing','advAnalytics')] : []),
                    ...(plan.hasApiAccess ? [t('pricing','apiAccess')]    : []),
                    `${plan.supportLevel} ${t('pricing','support')}`,
                  ].map(f => (
                    <div key={f} style={{display:'flex',alignItems:'center',gap:8}}>
                      <CheckCircle2 style={{width:14,height:14,color:'#34d399',flexShrink:0}}/>
                      <span style={{fontSize:13,color:'#d1d5db'}}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button onClick={onNext} disabled={!selectedPlan} className="btn-primary" style={{fontSize:14,padding:'12px 28px',borderRadius:12,gap:10,opacity:selectedPlan?1:0.5}}>
          {t('pricing','continue')} <ArrowRight style={{width:16,height:16}}/>
        </button>
      </div>
    </div>
  )
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function Step2Business({ onNext, onBack, defaultValues }: { onNext:(d:any)=>void; onBack:()=>void; defaultValues?: any }) {
  const { t } = useLang()

  const step2Schema = z.object({
    name:         z.string().min(2, t('pricing','fullNameRequired')),
    businessName: z.string().min(2, t('pricing','bizNameRequired')),
    username:     z.string().min(3, t('pricing','usernameMin')).max(30, t('pricing','usernameMax')).regex(/^[a-z0-9_-]+$/, t('pricing','usernameRegex')),
  })
  type Step2Form = z.infer<typeof step2Schema>

  const { register, handleSubmit, formState: { errors }, watch } = useForm<Step2Form>({ resolver: zodResolver(step2Schema), defaultValues })
  const username = watch('username') ?? ''

  return (
    <div>
      <div style={{textAlign:'center',marginBottom:32}}>
        <h2 style={{fontSize:'clamp(20px,4vw,28px)',fontWeight:800,color:'#fff',margin:'0 0 8px',letterSpacing:'-0.02em'}}>{t('pricing','bizInfoTitle')}</h2>
        <p style={{fontSize:14,color:'#6b7280',margin:0}}>{t('pricing','bizInfoSub')}</p>
      </div>
      <form onSubmit={handleSubmit(onNext)} style={{display:'flex',flexDirection:'column',gap:20}}>
        <div>
          <label className="label" style={{display:'flex',alignItems:'center',gap:6}}><User style={{width:12,height:12}}/> {t('pricing','fullName')}</label>
          <input className="input-dark" style={{height:46,fontSize:15}} placeholder="John Doe" {...register('name')}/>
          {errors.name && <p style={{fontSize:12,color:'#f87171',marginTop:5}}>{errors.name.message}</p>}
        </div>
        <div>
          <label className="label" style={{display:'flex',alignItems:'center',gap:6}}><Building2 style={{width:12,height:12}}/> {t('pricing','businessName')}</label>
          <input className="input-dark" style={{height:46,fontSize:15}} placeholder="Acme Lotteries" {...register('businessName')}/>
          {errors.businessName && <p style={{fontSize:12,color:'#f87171',marginTop:5}}>{errors.businessName.message}</p>}
        </div>
        <div>
          <label className="label" style={{display:'flex',alignItems:'center',gap:6}}><Globe style={{width:12,height:12}}/> {t('pricing','username')}</label>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'#6b7280',userSelect:'none',pointerEvents:'none'}}>{window.location.host}/</span>
            <input className="input-dark" style={{height:46,fontSize:15,paddingLeft:`${window.location.host.length*8+20}px`}} placeholder="your-username" autoCapitalize="none" {...register('username')}/>
          </div>
          {errors.username ? (
            <p style={{fontSize:12,color:'#f87171',marginTop:5}}>{errors.username.message}</p>
          ) : username.length>=3 ? (
            <p style={{fontSize:12,color:'#6b7280',marginTop:5}}>{t('pricing','usernameSub')} <span style={{color:'#818cf8'}}>{window.location.host}/{username}/lotteries</span></p>
          ) : (
            <p style={{fontSize:12,color:'#6b7280',marginTop:5}}>{t('pricing','usernameHint')}</p>
          )}
        </div>
        <div style={{display:'flex',gap:12,marginTop:8}}>
          <button type="button" onClick={onBack} className="btn-secondary" style={{flex:1,fontSize:14,padding:'12px 0',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <ArrowLeft style={{width:15,height:15}}/> {t('pricing','back')}
          </button>
          <button type="submit" className="btn-primary" style={{flex:2,fontSize:14,padding:'12px 0',borderRadius:12,gap:8}}>
            {t('pricing','continue')} <ArrowRight style={{width:15,height:15}}/>
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────
function Step3Contact({ onSubmit, onBack, submitting, defaultValues }: { onSubmit:(d:any)=>void; onBack:()=>void; submitting:boolean; defaultValues?:any }) {
  const { t } = useLang()
  const [show, setShow] = useState(false)

  const step3Schema = z.object({
    identifier: z
      .string()
      .min(1, t('pricing','emailRequired'))
      .refine(
        v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?[\d\s\-().]{7,}$/.test(v),
        t('pricing','invalidEmail'),
      ),
    password: z.string().min(8, t('pricing','passwordMin')).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, t('pricing','passwordPattern')),
    confirm:  z.string(),
  }).refine(d => d.password === d.confirm, { path: ['confirm'], message: t('pricing','passwordMatch') })
  type Step3Form = z.infer<typeof step3Schema>

  const { register, handleSubmit, formState: { errors } } = useForm<Step3Form>({ resolver: zodResolver(step3Schema), defaultValues })

  return (
    <div>
      <div style={{textAlign:'center',marginBottom:32}}>
        <h2 style={{fontSize:'clamp(20px,4vw,28px)',fontWeight:800,color:'#fff',margin:'0 0 8px',letterSpacing:'-0.02em'}}>{t('pricing','contactTitle')}</h2>
        <p style={{fontSize:14,color:'#6b7280',margin:0}}>{t('pricing','contactSub')}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} style={{display:'flex',flexDirection:'column',gap:18}}>

        {/* Single identifier field: email OR phone */}
        <div>
          <label className="label" style={{display:'flex',alignItems:'center',gap:6}}>
            <Phone style={{width:12,height:12}}/> {t('pricing','email')} / {t('pricing','phone').replace(' (አማራጭ)','').replace(' (optional)','')}
          </label>
          <input
            className="input-dark"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            style={{height:46,fontSize:15}}
            placeholder="+251 912 345 678  or  you@business.com"
            {...register('identifier')}
            onChange={e => {
              const v = e.target.value
              e.target.inputMode = /^[+0-9]/.test(v.trimStart()) ? 'tel' : 'email'
            }}
          />
          {errors.identifier && <p style={{fontSize:12,color:'#f87171',marginTop:5}}>{errors.identifier.message}</p>}
        </div>

        <div>
          <label className="label" style={{display:'flex',alignItems:'center',gap:6}}><Lock style={{width:12,height:12}}/> {t('pricing','password')}</label>
          <div style={{position:'relative'}}>
            <input className="input-dark" type={show?'text':'password'} autoComplete="new-password" style={{height:46,fontSize:15,paddingRight:48}} placeholder={t('pricing','passwordHint')} {...register('password')}/>
            <button type="button" onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:0,top:0,width:48,height:46,display:'flex',alignItems:'center',justifyContent:'center',background:'none',border:'none',cursor:'pointer',color:'#6b7280'}}>
              {show ? <EyeOff style={{width:16,height:16}}/> : <Eye style={{width:16,height:16}}/>}
            </button>
          </div>
          {errors.password && <p style={{fontSize:12,color:'#f87171',marginTop:5}}>{errors.password.message}</p>}
        </div>

        <div>
          <label className="label" style={{display:'flex',alignItems:'center',gap:6}}><Lock style={{width:12,height:12}}/> {t('pricing','confirmPassword')}</label>
          <input className="input-dark" type="password" autoComplete="new-password" style={{height:46,fontSize:15}} placeholder={t('pricing','repeatPassword')} {...register('confirm')}/>
          {errors.confirm && <p style={{fontSize:12,color:'#f87171',marginTop:5}}>{errors.confirm.message}</p>}
        </div>

        <p style={{fontSize:12,color:'#6b7280',margin:'-6px 0 0',lineHeight:1.5}}>{t('pricing','terms')}</p>
        <div style={{display:'flex',gap:12,marginTop:8}}>
          <button type="button" onClick={onBack} className="btn-secondary" style={{flex:1,fontSize:14,padding:'12px 0',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <ArrowLeft style={{width:15,height:15}}/> {t('pricing','back')}
          </button>
          <button type="submit" className="btn-primary" style={{flex:2,fontSize:14,padding:'12px 0',borderRadius:12,gap:8}} disabled={submitting}>
            {submitting ? <Spinner/> : t('pricing','createAccount')}
            {!submitting && <ArrowRight style={{width:15,height:15}}/>}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Success ──────────────────────────────────────────────────────────────────
function SuccessScreen({ username }: { username: string }) {
  const { t } = useLang()
  return (
    <div style={{textAlign:'center',padding:'20px 0'}}>
      <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#34d399,#10b981)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px',boxShadow:'0 0 40px rgba(52,211,153,0.3)'}}>
        <CheckCircle2 style={{width:36,height:36,color:'#fff'}}/>
      </div>
      <h2 style={{fontSize:26,fontWeight:900,color:'#fff',margin:'0 0 12px'}}>{t('pricing','accountCreated')}</h2>
      <p style={{fontSize:14,color:'#9ca3af',margin:'0 0 28px',lineHeight:1.6}}>{t('pricing','successMsg')}</p>
      {username && (
        <div style={{background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:12,padding:'12px 20px',marginBottom:28}}>
          <p style={{fontSize:12,color:'#6b7280',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'0.06em'}}>{t('pricing','yourLotteryUrl')}</p>
          <p style={{fontSize:14,fontWeight:600,color:'#818cf8',margin:0}}>{window.location.host}/{username}/lotteries</p>
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <Link to="/login" className="btn-primary" style={{fontSize:14,padding:'12px 0',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {t('pricing','signInAccount')} <ArrowRight style={{width:15,height:15}}/>
        </Link>
        <Link to="/lotteries" className="btn-secondary" style={{fontSize:14,padding:'12px 0',borderRadius:12}}>{t('pricing','browseLotteries')}</Link>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function PricingPage() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [step, setStep]         = useState(1)
  const [billing, setBilling]   = useState<BillingCycle>('MONTHLY')
  const [selectedPlan, setSelectedPlan] = useState<Plan|null>(null)
  const [step2Data, setStep2Data] = useState<any>(null)
  const [step3Data, setStep3Data] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]         = useState(false)
  const [createdUsername, setCreatedUsername] = useState('')

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['public-plans-pricing'],
    queryFn: () => publicApi.plans().then(r => {
      const payload = r.data?.data
      if (payload && typeof payload === 'object' && 'data' in payload) return (payload as { data: Plan[] }).data
      return Array.isArray(payload) ? (payload as Plan[]) : []
    }),
  })
  const plans: Plan[] = (plansData ?? []).filter(p => p.isActive).sort((a,b) => a.sortOrder - b.sortOrder)

  const handleStep3 = async (d: any) => {
    if (!selectedPlan || !step2Data) return
    setSubmitting(true)
    try {
      const raw = (d.identifier ?? '').trim()
      const isPhone = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)
      await authApi.register({
        name:         step2Data.name,
        businessName: step2Data.businessName,
        username:     step2Data.username,
        password:     d.password,
        planId:       selectedPlan.id,
        billingCycle: billing,
        ...(isPhone
          ? { phone: raw.replace(/[\s\-().]/g, '') }
          : { email: raw }),
      })
      setCreatedUsername(step2Data.username); setDone(true)
    } catch (e) { toast.error(getErr(e)) }
    finally { setSubmitting(false) }
  }

  return (
    <div style={{minHeight:'100vh',background:'#08090f'}}>
      <PublicNav/>
      <div style={{position:'fixed',inset:0,pointerEvents:'none',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'15%',left:'50%',transform:'translateX(-50%)',width:700,height:500,background:'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',borderRadius:'50%'}}/>
      </div>
      <div style={{position:'relative',maxWidth:done?480:(step===1?960:560),margin:'0 auto',padding:'clamp(32px,5vw,64px) 24px'}}>
        {!done && (
          <>
            <div style={{textAlign:'center',marginBottom:40}}>
              <h1 style={{fontSize:'clamp(28px,5vw,44px)',fontWeight:900,color:'#fff',margin:'0 0 10px',letterSpacing:'-0.03em'}}>{t('pricing','pageTitle')}</h1>
              <p style={{fontSize:15,color:'#6b7280',margin:0}}>{t('pricing','pageSubtitle')}</p>
            </div>
            <Steps step={step}/>
          </>
        )}
        <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:24,padding:'clamp(24px,5vw,40px)'}}>
          {done ? (
            <SuccessScreen username={createdUsername}/>
          ) : step===1 ? (
            <Step1Plan plans={plans} loading={plansLoading} selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} billing={billing} setBilling={setBilling} onNext={()=>setStep(2)}/>
          ) : step===2 ? (
            <Step2Business onNext={d=>{ setStep2Data(d); setStep(3) }} onBack={()=>setStep(1)} defaultValues={step2Data??undefined}/>
          ) : (
            <Step3Contact onSubmit={handleStep3} onBack={()=>setStep(2)} submitting={submitting} defaultValues={step3Data??undefined}/>
          )}
        </div>
        {!done && step>1 && selectedPlan && (
          <div style={{marginTop:16,display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:12,padding:'12px 18px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <Ticket style={{width:15,height:15,color:'#818cf8'}}/>
              <span style={{fontSize:13.5,fontWeight:600,color:'#e2e4ea'}}>{selectedPlan.name}</span>
              <span style={{fontSize:12,color:'#6b7280'}}>· {billing==='MONTHLY'?t('pricing','monthly'):t('pricing','yearly')}</span>
            </div>
            <span style={{fontSize:15,fontWeight:800,color:'#818cf8'}}>
              {fmt$(Number(billing==='MONTHLY'?selectedPlan.monthlyPrice:selectedPlan.yearlyPrice))}
              <span style={{fontSize:12,fontWeight:400,color:'#6b7280'}}>/{billing==='MONTHLY'?t('pricing','mo'):t('pricing','yr')}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
