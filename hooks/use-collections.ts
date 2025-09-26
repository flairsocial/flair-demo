import { useQuery } from '@tanstack/react-query'

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const response = await fetch('/api/collections')
      if (!response.ok) {
        throw new Error('Failed to fetch collections')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}