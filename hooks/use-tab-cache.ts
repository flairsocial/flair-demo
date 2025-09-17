import { useRef, useCallback } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  loading: boolean
}

interface TabCacheHook<T> {
  getCachedData: (key: string) => T | null
  setCachedData: (key: string, data: T) => void
  isCacheValid: (key: string, maxAge?: number) => boolean
  clearCache: (key?: string) => void
  setLoading: (key: string, loading: boolean) => void
  isLoading: (key: string) => boolean
}

export function useTabCache<T>(defaultMaxAge = 5 * 60 * 1000): TabCacheHook<T> {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map())

  const getCachedData = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key)
    return entry?.data || null
  }, [])

  const setCachedData = useCallback((key: string, data: T) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      loading: false
    })
  }, [])

  const isCacheValid = useCallback((key: string, maxAge = defaultMaxAge): boolean => {
    const entry = cacheRef.current.get(key)
    if (!entry) return false
    return (Date.now() - entry.timestamp) < maxAge
  }, [defaultMaxAge])

  const clearCache = useCallback((key?: string) => {
    if (key) {
      cacheRef.current.delete(key)
    } else {
      cacheRef.current.clear()
    }
  }, [])

  const setLoading = useCallback((key: string, loading: boolean) => {
    const entry = cacheRef.current.get(key)
    if (entry) {
      entry.loading = loading
    } else {
      cacheRef.current.set(key, {
        data: null as T,
        timestamp: Date.now(),
        loading
      })
    }
  }, [])

  const isLoading = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key)
    return entry?.loading || false
  }, [])

  return {
    getCachedData,
    setCachedData,
    isCacheValid,
    clearCache,
    setLoading,
    isLoading
  }
}