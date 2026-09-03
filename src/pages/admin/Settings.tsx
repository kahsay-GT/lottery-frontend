import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Globe, Mail, Shield, Tag, Save } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi, getErr } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Spinner } from '../../components/ui/Spinner'

interface Setting {
  id: string
  key: string
  value: string
  group: string
  label?: string
  description?: string
}

const GROUP_ICONS: Record<string, React.ElementType> = {
  general: Globe,
  email: Mail,
  security: Shield,
  tickets: Tag,
}

function SettingRow({ setting }: { setting: Setting }) {
  const qc = useQueryClient()
  const [val, setVal] = useState(setting.value ?? '')

  useEffect(() => {
    setVal(setting.value ?? '')
  }, [setting.value])

  const mut = useMutation({
    mutationFn: () => adminApi.upsertSetting({ key: setting.key, value: val }),
    onSuccess: () => {
      toast.success(`"${setting.label ?? setting.key}" saved`)
      qc.invalidateQueries({ queryKey: ['admin-settings'] })
    },
    onError: (e) => toast.error(getErr(e)),
  })

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <Input
          label={setting.label ?? setting.key}
          value={val}
          onChange={e => setVal(e.target.value)}
          hint={setting.description}
        />
      </div>
      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending || val === setting.value}
        className="btn-primary px-3 py-2 flex items-center gap-1.5 text-sm shrink-0 mb-0.5"
      >
        {mut.isPending ? (
          <Spinner className="w-3.5 h-3.5" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        Save
      </button>
    </div>
  )
}

export function AdminSettings() {
  const { data, isLoading } = useQuery<Setting[]>({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.settings().then(r => r.data?.data),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  const settings: Setting[] = Array.isArray(data) ? data : []

  // Group settings by their group field
  const groups = settings.reduce<Record<string, Setting[]>>((acc, s) => {
    const g = (s.group ?? 'general').toLowerCase()
    if (!acc[g]) acc[g] = []
    acc[g].push(s)
    return acc
  }, {})

  const groupOrder = ['general', 'email', 'security', 'tickets']
  const excludedGroups = ['payment', 'payments']
  const sortedGroups = [
    ...groupOrder.filter(g => groups[g]),
    ...Object.keys(groups).filter(g => !groupOrder.includes(g) && !excludedGroups.includes(g)),
  ]

  return (
    <div className="space-y-6">
      <h1 className="page-title">Settings</h1>

      {sortedGroups.length === 0 && (
        <div className="glass-card p-8 text-center text-gray-500">
          No settings configured
        </div>
      )}

      {sortedGroups.map(group => {
        const Icon = GROUP_ICONS[group] ?? Globe
        return (
          <div key={group} className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <h2 className="text-white font-semibold capitalize">{group}</h2>
            </div>
            <div className="space-y-4">
              {groups[group].map(s => (
                <SettingRow key={s.key} setting={s} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
