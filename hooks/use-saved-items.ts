import { useQuery } from '@tanstack/react-query'

export function useSavedItems() {
  return useQuery({
    queryKey: ['saved-items'],
    queryFn: async () => {
      const response = await fetch('/api/saved')
      if (!response.ok) {
        throw new Error('Failed to fetch saved items')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}