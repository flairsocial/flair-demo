import { useCallback, useState, useEffect } from 'react'
import { useAnonymousUser } from './useAnonymousUser'

interface TrackEventParams {
  action: 'view' | 'click' | 'save' | 'unsave' | 'like' | 'share' | 'chat_open' | 'chat_message'
  product_id?: string
  impression_id?: string
  session_id?: string
  dwell_time?: number
  payload?: Record<string, any>
  anonymous_id?: string
}

export function useAnalytics() {
  const anonymousId = useAnonymousUser()
  const [isTracking, setIsTracking] = useState(false)

  const trackEvent = useCallback(async (params: TrackEventParams) => {
    try {
      setIsTracking(true)

      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          anonymous_id: params.anonymous_id || anonymousId,
        }),
      })

      if (!response.ok) {
        // Silently handle 401 (auth not ready yet) - will retry on next event
        if (response.status === 401) {
          console.debug('[Analytics] Auth not ready, event queued for retry')
          return
        }
        console.error('Failed to track event:', response.statusText)
      }
    } catch (error) {
      // Silently handle network errors - will retry on next event
      console.debug('[Analytics] Tracking error:', error instanceof Error ? error.message : error)
    } finally {
      setIsTracking(false)
    }
  }, [])

  const trackClick = useCallback(
    (productId: string, impressionId?: string, sessionId?: string) => {
      trackEvent({
        action: 'click',
        product_id: productId,
        impression_id: impressionId,
        session_id: sessionId,
      })
    },
    [trackEvent]
  )

  const trackSave = useCallback(
    (productId: string, productData?: any, impressionId?: string) => {
      trackEvent({
        action: 'save',
        product_id: productId,
        impression_id: impressionId,
        payload: { product_data: productData },
      })
    },
    [trackEvent]
  )

  const trackUnsave = useCallback(
    (productId: string, impressionId?: string) => {
      trackEvent({
        action: 'unsave',
        product_id: productId,
        impression_id: impressionId,
      })
    },
    [trackEvent]
  )

  const trackChatMessage = useCallback(
    (productId: string, chatText: string, sessionId?: string) => {
      trackEvent({
        action: 'chat_message',
        product_id: productId,
        session_id: sessionId,
        payload: { chat_text: chatText },
      })
    },
    [trackEvent]
  )

  const trackChatOpen = useCallback(
    (productId: string, sessionId?: string) => {
      trackEvent({
        action: 'chat_open',
        product_id: productId,
        session_id: sessionId,
      })
    },
    [trackEvent]
  )

  const trackDwell = useCallback(
    (
      productId: string,
      dwellSeconds: number,
      impressionId?: string,
      sessionId?: string
    ) => {
      trackEvent({
        action: 'view',
        product_id: productId,
        dwell_time: dwellSeconds,
        impression_id: impressionId,
        session_id: sessionId,
      })
    },
    [trackEvent]
  )

  return {
    trackEvent,
    trackClick,
    trackSave,
    trackUnsave,
    trackChatMessage,
    trackChatOpen,
    trackDwell,
    isTracking,
  }
}
