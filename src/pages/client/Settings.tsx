import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { User, Lock, CreditCard, Bell, Eye, EyeOff, Save, Plus, Trash2, Loader2, AtSign, ExternalLink, Camera, Upload } from 'lucide-react'
import { clientsApi, authApi, getErr } from '../../lib/api'
import { useClientAuth } from '../../store/auth'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'

type Tab = 'profile' | 'security' | 'bank' | 'notifications'

const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only')
    .optional()
    .or(z.literal(''))
    .transform(v => v || undefined),
  name: z.string().min(2, 'Name required'),
  businessName: z.string().min(2, 'Business name required'),
  phone: z.string().optional().or(z.literal('')).transform(v => v || undefined),
  website: z.string().url().optional().or(z.literal('')).transform(v => v || undefined),
  address: z.string().optional(),
  city: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 'Too weak'),
  confirm: z.string(),
}).refine(d => d.newPassword === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })

const bankSchema = z.object({
  bankName: z.string().min(2, 'Required'),
  accountName: z.string().min(2, 'Required'),
  accountNumber: z.string().min(4, 'Required'),
  branchName: z.string().optional(),
  isDefault: z.boolean().optional(),
})

type PF = z.infer<typeof profileSchema>
type PWF = z.infer<typeof passwordSchema>
type BF = z.infer<typeof bankSchema>

export function ClientSettings() {
  const { user, setUser } = useClientAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('profile')
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [bankModal, setBankModal] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const profileForm = useForm<PF>({ resolver: zodResolver(profileSchema) })
  const passwordForm = useForm<PWF>({ resolver: zodResolver(passwordSchema) })
  const bankForm = useForm<BF>({ resolver: zodResolver(bankSchema), defaultValues: { isDefault: false } })

  const { data: meRes, isLoading: meLoading } = useQuery({
    queryKey: ['client-me'],
    queryFn: () => clientsApi.me().then(r => r.data?.data),
  })
  const me = meRes

  useEffect(() => {
    if (me) {
      profileForm.reset({
        username: (me as Record<string, unknown>).username as string ?? '',
        name: me.name ?? '',
        businessName: me.businessName ?? '',
        phone: me.phone ?? '',
        website: me.website ?? '',
        address: me.address ?? '',
        city: me.city ?? '',
      })
    }
  }, [me])

  const { data: banksRes, isLoading: banksLoading } = useQuery({
    queryKey: ['my-banks'],
    queryFn: () => clientsApi.banks().then(r => r.data?.data ?? r.data),
    enabled: tab === 'bank',
  })
  const banks = (banksRes ?? []) as Record<string, unknown>[]

  const profileMut = useMutation({
    mutationFn: (d: PF) => clientsApi.update(d),
    onSuccess: (res) => {
      const u = res.data?.data ?? res.data
      setUser({ name: u.name, businessName: u.businessName })
      qc.invalidateQueries({ queryKey: ['client-me'] })
      toast.success('Profile saved!')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const logoMut = useMutation({
    mutationFn: (file: File) => clientsApi.uploadLogo(file),
    onSuccess: (res) => {
      const logo = res.data?.data?.logo ?? res.data?.logo
      if (logo) setLogoPreview(`${window.location.origin}${logo}`)
      qc.invalidateQueries({ queryKey: ['client-me'] })
      toast.success('Profile picture updated!')
    },
    onError: (e) => toast.error(getErr(e)),
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setLogoPreview(URL.createObjectURL(file))
    logoMut.mutate(file)
  }

  const passwordMut = useMutation({
    mutationFn: (d: PWF) => authApi.changePassword({ currentPassword: d.currentPassword, newPassword: d.newPassword }),
    onSuccess: () => { toast.success('Password changed!'); passwordForm.reset() },
    onError: (e) => toast.error(getErr(e)),
  })

  const addBankMut = useMutation({
    mutationFn: (d: BF) => clientsApi.addBank(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-banks'] }); toast.success('Bank account added'); setBankModal(false); bankForm.reset() },
    onError: (e) => toast.error(getErr(e)),
  })

  const delBankMut = useMutation({
    mutationFn: (id: string) => clientsApi.delBank(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-banks'] }); toast.success('Removed') },
    onError: (e) => toast.error(getErr(e)),
  })

  const tabs: { id: Tab; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'bank', label: 'Bank Accounts', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar */}
        <nav className="lg:w-48 shrink-0 flex lg:flex-col gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={tab === id ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">{label}</span>
              <span className="lg:hidden text-xs">{label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── Profile ── */}
          {tab === 'profile' && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-4 mb-6 pb-5 border-b border-white/10">
                {/* ── Clickable logo / avatar ── */}
                <div className="relative shrink-0 group">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-16 h-16 rounded-2xl overflow-hidden cursor-pointer ring-2 ring-transparent group-hover:ring-primary-500/60 transition-all relative"
                    title="Click to upload profile picture"
                  >
                    {/* Show uploaded preview, existing logo, or initials fallback */}
                    {logoPreview || (me as Record<string, unknown>)?.logo ? (
                      <img
                        src={logoPreview ?? ((me as Record<string, unknown>).logo as string)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center text-2xl font-black text-white">
                        {(me?.name ?? user?.name)?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {logoMut.isPending
                        ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                        : <Camera className="w-5 h-5 text-white" />}
                    </div>
                  </div>
                  {/* Small upload badge */}
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary-600 border-2 border-gray-900 flex items-center justify-center hover:bg-primary-500 transition-colors"
                    title="Change photo"
                  >
                    <Upload className="w-3 h-3 text-white" />
                  </button>
                </div>

                <div>
                  <p className="text-lg font-bold text-white">{me?.name ?? user?.name}</p>
                  <p className="text-sm text-gray-400">{me?.email ?? user?.email}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(me?._count as Record<string,number>)?.lotteries ?? 0} lotteries ·{' '}
                    {(me?._count as Record<string,number>)?.buyers ?? 0} buyers
                  </p>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="text-xs text-primary-400 hover:text-primary-300 mt-1 transition-colors"
                  >
                    Change photo
                  </button>
                </div>
              </div>

              {meLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : (
                <form onSubmit={profileForm.handleSubmit(d => profileMut.mutate(d))} className="space-y-4">
                  {/* ── Username ── */}
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Public URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <AtSign className="w-4 h-4 text-gray-500" />
                      </div>
                      <input
                        {...profileForm.register('username')}
                        placeholder="your-username"
                        className="w-full h-10 pl-9 pr-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-600 outline-none focus:border-primary-500/60 transition-colors font-mono"
                        onChange={e => {
                          // Force lowercase on input
                          const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                          profileForm.setValue('username', v, { shouldValidate: true })
                        }}
                      />
                    </div>
                    {profileForm.formState.errors.username && (
                      <p className="text-xs text-red-400 mt-1.5">{profileForm.formState.errors.username.message}</p>
                    )}
                    {/* Live URL preview */}
                    {(() => {
                      const uname = profileForm.watch('username')
                      if (!uname) return null
                      const preview = `${window.location.origin}/${uname}`
                      return (
                        <a
                          href={preview}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {preview}
                        </a>
                      )
                    })()}
                    <p className="text-xs text-gray-500 mt-2">
                      Lowercase letters, numbers and hyphens only. This is the public URL where buyers find your lotteries.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Full Name *" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
                    <Input label="Business Name *" error={profileForm.formState.errors.businessName?.message} {...profileForm.register('businessName')} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Phone" type="tel" placeholder="+251 912 345 678" {...profileForm.register('phone')} />
                    <Input label="Website" type="url" placeholder="https://yoursite.com" error={profileForm.formState.errors.website?.message} {...profileForm.register('website')} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Address" placeholder="123 Main Street" {...profileForm.register('address')} />
                    <Input label="City" placeholder="Addis Ababa" {...profileForm.register('city')} />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={profileMut.isPending} className="btn-primary flex items-center gap-2">
                      {profileMut.isPending ? <Spinner /> : <><Save className="w-4 h-4" /> Save Profile</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── Security ── */}
          {tab === 'security' && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-1">Change Password</h2>
              <p className="text-sm text-gray-400 mb-5">Use a strong password with uppercase, numbers and symbols</p>
              <form onSubmit={passwordForm.handleSubmit(d => passwordMut.mutate(d))} className="space-y-4 max-w-md">
                <div className="relative">
                  <Input label="Current Password" type={showCur ? 'text' : 'password'}
                    error={passwordForm.formState.errors.currentPassword?.message}
                    {...passwordForm.register('currentPassword')} />
                  <button type="button" onClick={() => setShowCur(!showCur)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-white transition-colors">
                    {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Input label="New Password" type={showNew ? 'text' : 'password'}
                    error={passwordForm.formState.errors.newPassword?.message}
                    {...passwordForm.register('newPassword')} />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-white transition-colors">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Input label="Confirm New Password" type="password"
                  error={passwordForm.formState.errors.confirm?.message}
                  {...passwordForm.register('confirm')} />
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={passwordMut.isPending} className="btn-primary flex items-center gap-2">
                    {passwordMut.isPending ? <Spinner /> : <><Lock className="w-4 h-4" /> Update Password</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Bank Accounts ── */}
          {tab === 'bank' && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white">Bank Accounts</h2>
                  <p className="text-sm text-gray-400">Accounts buyers will transfer payments to</p>
                </div>
                <button onClick={() => setBankModal(true)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2">
                  <Plus className="w-4 h-4" /> Add Account
                </button>
              </div>

              {banksLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : banks.length === 0 ? (
                <div className="border border-dashed border-white/15 rounded-2xl p-10 text-center">
                  <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-300 font-medium">No bank accounts added</p>
                  <p className="text-sm text-gray-500 mt-1">Add your bank so buyers know where to transfer</p>
                  <button onClick={() => setBankModal(true)} className="btn-primary mt-4 text-sm flex items-center gap-2 mx-auto">
                    <Plus className="w-4 h-4" /> Add Bank Account
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {banks.map((b) => (
                    <div key={b.id as string} className="flex items-center justify-between p-4 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/6 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary-600/20 flex items-center justify-center shrink-0">
                          <CreditCard className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{b.accountName as string}</p>
                          <p className="text-xs font-mono text-gray-400 tracking-wider">{b.accountNumber as string}</p>
                          <p className="text-xs text-gray-500">{(b.bank as Record<string,string>)?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {Boolean(b.isDefault) && (
                          <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">
                            Default
                          </span>
                        )}
                        <button
                          onClick={() => { if (confirm('Remove this account?')) delBankMut.mutate(b.id as string) }}
                          disabled={delBankMut.isPending}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Notifications ── */}
          {tab === 'notifications' && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-1">Notification Preferences</h2>
              <p className="text-sm text-gray-400 mb-5">Choose when you receive notifications</p>
              <div className="space-y-1 divide-y divide-white/5">
                {[
                  { label: 'Payment received', desc: 'When a buyer submits a payment slip', on: true },
                  { label: 'Payment approved', desc: 'After you approve a payment', on: true },
                  { label: 'Lottery closing soon', desc: '24h before ticket sale ends', on: true },
                  { label: 'Draw reminder', desc: 'When draw date is due', on: true },
                  { label: 'Winners announced', desc: 'After results are published', on: false },
                  { label: 'Subscription expiry', desc: '7 days before subscription expires', on: true },
                ].map(({ label, desc, on }) => (
                  <label key={label} className="flex cursor-pointer items-center justify-between py-3.5 hover:opacity-80 transition-opacity">
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    <div className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ml-6 ${on ? 'bg-primary-600' : 'bg-gray-700'}`}>
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button onClick={() => toast.success('Preferences saved')} className="btn-primary text-sm flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Bank Modal */}
      <Modal open={bankModal} onClose={() => { setBankModal(false); bankForm.reset() }}
        title="Add Bank Account" description="Buyers will transfer payments to this account" size="sm">
        <form onSubmit={bankForm.handleSubmit(d => addBankMut.mutate(d))} className="space-y-3">
          <Input label="Bank Name *" placeholder="Commercial Bank of Ethiopia"
            error={bankForm.formState.errors.bankName?.message} {...bankForm.register('bankName')} />
          <Input label="Account Holder Name *" placeholder="Lucky Draw Ltd"
            error={bankForm.formState.errors.accountName?.message} {...bankForm.register('accountName')} />
          <Input label="Account Number *" placeholder="1000123456789"
            error={bankForm.formState.errors.accountNumber?.message} {...bankForm.register('accountNumber')} />
          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input type="checkbox" className="w-4 h-4 rounded accent-primary-600" {...bankForm.register('isDefault')} />
            <span className="text-sm text-gray-300">Set as default account</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setBankModal(false); bankForm.reset() }}>Cancel</button>
            <button type="submit" disabled={addBankMut.isPending} className="btn-primary flex items-center gap-2">
              {addBankMut.isPending ? <Spinner /> : <><Plus className="w-4 h-4" /> Save Account</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// End of Settings
