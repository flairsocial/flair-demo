import { useState, useEffect } from 'react'

interface ProfileCounts {
  savedItemsCount: number
  collectionsCount: number
  ordersCount: number
  postsCount: number
}

export function useProfileCounts() {
  const [counts, setCounts] = useState<ProfileCounts>({
    savedItemsCount: 0,
    collectionsCount: 0,
    ordersCount: 0,
    postsCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/user/profile/counts')
        
        if (!response.ok) {
          throw new Error('Failed to fetch profile counts')
        }
        
        const data = await response.json()
        setCounts(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching profile counts:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch counts')
      } finally {
        setLoading(false)
      }
    }

    fetchCounts()
  }, [])

  const refreshCounts = async () => {
    try {
      const response = await fetch('/api/user/profile/counts')
      if (response.ok) {
        const data = await response.json()
        setCounts(data)
      }
    } catch (err) {
      console.error('Error refreshing profile counts:', err)
    }
  }

  return {
    counts,
    loading,
    error,
    refreshCounts
  }
}