import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, Ticket, ArrowRight, Phone } from 'lucide-react'
import { authApi, getErr } from '../../lib/api'
import { useClientAuth, useBuyerAuth, useStaffAuth } from '../../store/auth'
import { Spinner } from '../../components/ui/Spinner'
import { PublicNav } from '../../components/layout/PublicNav'

// Accepts: email  OR  phone (with/without country code, spaces, dashes)
const identifierSchema = z
  .string()
  .min(1, 'Email or phone number required')
  .refine(
    v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?[\d\s\-().]{7,}$/.test(v),
    'Enter a valid email or phone number',
  )

const schema = z.object({
  identifier: identifierSchema,
  password:   z.string().min(1, 'Password required'),
})
type F = z.infer<typeof schema>

// Normalise phone: strip spaces/dashes/parens for backend
function normalise(v: string) {
  const isPhone = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  return isPhone ? v.replace(/[\s\-().]/g, '') : v
}

export function LoginPage() {
  const navigate   = useNavigate()
  const clientAuth = useClientAuth()
  const buyerAuth  = useBuyerAuth()
  const staffAuth  = useStaffAuth()

  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<F>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (d: F) => {
    setLoading(true)
    const identifier = normalise(d.identifier.trim())
    try {
      const res  = await authApi.unifiedLogin({ identifier, password: d.password })
      const data = res.data?.data ?? res.data
      const { role } = data.user

      if (role === 'client') {
        clientAuth.setAuth({ ...data.user, role: 'client' }, data.accessToken, data.refreshToken)
        toast.success(`Welcome back, ${data.user.name}!`)
        navigate('/client/dashboard')
      } else if (role === 'buyer') {
        buyerAuth.setAuth({ ...data.user, role: 'buyer' }, data.accessToken, data.refreshToken)
        toast.success(`Welcome back, ${data.user.name}!`)
        navigate('/buyer/dashboard')
      } else if (role === 'staff') {
        staffAuth.setAuth({ ...data.user, role: 'staff' }, data.accessToken, data.refreshToken)
        toast.success(`Welcome, ${data.user.name}!`)
        navigate('/staff/payments')
      } else {
        toast.error('Unknown account type. Please contact support.')
      }
    } catch (e) {
      toast.error(getErr(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '90svh', background: '#08090f' }}>
      <PublicNav />

      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: 'min(540px,90vw)', height: 'min(540px,90vw)',
          background: 'radial-gradient(circle, rgba(99,102,241,0.13) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(24px,5vw,56px) 16px',
        minHeight: 'calc(100svh - 68px)',
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Logo + heading */}
          <div style={{ textAlign: 'center' }}>
            
            <h1 style={{ fontSize: 'clamp(22px,6vw,28px)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Sign In
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Use your email or phone number to continue
            </p>
          </div>

          {/* Form card */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 20,
              padding: 'clamp(18px,5vw,28px)',
              display: 'flex', flexDirection: 'column', gap: 18,
            }}
          >
            {/* Email or Phone */}
            <div>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone style={{ width: 12, height: 12 }} />
                Email or Phone Number
              </label>
              <input
                className="input-dark"
                type="text"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                placeholder="+251 912 345 678  or  you@example.com"
                style={{
                  height: 46, fontSize: 15,
                  ...(errors.identifier ? { borderColor: 'rgba(239,68,68,0.5)' } : {}),
                }}
                {...register('identifier')}
                onChange={e => {
                  // switch keyboard to tel if it looks like a phone
                  const v = e.target.value
                  const looksPhone = /^[+0-9]/.test(v.trimStart())
                  e.target.inputMode = looksPhone ? 'tel' : 'email'
                }}
              />
              {errors.identifier && (
                <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.identifier.message}</p>
              )}
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <label className="label">Password</label>
              <input
                className="input-dark"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  height: 46, fontSize: 15, paddingRight: 48,
                  ...(errors.password ? { borderColor: 'rgba(239,68,68,0.5)' } : {}),
                }}
                {...register('password')}
              />
              <button
                type="button" onClick={() => setShow(s => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 0, top: 22, width: 48, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {errors.password && (
                <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                height: 48, borderRadius: 12, fontWeight: 700, fontSize: 15,
                background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                color: '#fff', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 18px rgba(99,102,241,0.35)',
                transition: 'opacity 0.2s',
                marginTop: 2,
              }}
            >
              {loading ? <Spinner /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Register link */}
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', margin: 0 }}>
            New operator?{' '}
            <Link to="/pricing" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
              Create an account
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
