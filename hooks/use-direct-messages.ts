"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"

export function useDirectMessages() {
  const { user } = useUser()
  const [conversations, setConversations] = useState<any[]>([])
  const [currentMessages, setCurrentMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  // Load conversations on mount
  useEffect(() => {
    if (user?.id) {
      loadConversations()
    }
  }, [user?.id])

  const loadConversations = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/direct-messages')
      if (!response.ok) {
        throw new Error('Failed to load conversations')
      }
      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/direct-messages/${conversationId}`)
      if (!response.ok) {
        throw new Error('Failed to load messages')
      }
      const data = await response.json()
      setCurrentMessages(data.messages || [])
    } catch (error) {
      console.error('Error loading messages:', error)
      setCurrentMessages([])
    } finally {
      setLoading(false)
    }
  }

  const sendNewMessage = async (conversationId: string, content: string): Promise<boolean> => {
    if (!user?.id || !content.trim()) return false
    
    setSending(true)
    try {
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          conversationId,
          content: content.trim()
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      const data = await response.json()
      if (data.success) {
        // Reload messages to show the new one
        await loadMessages(conversationId)
        // Refresh conversations to update last message
        await loadConversations()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    } finally {
      setSending(false)
    }
  }

  const startConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user?.id) return null
    
    try {
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          otherUserId
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }
      
      const data = await response.json()
      if (data.conversationId) {
        await loadConversations()
        return data.conversationId
      }
      
      return null
    } catch (error) {
      console.error('Error starting conversation:', error)
      return null
    }
  }

  return {
    conversations,
    currentMessages,
    loading,
    sending,
    loadConversations,
    loadMessages,
    sendNewMessage,
    startConversation
  }
}
