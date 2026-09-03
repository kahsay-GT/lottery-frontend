/**
 * WebSocket hooks — wraps socket.io-client for real-time payment & subscription events.
 *
 * Events emitted by the backend:
 *   payment:updated      — PaymentStatusPayload
 *   subscription:updated — SubscriptionStatusPayload
 *   notification         — { title, message, type }
 *
 * Rooms:
 *   - Authenticated clients/admins join their rooms on connect (server-side)
 *   - Guests call track:join / track:leave to follow a specific referenceCode
 */

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getActiveToken } from '../store/auth'
import { getWsBase } from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentStatusPayload {
  paymentId: string
  referenceCode: string
  status: string
  amount: number
  currency: string
  lotteryName?: string
  tickets?: string[]
  rejectionReason?: string
  verificationStatus?: string
  verificationReason?: string
  autoApproved?: boolean
  updatedAt: string
}

export interface SubscriptionStatusPayload {
  transactionId: string
  subscriptionId: string
  status: string
  planName?: string
  verificationStatus?: string
  verificationReason?: string
  autoApproved?: boolean
  updatedAt: string
}

export interface SocketNotification {
  title: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

// ─── Socket URL ───────────────────────────────────────────────────────────────
// Uses getWsBase() which returns same-host:3000 — works on localhost and LAN IP.

// ─── Singleton socket per session ────────────────────────────────────────────

let _socket: Socket | null = null
let _lastToken: string = ''

function getSocket(): Socket {
  const token = getActiveToken() ?? ''

  // If we have an existing socket with the same token, reuse it
  if (_socket && _lastToken === token) return _socket

  // Token changed (e.g. after login) or first call — rebuild
  if (_socket) {
    _socket.removeAllListeners()
    _socket.disconnect()
    _socket = null
  }

  _lastToken = token

  _socket = io(`${getWsBase()}/ws`, {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 5,
    autoConnect: true,
    timeout: 10000,
  })

  _socket.on('connect', () => {
    console.debug('[WS] connected:', _socket?.id)
  })
  _socket.on('disconnect', (reason) => {
    console.debug('[WS] disconnected:', reason)
    if (reason === 'io server disconnect') {
      _socket = null
    }
  })
  _socket.on('connect_error', (err) => {
    console.debug('[WS] connection error:', err.message)
  })

  return _socket
}

/** Call this on logout to cleanly sever the connection */
export function disconnectSocket() {
  if (_socket) {
    _socket.removeAllListeners()
    _socket.disconnect()
    _socket = null
  }
}

// ─── Hook: listen for payment status updates (authenticated client / admin) ──

export function usePaymentEvents(
  onUpdate: (payload: PaymentStatusPayload) => void,
  onNotification?: (n: SocketNotification) => void,
) {
  const cbRef = useRef(onUpdate)
  const notiRef = useRef(onNotification)
  useEffect(() => { cbRef.current = onUpdate }, [onUpdate])
  useEffect(() => { notiRef.current = onNotification }, [onNotification])

  useEffect(() => {
    const socket = getSocket()

    const handlePayment = (payload: PaymentStatusPayload) => cbRef.current(payload)
    const handleNotification = (n: SocketNotification) => notiRef.current?.(n)

    socket.on('payment:updated', handlePayment)
    socket.on('notification', handleNotification)

    return () => {
      socket.off('payment:updated', handlePayment)
      socket.off('notification', handleNotification)
    }
  }, [])
}

// ─── Hook: listen for subscription status updates (authenticated client) ──────

export function useSubscriptionEvents(
  onUpdate: (payload: SubscriptionStatusPayload) => void,
  onNotification?: (n: SocketNotification) => void,
) {
  const cbRef = useRef(onUpdate)
  const notiRef = useRef(onNotification)
  useEffect(() => { cbRef.current = onUpdate }, [onUpdate])
  useEffect(() => { notiRef.current = onNotification }, [onNotification])

  useEffect(() => {
    const socket = getSocket()

    const handleSub = (payload: SubscriptionStatusPayload) => cbRef.current(payload)
    const handleNotification = (n: SocketNotification) => notiRef.current?.(n)

    socket.on('subscription:updated', handleSub)
    socket.on('notification', handleNotification)

    return () => {
      socket.off('subscription:updated', handleSub)
      socket.off('notification', handleNotification)
    }
  }, [])
}

// ─── Hook: track a specific payment by reference code (guest) ────────────────

export function useTrackPayment(
  referenceCode: string | undefined,
  onUpdate: (payload: PaymentStatusPayload) => void,
) {
  const cbRef = useRef(onUpdate)
  useEffect(() => { cbRef.current = onUpdate }, [onUpdate])

  useEffect(() => {
    if (!referenceCode) return

    const socket = getSocket()

    const handleUpdate = (payload: PaymentStatusPayload) => {
      if (payload.referenceCode === referenceCode) {
        cbRef.current(payload)
      }
    }

    socket.emit('track:join', { referenceCode })
    socket.on('payment:updated', handleUpdate)

    return () => {
      socket.emit('track:leave', { referenceCode })
      socket.off('payment:updated', handleUpdate)
    }
  }, [referenceCode])
}

// ─── Hook: connection status indicator ───────────────────────────────────────

export function useSocketStatus(): 'connected' | 'disconnected' | 'connecting' {
  const ref = useRef<'connected' | 'disconnected' | 'connecting'>('connecting')

  useEffect(() => {
    const socket = getSocket()
    const onConnect = () => { ref.current = 'connected' }
    const onDisconnect = () => { ref.current = 'disconnected' }
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    if (socket.connected) ref.current = 'connected'
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  return ref.current
}

// ─── Convenience: emit with useCallback ──────────────────────────────────────

export function useSocketEmit() {
  return useCallback((event: string, data?: unknown) => {
    getSocket().emit(event, data)
  }, [])
}
