import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection (was cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when user returns to tab
      retry: 1, // Only retry failed requests once
      refetchOnMount: false, // Don't refetch when component mounts if cache is valid
    },
  },
})

// Query keys for consistent caching across the entire app
export const queryKeys = {
  // User data
  profile: (userId?: string) => ['profile', userId],
  savedItems: (userId?: string) => ['saved-items', userId],
  collections: (userId?: string) => ['collections', userId],
  userPurchases: (userId?: string) => ['purchases', userId],
  
  // Product data  
  products: (filters: any) => ['products', filters],
  productDetail: (id: string) => ['product', id],
  productSearch: (query: string, category: string, page: number) => ['product-search', query, category, page],
  
  // Chat data
  chatHistory: (userId?: string) => ['chat-history', userId],
  chatMemory: (sessionId: string) => ['chat-memory', sessionId],
  
  // Community data
  communityPosts: (filters: any) => ['community-posts', filters],
  communityPost: (id: string) => ['community-post', id],
  
  // Settings
  userSettings: (userId?: string) => ['user-settings', userId],
}