import { useQuery } from '@tanstack/react-query'

export function useUserPurchases() {
  return useQuery({
    queryKey: ['user-purchases'],
    queryFn: async () => {
      // TODO: Implement purchases API when available
      // For now, return empty array to prevent errors
      return []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}