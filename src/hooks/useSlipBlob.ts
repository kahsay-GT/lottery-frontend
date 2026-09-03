/**
 * useSlipBlob
 *
 * Fetches a payment slip via the authenticated API and returns a blob URL,
 * MIME type, loading state, and error state.
 *
 * The caller is responsible for revoking the objectURL when done.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface Options {
  paymentId: string
  /** Absolute URL to the slip endpoint */
  url: string
  /** Bearer token to pass in the Authorization header */
  token: string
  /** Extra query key prefix so admin and client caches don't collide */
  prefix?: string
}

interface Result {
  blobUrl:  string | null
  mimeType: string
  loading:  boolean
  error:    boolean
}

export function useSlipBlob({ paymentId, url, token, prefix = 'slip' }: Options): Result {
  const [blobUrl,  setBlobUrl]  = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('image/jpeg')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(false)

  useQuery({
    queryKey: [prefix, 'blob', paymentId],
    queryFn: async () => {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`${res.status}`)
      const mime = res.headers.get('Content-Type') ?? 'image/jpeg'
      setMimeType(mime)
      const blob = await res.blob()
      const obj  = URL.createObjectURL(blob)
      setBlobUrl(obj)
      setLoading(false)
      return obj
    },
    retry: false,
    // @ts-expect-error onError is still supported in RQ v4
    onError: () => { setLoading(false); setError(true) },
  })

  return { blobUrl, mimeType, loading, error }
}
