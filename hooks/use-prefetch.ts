import { useEffect, useRef } from 'react'

interface PrefetchConfig {
  delay?: number // Delay before prefetching (ms)
  priority?: 'high' | 'low'
}

export function usePrefetch() {
  const prefetchedRef = useRef<Set<string>>(new Set())
  const prefetchTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const prefetchData = (
    key: string, 
    fetcher: () => Promise<any>, 
    config: PrefetchConfig = {}
  ) => {
    const { delay = 1000, priority = 'low' } = config
    
    // Don't prefetch if already done
    if (prefetchedRef.current.has(key)) {
      return
    }
    
    // Clear any existing timeout for this key
    const existingTimeout = prefetchTimeoutRef.current.get(key)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Schedule prefetch
    const timeout = setTimeout(async () => {
      try {
        console.log(`[Prefetch] Loading ${key} in background...`)
        await fetcher()
        prefetchedRef.current.add(key)
        prefetchTimeoutRef.current.delete(key)
      } catch (error) {
        console.warn(`[Prefetch] Failed to prefetch ${key}:`, error)
      }
    }, priority === 'high' ? delay / 2 : delay)
    
    prefetchTimeoutRef.current.set(key, timeout)
  }

  const clearPrefetch = (key?: string) => {
    if (key) {
      const timeout = prefetchTimeoutRef.current.get(key)
      if (timeout) {
        clearTimeout(timeout)
        prefetchTimeoutRef.current.delete(key)
      }
      prefetchedRef.current.delete(key)
    } else {
      // Clear all
      prefetchTimeoutRef.current.forEach(timeout => clearTimeout(timeout))
      prefetchTimeoutRef.current.clear()
      prefetchedRef.current.clear()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => clearPrefetch()
  }, [])

  return { prefetchData, clearPrefetch }
}