import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { type Lang, translations } from '../lib/i18n'

// ─── Context ─────────────────────────────────────────────────────────────────
interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
  t: <S extends keyof typeof translations>(
    section: S,
    key: keyof (typeof translations)[S]
  ) => string
}

const LangContext = createContext<LangCtx | null>(null)

const STORAGE_KEY = 'public_lang'

// ─── Provider ─────────────────────────────────────────────────────────────────
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored === 'en' || stored === 'am') ? stored : 'am'   // Amharic default
  })

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }, [])

  const t = useCallback(<S extends keyof typeof translations>(
    section: S,
    key: keyof (typeof translations)[S],
  ): string => {
    const entry = translations[section]?.[key] as Record<Lang, string> | undefined
    if (!entry) {
      console.warn(`[i18n] Missing translation: ${String(section)}.${String(key)}`)
      return String(key)
    }
    return entry[lang] ?? entry['en'] ?? String(key)
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside LangProvider')
  return ctx
}

// ─── Language Switcher ────────────────────────────────────────────────────────
export function LangSwitcher() {
  const { lang, setLang } = useLang()

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: 2, gap: 1,
      flexShrink: 0,
    }}>
      {(['am', 'en'] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          title={l === 'am' ? 'አማርኛ' : 'English'}
          style={{
            padding: '3px 9px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            transition: 'background 0.15s, color 0.15s',
            background: lang === l
              ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
              : 'transparent',
            color: lang === l ? '#fff' : '#9ca3af',
          }}
        >
          {l === 'am' ? 'አማ' : 'EN'}
        </button>
      ))}
    </div>
  )
}
