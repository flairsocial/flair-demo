import { useState, useEffect, useCallback } from 'react'
import { useAnonymousUser } from './useAnonymousUser'

export interface FeedItem {
  product_id: string
  rank: number
  rec_type: string
  [key: string]: any
}

export interface FeedResponse {
  impression_id: string
  session_id: string
  items: FeedItem[]
}

export function useFeed() {
  const anonymousId = useAnonymousUser()
  const [impression_id, setImpressionId] = useState<string>()
  const [session_id, setSessionId] = useState<string>()
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Persist session to localStorage for reuse across page loads
  useEffect(() => {
    const savedSessionId = localStorage.getItem('feed_session_id')
    if (savedSessionId) {
      setSessionId(savedSessionId)
      console.log('[useFeed] Restored session from localStorage:', savedSessionId)
    }
  }, [])

  // Save session to localStorage when created
  useEffect(() => {
    if (session_id) {
      localStorage.setItem('feed_session_id', session_id)
      console.log('[useFeed] Saved session to localStorage:', session_id)
    }
  }, [session_id])

  const generateFeed = useCallback(
    async (surface = 'discovery', limit = 20) => {
      setLoading(true)
      setError(null)

      try {
        console.log(
          `[useFeed] Generating feed: surface=${surface}, limit=${limit}, session_id=${
            session_id || 'new'
          }, anonymous_id=${anonymousId || 'auth'}`
        )

        const url = new URL('/api/feed', window.location.origin)
        url.searchParams.set('surface', surface)
        url.searchParams.set('limit', limit.toString())
        if (session_id) {
          url.searchParams.set('session_id', session_id)
        }
        if (anonymousId) {
          url.searchParams.set('anonymous_id', anonymousId)
        }

        const response = await fetch(url.toString())

        if (!response.ok) {
          throw new Error(`Feed API error: ${response.status} ${response.statusText}`)
        }

        const data: FeedResponse = await response.json()

        console.log('[useFeed] Feed generated successfully:', {
          impression_id: data.impression_id,
          session_id: data.session_id,
          items_count: data.items.length,
        })

        setImpressionId(data.impression_id)
        setSessionId(data.session_id)
        setItems(data.items)

        return data
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('[useFeed] Feed generation error:', errorMessage)
        setError(errorMessage)
        setItems([])
        throw err
      } finally {
        setLoading(false)
      }
    },
    [session_id, anonymousId]
  )

  // Refresh feed (same session, new items)
  const refreshFeed = useCallback(
    async (surface = 'discovery', limit = 20) => {
      console.log('[useFeed] Refreshing feed (same session)')
      return generateFeed(surface, limit)
    },
    [generateFeed]
  )

  // Reset to clear session and start fresh
  const resetFeed = useCallback(() => {
    console.log('[useFeed] Resetting feed (new session)')
    setImpressionId(undefined)
    setSessionId(undefined)
    setItems([])
    localStorage.removeItem('feed_session_id')
  }, [])

  return {
    impression_id,
    session_id,
    items,
    loading,
    error,
    generateFeed,
    refreshFeed,
    resetFeed,
  }
}
