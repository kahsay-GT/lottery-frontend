import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, Ticket, ArrowRight } from 'lucide-react'
import { authApi, getErr } from '../../lib/api'
import { useBuyerAuth } from '../../store/auth'
import { Spinner } from '../../components/ui/Spinner'
import { PublicNav } from '../../components/layout/PublicNav'

// Accepts: email OR phone (with/without country code, spaces, dashes)
const identifierSchema = z
  .string()
  .min(1, 'Email or phone number required')
  .refine(
    v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?[\d\s\-().]{7,}$/.test(v),
    'Enter valid email or phone',
  )

const schema = z.object({
  identifier: identifierSchema,
  password:   z.string().min(1, 'Required'),
})
type F = z.infer<typeof schema>

export function BuyerLoginPage() {
  const navigate = useNavigate()
  const buyerAuth = useBuyerAuth()
  const [show, setShow] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (d: F) => {
    try {
      const res  = await authApi.unifiedLogin({ identifier: d.identifier, password: d.password })
      const data = res.data?.data ?? res.data
      if (data.user?.role !== 'buyer') {
        toast.error('Invalid credentials for buyer account')
        return
      }
      buyerAuth.setAuth({ ...data.user, role: 'buyer' as const }, data.accessToken, data.refreshToken)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/buyer/dashboard')
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
              Buyer Sign In
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Access your tickets and payments
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
            <div>
              <label className="label">Email or Phone Number</label>
              <input
                className="input-dark"
                type="text"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                placeholder="+251 912 345 678  or  you@example.com"
                style={{ height: 46, fontSize: 16 }}
                {...register('identifier')}
              />
              {errors.identifier && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.identifier.message}</p>}
            </div>

            <div style={{ position: 'relative' }}>
              <label className="label">Password</label>
              <input
                className="input-dark"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
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

            <button
              type="submit" disabled={isSubmitting}
              className="btn-primary"
              style={{ height: 48, fontSize: 15, gap: 8, width: '100%', borderRadius: 12, marginTop: 4 }}
            >
              {isSubmitting ? <Spinner /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Don't have an account?{' '}
              <Link to="/buyer/register" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
                Sign Up
              </Link>
            </p>
            <Link to="/login" style={{ fontSize: 13, color: '#4b5563', textDecoration: 'none' }}>
              Operator login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
