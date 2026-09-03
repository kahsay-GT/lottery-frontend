import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, EyeOff, Ticket, UserPlus, Phone } from 'lucide-react'
import { authApi, getErr } from '../../lib/api'
import { Spinner } from '../../components/ui/Spinner'

// At least one of email or phone must be provided
const schema = z.object({
  name:         z.string().min(2, 'Name required'),
  businessName: z.string().min(2, 'Business name required'),
  identifier:   z
    .string()
    .min(1, 'Email or phone number required')
    .refine(
      v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^\+?[\d\s\-().]{7,}$/.test(v),
      'Enter a valid email or phone number',
    ),
  password: z.string().min(8, 'Min 8 chars').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Needs uppercase, lowercase, number & symbol',
  ),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })

type F = z.infer<typeof schema>

function isPhone(v: string) {
  return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p style={{ fontSize: 12, color: '#f87171', marginTop: 5 }}>{error}</p>}
    </div>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (d: F) => {
    try {
      const raw = d.identifier.trim()
      const phone = isPhone(raw)
      const payload = {
        name:         d.name,
        businessName: d.businessName,
        password:     d.password,
        ...(phone
          ? { phone: raw.replace(/[\s\-().]/g, '') }
          : { email: raw }),
      }
      await authApi.register(payload)
      toast.success('Account created! You can now sign in.')
      navigate('/login')
    } catch (e) {
      toast.error(getErr(e))
    }
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    height: 46, fontSize: 16,
    ...(hasError ? { borderColor: 'rgba(239,68,68,0.5)' } : {}),
  })

  return (
    <div style={{ minHeight: '100svh', background: '#08090f', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'clamp(20px,5vw,48px) 16px', boxSizing: 'border-box' }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', right: '20%', width: 'min(400px, 70vw)', height: 'min(400px, 70vw)', background: 'radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 70%)', borderRadius: '50%' }} />
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}>
            <Ticket className="w-7 h-7 text-white" />
          </div>
          <h1 style={{ fontSize: 'clamp(20px,6vw,26px)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Create Operator Account
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Start running your own lotteries</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 'clamp(16px,5vw,24px)', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Name + Business */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
            <Field label="Your Name *" error={errors.name?.message}>
              <input className="input-dark" type="text" autoComplete="name" placeholder="John Doe" style={inputStyle(!!errors.name)} {...register('name')} />
            </Field>
            <Field label="Business Name *" error={errors.businessName?.message}>
              <input className="input-dark" type="text" autoComplete="organization" placeholder="Acme Lotteries" style={inputStyle(!!errors.businessName)} {...register('businessName')} />
            </Field>
          </div>

          {/* Email or Phone — primary identifier */}
          <Field label="Email or Phone Number *" error={errors.identifier?.message}>
            <div style={{ position: 'relative' }}>
              <Phone style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#6b7280', pointerEvents: 'none' }} />
              <input
                className="input-dark"
                type="text"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                placeholder="+251 912 345 678  or  you@business.com"
                style={{ ...inputStyle(!!errors.identifier), paddingLeft: 36 }}
                {...register('identifier')}
                onChange={e => {
                  const v = e.target.value
                  e.target.inputMode = /^[+0-9]/.test(v.trimStart()) ? 'tel' : 'email'
                }}
              />
            </div>
          </Field>

          {/* Password */}
          <Field label="Password *" error={errors.password?.message}>
            <div style={{ position: 'relative' }}>
              <input
                className="input-dark"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Min 8 chars, upper+number+symbol"
                style={{ ...inputStyle(!!errors.password), paddingRight: 48 }}
                {...register('password')}
              />
              <button type="button" onClick={() => setShow(s => !s)}
                style={{ position: 'absolute', right: 0, top: 0, width: 48, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
                aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirm Password *" error={errors.confirm?.message}>
            <input className="input-dark" type="password" autoComplete="new-password" placeholder="Repeat password" style={inputStyle(!!errors.confirm)} {...register('confirm')} />
          </Field>

          <p style={{ fontSize: 12, color: '#6b7280', margin: '-6px 0 0', lineHeight: 1.5 }}>
            Must contain uppercase, lowercase, a number and a symbol (e.g. @$!%*?&amp;)
          </p>

          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ height: 48, fontSize: 15, gap: 8, width: '100%', borderRadius: 12, marginTop: 4 }}>
            {isSubmitting ? <Spinner /> : <><UserPlus className="w-4 h-4" /> Create Account</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', margin: 0 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  )
}
