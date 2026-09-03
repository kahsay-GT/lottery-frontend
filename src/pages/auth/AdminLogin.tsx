import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, ShieldCheck, ArrowRight, Phone } from 'lucide-react'
import { authApi, getErr } from '../../lib/api'
import { useAdminAuth } from '../../store/auth'
import { Spinner } from '../../components/ui/Spinner'

const schema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or phone number required')
    .refine(
      v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?[\d\s\-().]{7,}$/.test(v),
      'Enter a valid email or phone number',
    ),
  password: z.string().min(1, 'Required'),
})
type F = z.infer<typeof schema>

function normalise(v: string) {
  const isPhone = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  return isPhone ? v.replace(/[\s\-().]/g, '') : v
}

export function AdminLoginPage() {
  const navigate  = useNavigate()
  const adminAuth = useAdminAuth()
  const [show, setShow] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (d: F) => {
    try {
      const res  = await authApi.adminLogin({ identifier: normalise(d.identifier.trim()), password: d.password })
      const data = res.data?.data ?? res.data
      adminAuth.setAuth(
        { ...data.user, role: 'super_admin' as const },
        data.accessToken,
        data.refreshToken,
      )
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate('/admin/dashboard')
    } catch (e) {
      toast.error(getErr(e))
    }
  }

  return (
    <div style={{
      minHeight: '80svh', background: '#08090f',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(24px,5vw,48px) 16px',
    }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: 'min(500px,90vw)', height: 'min(500px,90vw)',
          background: 'radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(220,38,38,0.25)',
          }}>
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 style={{ fontSize: 'clamp(22px,6vw,28px)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Admin Portal
          </h1>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 'clamp(16px,5vw,24px)', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Identifier */}
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
              placeholder="admin@example.com  or  +251 912 345 678"
              style={{ height: 46, fontSize: 15, ...(errors.identifier ? { borderColor: 'rgba(239,68,68,0.5)' } : {}) }}
              {...register('identifier')}
              onChange={e => {
                const v = e.target.value
                e.target.inputMode = /^[+0-9]/.test(v.trimStart()) ? 'tel' : 'email'
              }}
            />
            {errors.identifier && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.identifier.message}</p>}
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <label className="label">Password</label>
            <input
              className="input-dark"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              style={{ height: 46, fontSize: 16, paddingRight: 48, ...(errors.password ? { borderColor: 'rgba(239,68,68,0.5)' } : {}) }}
              {...register('password')}
            />
            <button type="button" onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: 0, top: 20, width: 48, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {errors.password && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{errors.password.message}</p>}
          </div>

          <button
            type="submit" disabled={isSubmitting}
            style={{ height: 48, fontSize: 15, width: '100%', borderRadius: 12, marginTop: 4, cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: isSubmitting ? 'rgba(220,38,38,0.5)' : 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff', fontWeight: 600, fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(220,38,38,0.25)', opacity: isSubmitting ? 0.7 : 1, transition: 'all 0.15s' }}
          >
            {isSubmitting ? <Spinner /> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {/* Back link */}
        <div style={{ textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: 13, color: '#4b5563', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#6b7280')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}>
            ← Operator login
          </Link>
        </div>

        {/* Demo credentials */}
        {/* <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 18px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px', textAlign: 'center' }}>
            Demo Admin
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#c8cad8', fontFamily: 'monospace' }}>admin@lotterysaas.com</span>
            <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'monospace' }}>Admin@123456</span>
          </div>
        </div> */}
      </div>
    </div>
  )
}
