import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import Cookies from 'js-cookie'

export type Role = 'super_admin' | 'client' | 'buyer' | 'staff'

export interface AuthUser {
  id: string; email: string; name: string; role: Role
  businessName?: string; status?: string; clientId?: string
}

interface AuthStore {
  user: AuthUser | null
  isAuth: boolean
  setAuth: (user: AuthUser, at: string, rt: string) => void
  clear: () => void
  setUser: (u: Partial<AuthUser>) => void
  refreshToken: string | undefined
}

function cookieOpts() {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'
  return { secure, sameSite: 'lax' as const, expires: 7 }
}

// ── Buyer store (must be first to avoid circular deps) ───────────────────────
export const useBuyerAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuth: false,
      refreshToken: Cookies.get('buyer_rt'),
      setAuth(user, at, rt) {
        Cookies.set('buyer_at', at, cookieOpts())
        Cookies.set('buyer_rt', rt, cookieOpts())
        set({ user, isAuth: true, refreshToken: rt })
      },
      clear() {
        Cookies.remove('buyer_at')
        Cookies.remove('buyer_rt')
        set({ user: null, isAuth: false, refreshToken: undefined })
      },
      setUser(u) {
        set(s => ({ user: s.user ? { ...s.user, ...u } : null }))
      },
    }),
    {
      name: 'lottery-auth-buyer',
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ user: s.user, isAuth: s.isAuth }),
    },
  ),
)

// Buyer token helpers
export function getActiveBuyerToken(): string | undefined {
  return Cookies.get('buyer_at')
}

export function getActiveBuyerRefreshToken(): string | undefined {
  return Cookies.get('buyer_rt')
}

// ── Admin store ───────────────────────────────────────────────────────────────
export const useAdminAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuth: false,
      refreshToken: Cookies.get('admin_rt'),
      setAuth(user, at, rt) {
        Cookies.set('admin_at', at, cookieOpts())
        Cookies.set('admin_rt', rt, cookieOpts())
        set({ user, isAuth: true, refreshToken: rt })
      },
      clear() {
        Cookies.remove('admin_at')
        Cookies.remove('admin_rt')
        set({ user: null, isAuth: false, refreshToken: undefined })
      },
      setUser(u) {
        set(s => ({ user: s.user ? { ...s.user, ...u } : null }))
      },
    }),
    {
      name: 'lottery-auth-admin',
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ user: s.user, isAuth: s.isAuth }),
    },
  ),
)

// ── Client store ──────────────────────────────────────────────────────────────
export const useClientAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuth: false,
      refreshToken: Cookies.get('client_rt'),
      setAuth(user, at, rt) {
        Cookies.set('client_at', at, cookieOpts())
        Cookies.set('client_rt', rt, cookieOpts())
        set({ user, isAuth: true, refreshToken: rt })
      },
      clear() {
        Cookies.remove('client_at')
        Cookies.remove('client_rt')
        set({ user: null, isAuth: false, refreshToken: undefined })
      },
      setUser(u) {
        set(s => ({ user: s.user ? { ...s.user, ...u } : null }))
      },
    }),
    {
      name: 'lottery-auth-client',
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ user: s.user, isAuth: s.isAuth }),
    },
  ),
)

// ── Unified hook — kept for any page that still calls useAuth() ───────────────
export function useAuth() {
  const admin  = useAdminAuth()
  const client = useClientAuth()
  const path   = typeof window !== 'undefined' ? window.location.pathname : ''

  if (path.startsWith('/admin'))  return admin.isAuth  ? admin  : client
  if (path.startsWith('/client')) return client.isAuth ? client : admin
  // Public pages — prefer client, fall back to admin
  if (client.isAuth) return client
  if (admin.isAuth)  return admin
  return client   // default (unauthenticated)
}

// ── Token getters used by the API interceptor ─────────────────────────────────
export function getActiveToken(): string | undefined {
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  if (path.startsWith('/admin'))  return Cookies.get('admin_at')
  if (path.startsWith('/client')) return Cookies.get('client_at') || Cookies.get('staff_at')
  if (path.startsWith('/buyer'))  return getActiveBuyerToken()
  if (path.startsWith('/staff'))  return Cookies.get('staff_at')
  // Public pages — use client token if present, else admin
  return Cookies.get('client_at') || Cookies.get('admin_at')
}

export function getActiveRefreshToken(): string | undefined {
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  if (path.startsWith('/admin'))  return Cookies.get('admin_rt')
  if (path.startsWith('/buyer'))  return getActiveBuyerRefreshToken()
  if (path.startsWith('/staff'))  return Cookies.get('staff_rt')
  return Cookies.get('client_rt')
}

// ── Staff store ───────────────────────────────────────────────────────────────
export const useStaffAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuth: false,
      refreshToken: Cookies.get('staff_rt'),
      setAuth(user, at, rt) {
        Cookies.set('staff_at', at, cookieOpts())
        Cookies.set('staff_rt', rt, cookieOpts())
        set({ user, isAuth: true, refreshToken: rt })
      },
      clear() {
        Cookies.remove('staff_at')
        Cookies.remove('staff_rt')
        set({ user: null, isAuth: false, refreshToken: undefined })
      },
      setUser(u) {
        set(s => ({ user: s.user ? { ...s.user, ...u } : null }))
      },
    }),
    {
      name: 'lottery-auth-staff',
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ user: s.user, isAuth: s.isAuth }),
    },
  ),
)

export function clearActiveSession() {
  const path = typeof window !== 'undefined' ? window.location.pathname : ''
  if (path.startsWith('/admin')) useAdminAuth.getState().clear()
  else if (path.startsWith('/buyer')) useBuyerAuth.getState().clear()
  else if (path.startsWith('/staff')) useStaffAuth.getState().clear()
  else useClientAuth.getState().clear()
}