import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { User, Lock, Eye, EyeOff, Save, CheckCircle2 } from 'lucide-react'
import { authApi, getErr } from '../../lib/api'
import { useBuyerAuth } from '../../store/auth'
import { Spinner } from '../../components/ui/Spinner'

const profileSchema = z.object({
  name: z.string().min(2, 'Name required'),
  phone: z.string().min(9, 'Valid phone required'),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'Min 8 chars').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Needs uppercase, lowercase, number & symbol',
  ),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
})
type PasswordForm = z.infer<typeof passwordSchema>

export function BuyerProfile() {
  const queryClient = useQueryClient()
  const buyerAuth = useBuyerAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')

  const { data: me, isLoading } = useQuery({
    queryKey: ['buyer-me'],
    queryFn: () => authApi.buyerMe().then(r => r.data?.data ?? r.data),
  })

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', phone: '' },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const updateProfile = useMutation({
    mutationFn: (d: ProfileForm) => authApi.buyerProfile(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-me'] })
      toast.success('Profile updated successfully!')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const changePassword = useMutation({
    mutationFn: (d: PasswordForm) => authApi.buyerChangePassword({
      currentPassword: d.currentPassword,
      newPassword: d.newPassword,
    }),
    onSuccess: () => {
      toast.success('Password changed successfully!')
      passwordForm.reset()
    },
    onError: (e) => toast.error(getErr(e)),
  })

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading profile...</div>
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-gray-400">Manage your account details</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/5">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'profile' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:text-white'
          }`}
        >
          <User size={16} /> Profile
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'password' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Lock size={16} /> Password
        </button>
      </div>

      {/* Profile Form */}
      {activeTab === 'profile' && (
        <div className="glass-card p-6">
          <form onSubmit={profileForm.handleSubmit(d => updateProfile.mutate(d))}>
            <div className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  className="input-dark"
                  type="text"
                  defaultValue={me?.name}
                  {...profileForm.register('name')}
                />
                {profileForm.formState.errors.name && (
                  <p className="text-xs text-red-400 mt-1">{profileForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  className="input-dark"
                  type="email"
                  value={me?.email || ''}
                  disabled
                  style={{ opacity: 0.6 }}
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="label">Phone Number</label>
                <input
                  className="input-dark"
                  type="tel"
                  defaultValue={me?.phone || ''}
                  {...profileForm.register('phone')}
                />
                {profileForm.formState.errors.phone && (
                  <p className="text-xs text-red-400 mt-1">{profileForm.formState.errors.phone.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
                {updateProfile.isPending ? <Spinner /> : <><Save size={16} /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Form */}
      {activeTab === 'password' && (
        <div className="glass-card p-6">
          <form onSubmit={passwordForm.handleSubmit(d => changePassword.mutate(d))}>
            <div className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  className="input-dark"
                  type={showPassword ? 'text' : 'password'}
                  {...passwordForm.register('currentPassword')}
                />
              </div>

              <div>
                <label className="label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-dark"
                    type={showPassword ? 'text' : 'password'}
                    {...passwordForm.register('newPassword')}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-red-400 mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="label">Confirm New Password</label>
                <input
                  className="input-dark"
                  type="password"
                  {...passwordForm.register('confirmPassword')}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={changePassword.isPending}
                className="btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
                {changePassword.isPending ? <Spinner /> : <><Lock size={16} /> Change Password</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account Info */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Account Information</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CheckCircle2 size={14} className="text-emerald-400" />
          {me?.status === 'ACTIVE' ? 'Account Active' : me?.status}
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Member since {new Date(me?.createdAt || Date.now()).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}