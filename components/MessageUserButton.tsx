"use client"

import { useState } from "react"
import { MessageCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { useDirectMessages } from "@/hooks/use-direct-messages"

interface MessageUserButtonProps {
  userId: string
  username: string
  displayName: string
  variant?: "button" | "icon" | "small"
  className?: string
}

export default function MessageUserButton({ 
  userId, 
  username, 
  displayName,
  variant = "button",
  className = ""
}: MessageUserButtonProps) {
  const { user } = useUser()
  const router = useRouter()
  const { startConversation } = useDirectMessages()
  const [isStarting, setIsStarting] = useState(false)

  // Don't show message button for user's own profile
  if (!user || user.id === userId) {
    return null
  }

  const handleStartConversation = async () => {
    setIsStarting(true)
    try {
      const conversationId = await startConversation(userId)
      if (conversationId) {
        // Navigate to inbox with the conversation
        router.push(`/inbox?conversation=${conversationId}`)
      } else {
        console.error('Failed to start conversation')
        // You could show a toast/notification here
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    } finally {
      setIsStarting(false)
    }
  }

  // Icon variant - small circle button
  if (variant === "icon") {
    return (
      <button
        onClick={handleStartConversation}
        disabled={isStarting}
        className={`p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        title={`Message ${displayName}`}
      >
        {isStarting ? (
          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
        ) : (
          <MessageCircle className="w-4 h-4 text-zinc-300" />
        )}
      </button>
    )
  }

  // Small variant - compact button with icon
  if (variant === "small") {
    return (
      <button
        onClick={handleStartConversation}
        disabled={isStarting}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isStarting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <MessageCircle className="w-3 h-3" />
        )}
        <span>Message</span>
      </button>
    )
  }

  // Button variant - full button
  return (
    <button
      onClick={handleStartConversation}
      disabled={isStarting}
      className={`flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium ${className}`}
    >
      {isStarting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MessageCircle className="w-4 h-4" />
      )}
      <span>{isStarting ? 'Starting...' : `Message ${username}`}</span>
    </button>
  )
}