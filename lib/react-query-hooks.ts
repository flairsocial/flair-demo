import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'
import { queryKeys } from './query-client'

// ============= USER DATA QUERIES =============

export function useProfile() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: queryKeys.profile(user?.id),
    queryFn: async () => {
      const response = await fetch('/api/user/profile')
      if (!response.ok) throw new Error('Failed to fetch profile')
      return response.json()
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // Profile data can be stale for 10 minutes
  })
}

export function useSavedItems() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: queryKeys.savedItems(user?.id),
    queryFn: async () => {
      const response = await fetch('/api/saved')
      if (!response.ok) throw new Error('Failed to fetch saved items')
      return response.json()
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // Saved items can be stale for 2 minutes
  })
}

export function useCollections() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: queryKeys.collections(user?.id),
    queryFn: async () => {
      const response = await fetch('/api/collections')
      if (!response.ok) throw new Error('Failed to fetch collections')
      return response.json()
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Collections can be stale for 5 minutes
  })
}

export function useUserPurchases() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: queryKeys.userPurchases(user?.id),
    queryFn: async () => {
      const response = await fetch('/api/purchases')
      if (!response.ok) throw new Error('Failed to fetch purchases')
      return response.json()
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000, // Purchases rarely change, 30 minutes
  })
}

// ============= PRODUCT DATA QUERIES =============

export function useProducts(searchQuery: string = '', category: string = 'All', page: number = 1) {
  return useQuery({
    queryKey: queryKeys.productSearch(searchQuery, category, page),
    queryFn: async () => {
      const params = new URLSearchParams({
        q: searchQuery,
        category: category === 'All' ? '' : category,
        page: page.toString(),
        limit: '20'
      })
      
      const response = await fetch(`/api/products?${params}`)
      if (!response.ok) throw new Error('Failed to fetch products')
      return response.json()
    },
    staleTime: 3 * 60 * 1000, // Product search results can be stale for 3 minutes
    keepPreviousData: true, // Keep previous results while loading new ones
  })
}

export function useProductDetail(productId: string) {
  return useQuery({
    queryKey: queryKeys.productDetail(productId),
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}`)
      if (!response.ok) throw new Error('Failed to fetch product details')
      return response.json()
    },
    enabled: !!productId,
    staleTime: 15 * 60 * 1000, // Product details rarely change, 15 minutes
  })
}

// ============= CHAT DATA QUERIES =============

export function useChatHistory() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: queryKeys.chatHistory(user?.id),
    queryFn: async () => {
      const response = await fetch('/api/chat/history')
      if (!response.ok) throw new Error('Failed to fetch chat history')
      return response.json()
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // Chat history should be relatively fresh, 1 minute
  })
}

export function useChatMemory(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.chatMemory(sessionId),
    queryFn: async () => {
      const response = await fetch(`/api/chat/memory/${sessionId}`)
      if (!response.ok) throw new Error('Failed to fetch chat memory')
      return response.json()
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000, // Chat memory should be very fresh, 30 seconds
  })
}

// ============= COMMUNITY DATA QUERIES =============

export function useCommunityPosts(filters: any = {}) {
  return useQuery({
    queryKey: queryKeys.communityPosts(filters),
    queryFn: async () => {
      const params = new URLSearchParams(filters)
      const response = await fetch(`/api/community/posts?${params}`)
      if (!response.ok) throw new Error('Failed to fetch community posts')
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // Community posts can be stale for 2 minutes
  })
}

// ============= MUTATIONS (FOR UPDATING DATA) =============

export function useAddToSaved() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async (item: any) => {
      const response = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      if (!response.ok) throw new Error('Failed to save item')
      return response.json()
    },
    onSuccess: () => {
      // Instantly update the saved items cache
      queryClient.invalidateQueries({ queryKey: queryKeys.savedItems(user?.id) })
    },
  })
}

export function useRemoveFromSaved() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch('/api/saved', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId }),
      })
      if (!response.ok) throw new Error('Failed to remove item')
      return response.json()
    },
    onSuccess: () => {
      // Instantly update the saved items cache
      queryClient.invalidateQueries({ queryKey: queryKeys.savedItems(user?.id) })
    },
  })
}

export function useCreateCollection() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async (collection: any) => {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collection),
      })
      if (!response.ok) throw new Error('Failed to create collection')
      return response.json()
    },
    onSuccess: () => {
      // Instantly update the collections cache
      queryClient.invalidateQueries({ queryKey: queryKeys.collections(user?.id) })
    },
  })
}