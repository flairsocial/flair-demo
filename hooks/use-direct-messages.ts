"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { getConversations, getMessages, sendMessage, createConversation } from "@/lib/database-service"

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
      const convs = await getConversations(user.id)
      setConversations(convs)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const messages = await getMessages(conversationId, user.id)
      setCurrentMessages(messages)
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendNewMessage = async (conversationId: string, content: string): Promise<boolean> => {
    if (!user?.id || !content.trim()) return false
    
    setSending(true)
    try {
      const success = await sendMessage(conversationId, user.id, content)
      if (success) {
        // Reload messages to show the new one
        await loadMessages(conversationId)
        // Refresh conversations to update last message
        await loadConversations()
      }
      return success
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
      const conversationId = await createConversation(user.id, otherUserId)
      if (conversationId) {
        await loadConversations()
      }
      return conversationId
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
