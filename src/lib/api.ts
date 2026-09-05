import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import Cookies from 'js-cookie'
import { getActiveToken, getActiveRefreshToken, clearActiveSession, getActiveBuyerToken } from '../store/auth'

// Always use the Vite dev-proxy (/api → localhost:3000) so there are zero
// cross-origin issues on any device — desktop, mobile, or LAN IP.
// In production set VITE_API_URL to the real backend URL.
function getApiBase(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL
  // Relative path — Vite proxies /api/* → http://localhost:3000/api/*
  // Works on every device that accesses Vite (localhost OR 192.168.x.x).
  return '/api/v1'
}

// WebSocket URL — must be absolute (socket.io doesn't support relative).
// Same host as the page, but backend port 3000.
export function getWsBase(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const { hostname } = window.location
  return `http://${hostname}:3000`
}

const BASE = getApiBase()

// Safe UUID that works on both HTTP (mobile) and HTTPS
function genUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for HTTP (non-secure) contexts — mobile on local network
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export const api = axios.create({ baseURL: BASE, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  // Use buyer token for buyer routes
  const isBuyerRoute = cfg.url?.startsWith('/auth/buyer')
  const isStaffRoute = cfg.url?.startsWith('/staff') || cfg.url?.startsWith('/payments')
  const staffToken = Cookies.get('staff_at')
  // If a staff token is present and this is a staff/payments route, prefer staff token
  const t = isBuyerRoute
    ? getActiveBuyerToken()
    : (isStaffRoute && staffToken)
      ? staffToken
      : getActiveToken()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
  cfg.headers['X-Request-ID'] = genUUID()
  // Let the browser set the correct multipart/form-data boundary for FormData payloads
  if (cfg.data instanceof FormData) {
    delete cfg.headers['Content-Type']
  }
  return cfg
})

let refreshing = false
let queue: Array<{ res: (t: string) => void; rej: (e: unknown) => void }> = []

function flush(err: unknown, token?: string) {
  queue.forEach(p => err ? p.rej(err) : p.res(token!))
  queue = []
}

api.interceptors.response.use(
  r => r,
  async (err: AxiosError) => {
    const orig = err.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // For blob responses, the error body is a Blob — extract status from headers
    const status = err.response?.status

    if (status === 401 && !orig._retry) {
      if (refreshing) return new Promise<string>((res, rej) => queue.push({ res, rej }))
        .then(tok => { orig.headers.Authorization = `Bearer ${tok}`; return api(orig) })
      orig._retry = true; refreshing = true
      const rt = getActiveRefreshToken()
      if (!rt) {
        flush(err)
        clearActiveSession()
        window.location.href = '/login'
        return Promise.reject(err)
      }
      try {
        const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt })
        const at  = data?.data?.accessToken  || data?.accessToken
        const nrt = data?.data?.refreshToken || data?.refreshToken
        const isHttps = window.location.protocol === 'https:'
        const opts = { secure: isHttps, sameSite: 'lax' as const, expires: 7 }
        // Write back into the role-scoped cookie
        const path = window.location.pathname
        const isAdmin = path.startsWith('/admin')
        const isStaff = path.startsWith('/staff')
        const atKey = isAdmin ? 'admin_at' : isStaff ? 'staff_at' : 'client_at'
        const rtKey = isAdmin ? 'admin_rt' : isStaff ? 'staff_rt' : 'client_rt'
        Cookies.set(atKey, at, opts)
        if (nrt) Cookies.set(rtKey, nrt, opts)
        flush(null, at)
        orig.headers.Authorization = `Bearer ${at}`
        return api(orig)
      } catch (e) {
        flush(e)
        clearActiveSession()
        window.location.href = '/login'
        return Promise.reject(e)
      } finally { refreshing = false }
    }
    return Promise.reject(err)
  }
)

export function getErr(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data
    // Blob error responses (e.g. from export endpoints with responseType:'blob')
    if (data instanceof Blob) {
      // Return a generic message — the status code is the key signal
      const status = e.response?.status
      if (status === 401) return 'Session expired. Please log in again.'
      if (status === 403) return 'You do not have permission to access this resource.'
      if (status === 404) return 'Resource not found.'
      return `Server error (${status ?? 'unknown'})`
    }
    const m = data?.message
    return Array.isArray(m) ? m.join(', ') : m || e.message || 'Error'
  }
  return e instanceof Error ? e.message : 'Unexpected error'
}

// ── Auth ────────────────────────────────────────────────────────
export const authApi = {
  unifiedLogin: (b: { identifier: string; password: string }) => api.post('/auth/login', b),
  adminLogin:  (b: { identifier: string; password: string }) => api.post('/auth/admin/login', b),
  clientLogin: (b: { identifier: string; password: string }) => api.post('/auth/client/login', b),
  register: (b: object) => api.post('/auth/client/register', b),
  // Buyer auth
  registerBuyer: (b: { email?: string; phone?: string; password: string; name: string; clientId: string }) =>
    api.post('/auth/buyer/register', b),
  buyerLogin: (b: { identifier: string; password: string }) =>
    api.post('/auth/login', b),
  buyerMe: () => api.get('/auth/buyer/me'),
  buyerProfile: (b: { name?: string; phone?: string }) => api.put('/auth/buyer/profile', b),
  buyerChangePassword: (b: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/buyer/change-password', b),
  buyerTickets: () => api.get('/auth/buyer/tickets'),
  buyerPayments: () => api.get('/auth/buyer/payments'),
  //
  logout: (rt: string) => api.post('/auth/logout', { refreshToken: rt }),
  me: () => api.get('/auth/me'),
  changePassword: (b: object) => api.post('/auth/change-password', b),
}

// ── Plans ────────────────────────────────────────────────────────
export const plansApi = {
  list: () => api.get('/plans'),
  subscribe: (b: object) => api.post('/plans/subscribe', b),
  myActive: () => api.get('/plans/my-subscription/active'),
  myList: (p?: object) => api.get('/plans/my-subscriptions', { params: p }),
  cancel: (id: string) => api.patch(`/plans/my-subscriptions/${id}/cancel`),
  adminList: (p?: object) => api.get('/plans/admin/all', { params: p }),
  adminCreate: (b: object) => api.post('/plans/admin', b),
  adminUpdate: (id: string, b: object) => api.patch(`/plans/admin/${id}`, b),
  adminDelete: (id: string) => api.delete(`/plans/admin/${id}`),
  adminSubs: (p?: object) => api.get('/plans/admin/subscriptions', { params: p }),
  adminSubTxns: (p?: object) => api.get('/plans/admin/subscription-transactions', { params: p }),
  adminApprove: (id: string, b?: object) => api.patch(`/plans/admin/subscriptions/${id}/approve`, b),
  adminReject: (id: string, b: object) => api.patch(`/plans/admin/subscriptions/${id}/reject`, b),
}

// ── Lotteries ────────────────────────────────────────────────────
export const lotteriesApi = {
  publicList: (p?: object) => api.get('/lotteries/public', { params: p }),
  publicGet: (slug: string) => api.get(`/lotteries/public/${slug}`),
  list: (p?: object) => api.get('/lotteries', { params: p }),
  get: (id: string) => api.get(`/lotteries/${id}`),
  create: (b: object) => api.post('/lotteries', b),
  update: (id: string, b: object) => api.patch(`/lotteries/${id}`, b),
  publish: (id: string) => api.patch(`/lotteries/${id}/publish`),
  close: (id: string) => api.patch(`/lotteries/${id}/close`),
  archive: (id: string) => api.patch(`/lotteries/${id}/archive`),
  delete: (id: string) => api.delete(`/lotteries/${id}`),
  stats: (id: string) => api.get(`/lotteries/${id}/stats`),
  addPrize: (id: string, b: object) => api.post(`/lotteries/${id}/prizes`, b),
  delPrize: (id: string, pid: string) => api.delete(`/lotteries/${id}/prizes/${pid}`),
  uploadBanner: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/lotteries/${id}/banner`, fd)
  },
  uploadImage: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/lotteries/${id}/images`, fd)
  },
  deleteImage: (id: string, imageId: string) =>
    api.delete(`/lotteries/${id}/images/${imageId}`),
  reorderImages: (id: string, orderedIds: string[]) =>
    api.patch(`/lotteries/${id}/images/reorder`, { orderedIds }),
}

// ── Tickets ─────────────────────────────────────────────────────
export const ticketsApi = {
  reserve: (b: object) => api.post('/tickets/reserve', b),
  lottery: (id: string, p?: object) => api.get(`/tickets/lottery/${id}`, { params: p }),
  availableNumbers: (lotteryId: string, limit = 500) =>
    api.get<{ data?: string[] } | string[]>(`/tickets/lottery/${lotteryId}/available-numbers`, { params: { limit } }),
}

// ── Payments ─────────────────────────────────────────────────────
export const paymentsApi = {
  initiate: (b: object) => api.post('/payments/initiate', b),
  uploadSlip: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post(`/payments/${id}/slip`, fd)
  },
  track: (code: string) => api.get(`/payments/reference/${code}`),
  list: (p?: object) => api.get('/payments', { params: p }),
  get: (id: string) => api.get(`/payments/${id}`),
  approve: (id: string, b?: object) => api.patch(`/payments/${id}/approve`, b),
  reject:  (id: string, b: object) => api.patch(`/payments/${id}/reject`, b),
  refund:  (id: string, b: object) => api.patch(`/payments/${id}/refund`, b),
  review:  (id: string) => api.patch(`/payments/${id}/review`),
  softDelete: (id: string, b: object) => api.delete(`/payments/${id}`, { data: b }),
  restore:    (id: string)           => api.patch(`/payments/${id}/restore`),
  hardDelete: (id: string)           => api.delete(`/payments/${id}/permanent`),
  adminList: (p?: object) => api.get('/payments/admin/all', { params: p }),
  // Excel import/export
  importTemplate: (lotteryId?: string) =>
    api.get('/payments/import/template', { responseType: 'blob', params: lotteryId ? { lotteryId } : {} }),
  import: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/payments/import', fd)
  },
  // Bulk buyer import (JSON — no Excel needed from browser)
  bulkImportJson: (lotteryId: string, buyers: Array<{ name: string; phone: string; email?: string; quantity: number }>) =>
    api.post('/payments/bulk-import/json', { lotteryId, buyers }),
}

// ── Staff ─────────────────────────────────────────────────────────
export const staffApi = {
  login:        (b: object) => api.post('/staff/login', b),
  list:         (p?: object) => api.get('/staff', { params: p }),
  create:       (b: object) => api.post('/staff', b),
  update:       (id: string, b: object) => api.patch(`/staff/${id}`, b),
  toggleActive: (id: string) => api.patch(`/staff/${id}/toggle-active`),
  remove:       (id: string) => api.delete(`/staff/${id}`),
  activity:     (p?: object) => api.get('/staff/activity', { params: p }),
}

// ── Draws ────────────────────────────────────────────────────────
export const drawsApi = {
  execute: (id: string) => api.post(`/draws/lottery/${id}/execute`),
  manual: (id: string, winners: object[]) => api.post(`/draws/lottery/${id}/manual`, { winners }),
  publish: (id: string) => api.patch(`/draws/lottery/${id}/publish`),
  results: (id: string) => api.get(`/draws/lottery/${id}/results`),
  publicResults: (id: string) => api.get(`/draws/lottery/${id}/public-results`),
  verify: (id: string) => api.get(`/draws/lottery/${id}/verify`),
}

// ── Reports ─────────────────────────────────────────────────────
export const reportsApi = {
  dashboard: () => api.get('/reports/client/dashboard'),
  sales: (id: string) => api.get(`/reports/client/lottery/${id}/sales`),
  buyers: (p?: object) => api.get('/reports/client/buyers', { params: p }),
  buyerTickets: (buyerId: string, p?: object) => api.get(`/reports/client/buyers/${buyerId}/tickets`, { params: p }),
  buyerPayments: (buyerId: string, p?: object) => api.get(`/reports/client/buyers/${buyerId}/payments`, { params: p }),
  exportExcel: (lotteryId: string) =>
    api.get(`/reports/client/lottery/${lotteryId}/export/excel`, { responseType: 'blob' }),
  // Report preview endpoints with pagination
  lotteryTickets: (lotteryId: string, p?: object) =>
    api.get(`/reports/client/lottery/${lotteryId}/tickets`, { params: p }),
  lotteryBuyers: (lotteryId: string, p?: object) =>
    api.get(`/reports/client/lottery/${lotteryId}/buyers`, { params: p }),
  lotteryPayments: (lotteryId: string, p?: object) =>
    api.get(`/reports/client/lottery/${lotteryId}/payments`, { params: p }),
  lotteryWinners: (lotteryId: string, p?: object) =>
    api.get(`/reports/client/lottery/${lotteryId}/winners`, { params: p }),
  adminRevenue: (period?: string) => api.get('/reports/admin/revenue', { params: { period } }),
  adminSubs: () => api.get('/reports/admin/subscriptions'),
}

// ── Admin ────────────────────────────────────────────────────────
export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  clients: (p?: object) => api.get('/admin/clients', { params: p }),
  client: (id: string) => api.get(`/admin/clients/${id}`),
  clientStatus: (id: string, b: object) => api.patch(`/admin/clients/${id}/status`, b),
  clientVerify: (id: string, isVerified: boolean) => api.patch(`/admin/clients/${id}/verify`, { isVerified }),
  allLotteries: (p?: object) => api.get('/admin/lotteries', { params: p }),
  settings: () => api.get('/admin/settings'),
  publicSettings: () => api.get('/settings/public'),
  upsertSetting: (b: object) => api.post('/admin/settings', b),
  auditLogs: (p?: object) => api.get('/admin/audit-logs', { params: p }),
  // Bank accounts
  bankAccounts: () => api.get('/admin/bank-accounts'),
  createBankAccount: (b: object) => api.post('/admin/bank-accounts', b),
  updateBankAccount: (id: string, b: object) => api.patch(`/admin/bank-accounts/${id}`, b),
  toggleBankAccount: (id: string, isActive: boolean) =>
    api.patch(`/admin/bank-accounts/${id}/status`, { isActive }),
  deleteBankAccount: (id: string) => api.delete(`/admin/bank-accounts/${id}`),

  // User Management
  users: (p?: object) => api.get('/admin/users', { params: p }),
  user: (id: string) => api.get(`/admin/users/${id}`),
  createUser: (b: object) => api.post('/admin/users', b),
  updateUser: (id: string, b: object) => api.patch(`/admin/users/${id}`, b),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  toggleUserStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    api.patch(`/admin/users/${id}/status`, { status }),
  roles: () => api.get('/admin/roles'),

  // Approval Logs
  approvalLogs: (p?: object) => api.get('/admin/approval-logs', { params: p }),
  approvalStats: () => api.get('/admin/approval-logs/stats'),
}

// ── Public (no auth) ─────────────────────────────────────────────────────────
export const publicApi = {
  bankAccounts: () => api.get('/platform/bank-accounts'),
  plans: () => api.get('/plans'),
  operators: (p?: object) => api.get('/clients/public', { params: p }),
  clientByUsername: (username: string) => api.get(`/clients/by-username/${username}`),
  lotteriesByUsername: (username: string, p?: object) =>
    api.get(`/lotteries/public/by/${username}`, { params: p }),
  closedLotteriesByUsername: (username: string, p?: object) =>
    api.get(`/lotteries/public/by/${username}/closed`, { params: p }),
  winnersByUsername: (username: string, p?: object) =>
    api.get(`/lotteries/public/by/${username}/winners`, { params: p }),
  lotteryByUsername: (username: string, slug: string) =>
    api.get(`/lotteries/public/by/${username}/${slug}`),
  featuredLotteries: () => api.get('/lotteries/public', { params: { limit: 6 } }),
}

// ── Clients ──────────────────────────────────────────────────────
export const clientsApi = {
  me: () => api.get('/clients/me'),
  update: (b: object) => api.patch('/clients/me', b),
  banks: () => api.get('/clients/bank-accounts'),
  addBank: (b: object) => api.post('/clients/bank-accounts', b),
  delBank: (id: string) => api.delete(`/clients/bank-accounts/${id}`),
  // Logo upload
  uploadLogo: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/clients/me/logo', fd)
  },
  // Public — for buyers to see operator bank details (no auth needed)
  publicBanks: (clientId: string) =>
    api.get(`/clients/${clientId}/bank-accounts/public`),
  // Returns the URL to view/download a slip inline (auth required)
  // Must be absolute for use in fetch() calls from the browser
  slipUrl: (paymentId: string) => {
    const origin = window.location.origin
    // In dev, Vite proxies /api → localhost:3000, so use relative proxy path
    return `${origin}/api/v1/clients/payments/${paymentId}/slip`
  },
}
