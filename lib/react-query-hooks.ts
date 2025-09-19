import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'

// ============= WORKING REACT QUERY HOOKS =============
// These hooks cache the EXACT same API calls your app already makes successfully

// 1. Products/Marketplace - mirrors the working /api/products calls
export function useProducts(searchQuery: string = '', category: string = 'All', page: number = 1) {
  return useQuery({
    queryKey: ['products', searchQuery, category, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      if (searchQuery) params.append('query', searchQuery)
      if (category && category !== 'All') params.append('category', category)
      params.append('page', page.toString())
      params.append('limit', '20')
      
      const response = await fetch(`/api/products?${params}`)
      if (!response.ok) throw new Error('Failed to fetch products')
      return response.json()
    },
    enabled: true, // Always enabled to provide caching benefits
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

// 2. Community Posts - mirrors the working /api/community calls  
export function useCommunityPosts(options: { limit?: number, offset?: number } = {}) {
  return useQuery({
    queryKey: ['community-posts', options],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('limit', (options.limit || 20).toString())
      params.append('offset', (options.offset || 0).toString())
      
      const response = await fetch(`/api/community?${params}`)
      if (!response.ok) throw new Error('Failed to fetch community posts')
      return response.json()
    },
    enabled: true,
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

// 3. Direct Messages - mirrors the working /api/direct-messages calls
export function useDirectMessages() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['direct-messages', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/direct-messages')
      if (!response.ok) throw new Error('Failed to fetch direct messages')
      return response.json()
    },
    enabled: !!user?.id,
    staleTime: 5 * 1000, // Cache for only 5 seconds (real-time messaging)
    gcTime: 30 * 1000, // Keep in cache for 30 seconds
    refetchInterval: 10 * 1000, // Auto-refresh every 10 seconds for new messages
  })
}

// 4. Chat History - mirrors the working /api/chat-history calls
export function useChatHistory() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['chat-history', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/chat-history')
      if (!response.ok) throw new Error('Failed to fetch chat history')
      return response.json()
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

// 5. Saved Items - mirrors the working /api/saved calls
export function useSavedItems() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['saved-items', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/saved')
      if (!response.ok) throw new Error('Failed to fetch saved items')
      return response.json()
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

// 6. Collections - mirrors the working /api/collections calls
export function useCollections() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['collections', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/collections')
      if (!response.ok) throw new Error('Failed to fetch collections')
      return response.json()
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  })
}

// 7. User Profile - mirrors the working /api/profile calls
export function useProfile() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/profile')
      if (!response.ok) throw new Error('Failed to fetch profile')
      return response.json()
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  })
}

// 8. Conversations - mirrors the working /api/conversations calls
export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${conversationId}`)
      if (!response.ok) throw new Error('Failed to fetch conversation')
      return response.json()
    },
    enabled: !!conversationId,
    staleTime: 5 * 1000, // Cache for only 5 seconds (real-time messaging)
    gcTime: 30 * 1000, // Keep in cache for 30 seconds
    refetchInterval: 10 * 1000, // Auto-refresh every 10 seconds for new messages
  })
}

// 9. User Purchases - DISABLED (no API endpoint exists)
export function useUserPurchases() {
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['user-purchases', user?.id],
    queryFn: async () => {
      // This endpoint doesn't exist yet
      return []
    },
    enabled: false, // Disabled until API endpoint is created
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
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
      queryClient.invalidateQueries({ queryKey: ['saved-items', user?.id] })
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
      queryClient.invalidateQueries({ queryKey: ['saved-items', user?.id] })
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
      queryClient.invalidateQueries({ queryKey: ['collections', user?.id] })
    },
  })
}

// ============= MESSAGING MUTATIONS =============

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string, content: string }) => {
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          conversationId,
          content: content.trim()
        }),
      })
      if (!response.ok) throw new Error('Failed to send message')
      return response.json()
    },
    onSuccess: (_, { conversationId }) => {
      // Immediately refresh all message-related caches
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['direct-messages', user?.id] })
      // Note: Unread count uses original hook system, not React Query
    },
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(`/api/direct-messages/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to mark as read')
      return response.json()
    },
    onSuccess: (_, conversationId) => {
      // Immediately update notification-related caches
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['direct-messages', user?.id] })
      // Note: Unread count uses original hook system, not React Query
    },
  })
}

// ============= MESSAGING MUTATIONS =============

// DISABLED: API endpoints don't exist yet
/*
export function useSendMessage() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string, content: string }) => {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, content }),
      })
      if (!response.ok) throw new Error('Failed to send message')
      return response.json()
    },
    onSuccess: (_, { conversationId }) => {
      // Update conversation and messages cache
      queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.directMessages(user?.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount(user?.id) })
    },
  })
}

export function useMarkAsRead() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      })
      if (!response.ok) throw new Error('Failed to mark as read')
      return response.json()
    },
    onSuccess: (_, conversationId) => {
      // Update relevant caches
      queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount(user?.id) })
    },
  })
}
*/

// ============= COMMUNITY MUTATIONS =============

// DISABLED: API endpoints don't exist yet
/*
export function useCreatePost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (post: any) => {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      })
      if (!response.ok) throw new Error('Failed to create post')
      return response.json()
    },
    onSuccess: () => {
      // Refresh community posts
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
    },
  })
}

export function useLikePost() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string, liked: boolean }) => {
      const response = await fetch('/api/community/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, liked }),
      })
      if (!response.ok) throw new Error('Failed to like/unlike post')
      return response.json()
    },
    onSuccess: (_, { postId }) => {
      // Update specific post and posts list
      queryClient.invalidateQueries({ queryKey: queryKeys.communityPost(postId) })
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
    },
  })
}
*/