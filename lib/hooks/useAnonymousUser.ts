import { useEffect, useState } from 'react'

/**
 * Generate or retrieve anonymous user ID from localStorage
 * Used for tracking unauthenticated users
 */
export function useAnonymousUser() {
  const [anonymousId, setAnonymousId] = useState<string | null>(null)

  useEffect(() => {
    const ANONYMOUS_ID_KEY = 'flair_anonymous_id'
    
    let id = localStorage.getItem(ANONYMOUS_ID_KEY)
    if (!id) {
      // Generate new anonymous ID
      id = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem(ANONYMOUS_ID_KEY, id)
      console.log('[AnonymousUser] Generated new anonymous ID:', id)
    } else {
      console.log('[AnonymousUser] Restored anonymous ID:', id)
    }
    
    setAnonymousId(id)
  }, [])

  return anonymousId
}
