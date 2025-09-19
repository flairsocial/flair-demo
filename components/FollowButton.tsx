"use client"

import { useState, useEffect } from "react"
import { UserPlus, UserCheck } from "lucide-react"
import { useUser } from "@clerk/nextjs"

interface FollowButtonProps {
  targetUserId: string
  targetUsername?: string
  className?: string
  showText?: boolean
}

export default function FollowButton({ 
  targetUserId, 
  targetUsername, 
  className = "",
  showText = true
}: FollowButtonProps) {
  const { user } = useUser()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)

  // Don't show follow button for current user
  if (user?.id === targetUserId) {
    return null
  }

  // Check follow status on mount
  useEffect(() => {
    if (user?.id && targetUserId) {
      checkFollowStatus()
    }
  }, [user?.id, targetUserId])

  const checkFollowStatus = async () => {
    try {
      setIsCheckingStatus(true)
      const response = await fetch(`/api/users/follow?targetUserId=${targetUserId}`)
      
      if (response.ok) {
        const data = await response.json()
        setIsFollowing(data.isFollowing)
      }
    } catch (error) {
      console.error('Error checking follow status:', error)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!user?.id || isLoading) return

    try {
      setIsLoading(true)
      const action = isFollowing ? 'unfollow' : 'follow'
      
      const response = await fetch('/api/users/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          action
        })
      })

      if (response.ok) {
        const data = await response.json()
        setIsFollowing(data.isFollowing)
        
        // Show success message
        console.log(`Successfully ${action}ed ${targetUsername || 'user'}`)
      } else {
        const errorData = await response.json()
        console.error(`Failed to ${action}:`, errorData)
        alert(`Failed to ${action} user: ${errorData.details || errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error(`Error ${isFollowing ? 'unfollowing' : 'following'} user:`, error)
      alert(`Error ${isFollowing ? 'unfollowing' : 'following'} user. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingStatus) {
    return (
      <button 
        disabled 
        className={`px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 cursor-not-allowed ${className}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
          {showText && <span className="text-sm">Loading...</span>}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2
        ${isFollowing 
          ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-600' 
          : 'bg-transparent hover:bg-zinc-800 text-white border border-zinc-700'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        ${className}
      `}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : isFollowing ? (
        <UserCheck className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      
      {showText && (
        <span className="text-sm">
          {isLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
        </span>
      )}
    </button>
  )
}