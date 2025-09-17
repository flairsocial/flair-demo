import { useRef } from 'react'

interface PendingRequest {
  promise: Promise<any>
  timestamp: number
}

export function useRequestDeduplication() {
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map())
  const REQUEST_TIMEOUT = 30000 // 30 seconds timeout

  const deduplicate = async <T>(
    key: string,
    requestFn: () => Promise<T>,
    timeout = REQUEST_TIMEOUT
  ): Promise<T> => {
    // Clean up expired requests
    const now = Date.now()
    for (const [k, req] of pendingRequests.current.entries()) {
      if (now - req.timestamp > timeout) {
        pendingRequests.current.delete(k)
      }
    }

    // Check if request is already in flight
    const existing = pendingRequests.current.get(key)
    if (existing) {
      console.log(`[RequestDedup] Reusing existing request for ${key}`)
      return existing.promise as Promise<T>
    }

    // Create new request
    console.log(`[RequestDedup] Creating new request for ${key}`)
    const promise = requestFn().finally(() => {
      // Clean up after completion
      pendingRequests.current.delete(key)
    })

    pendingRequests.current.set(key, {
      promise,
      timestamp: now
    })

    return promise
  }

  const clearPendingRequests = (keyPattern?: string) => {
    if (keyPattern) {
      for (const [key] of pendingRequests.current.entries()) {
        if (key.includes(keyPattern)) {
          pendingRequests.current.delete(key)
        }
      }
    } else {
      pendingRequests.current.clear()
    }
  }

  const isPending = (key: string): boolean => {
    return pendingRequests.current.has(key)
  }

  return {
    deduplicate,
    clearPendingRequests,
    isPending
  }
}