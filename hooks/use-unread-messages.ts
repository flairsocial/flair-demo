"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"

export function useUnreadMessages() {
  const { user } = useUser()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Load unread count on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadUnreadCount()
    }
  }, [user?.id])

  const loadUnreadCount = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/direct-messages/unread-count')
      if (!response.ok) {
        throw new Error('Failed to load unread count')
      }
      const data = await response.json()
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Error loading unread count:', error)
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  const markConversationAsRead = async (conversationId: string) => {
    if (!user?.id) return false
    
    try {
      const response = await fetch(`/api/direct-messages/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error('Failed to mark messages as read')
      }
      
      const data = await response.json()
      if (data.success) {
        // Refresh unread count
        await loadUnreadCount()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error marking messages as read:', error)
      return false
    }
  }

  // Utility to refresh unread count (e.g., after receiving a new message)
  const refreshUnreadCount = () => {
    loadUnreadCount()
  }

  return {
    unreadCount,
    loading,
    loadUnreadCount,
    markConversationAsRead,
    refreshUnreadCount
  }
}