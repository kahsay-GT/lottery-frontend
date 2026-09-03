import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, Ticket, ArrowRight, UserPlus } from 'lucide-react'
import { authApi, getErr } from '../../lib/api'
import { useBuyerAuth } from '../../store/auth'
import { Spinner } from '../../components/ui/Spinner'
import { PublicNav } from '../../components/layout/PublicNav'

const schema = z.object({
  name:         z.string().min(2, 'Name required'),
  email:        z.string().email('Invalid email'),
  phone:        z.string().min(9, 'Valid phone required'),
  password:     z.string().min(8, 'Min 8 chars').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Needs uppercase, lowercase, number & symbol',
  ),
  confirm: z.string(),
  clientId: z.string().min(1, 'Client ID required'),
}).refine(d => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })

type F = z.infer<typeof schema>

export function BuyerRegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('client') || ''
  const [show, setShow] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { clientId },
  })

  const onSubmit = async (d: F) => {
    try {
      const res = await authApi.registerBuyer({
        email: d.email, password: d.password,
        name: d.name, phone: d.phone, clientId: d.clientId,
      })
      const data = res.data?.data ?? res.data
      toast.success('Account created! You can now sign in.')
      navigate(`/buyer/login?client=${d.clientId}`)
    } catch (e) {
      toast.error(getErr(e))
    }
  }

  return (
    <div style={{ minHeight: '100svh', background: '#08090f' }}>
      <PublicNav />

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: 'min(520px,90vw)', height: 'min(520px,90vw)',
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(24px,5vw,48px) 16px',
        minHeight: 'calc(100vh - 64px)',
      }}>
        <div style={{
          position: 'relative', width: '100%', maxWidth: 420,
          display: 'flex', flexDirection: 'column', gap: 20,
        }} className="animate-slide-up">

          {/* Logo */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg,#059669,#10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
            }}>
              <Ticket className="w-7 h-7 text-white" />
            </div>
            <h1 style={{ fontSize: 'clamp(22px,6vw,28px)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Create Buyer Account
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Sign up to buy lottery tickets
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18, padding: 'clamp(16px,5vw,24px)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
          >
            <input type="hidden" {...register('clientId')} />

            <div>
              <label className="label">Full Name</label>
              <input
                className="input-dark"
                type="text"
                placeholder="John Buyer"
                style={{ height: 46, fontSize: 16 }}
                {...register('name')}
              />
              {errors.name && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                className="input-dark"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                style={{ height: 46, fontSize: 16 }}
                {...register('email')}
              />
              {errors.email && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Phone Number</label>
              <input
                className="input-dark"
                type="tel"
                inputMode="tel"
                placeholder="+251 9XX XXX XXX"
                style={{ height: 46, fontSize: 16 }}
                {...register('phone')}
              />
              {errors.phone && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.phone.message}</p>}
            </div>

            <div style={{ position: 'relative' }}>
              <label className="label">Password</label>
              <input
                className="input-dark"
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                style={{ height: 46, fontSize: 16, paddingRight: 48 }}
                {...register('password')}
              />
              <button type="button" onClick={() => setShow(s => !s)}
                style={{ position: 'absolute', right: 0, top: 20, width: 48, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.password && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                className="input-dark"
                type="password"
                placeholder="••••••••"
                style={{ height: 46, fontSize: 16 }}
                {...register('confirm')}
              />
              {errors.confirm && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.confirm.message}</p>}
            </div>

            <button
              type="submit" disabled={isSubmitting}
              className="btn-primary"
              style={{ height: 48, fontSize: 15, gap: 8, width: '100%', borderRadius: 12, marginTop: 4 }}
            >
              {isSubmitting ? <Spinner /> : <><UserPlus className="w-4 h-4" /><span>Create Account</span></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', margin: 0 }}>
            Already have an account?{' '}
            <Link to={`/buyer/login${clientId ? `?client=${clientId}` : ''}`} style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}