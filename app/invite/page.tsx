"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Gift, UserPlus, Sparkles } from 'lucide-react'
import { useCredits } from '@/lib/credit-context'
import { useAuth } from '@clerk/nextjs'

export default function InvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addCredits } = useCredits()
  const { userId } = useAuth()
  const [processing, setProcessing] = useState(false)
  const [processed, setProcessed] = useState(false)
  const [message, setMessage] = useState('')
  
  const inviteCode = searchParams.get('code')
  
  useEffect(() => {
    if (inviteCode && userId && !processed) {
      processInvite()
    }
  }, [inviteCode, userId, processed])
  
  const processInvite = async () => {
    setProcessing(true)
    
    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inviteCode,
          newUserId: userId
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setMessage(`Welcome! Your friend has been awarded ${result.creditsAwarded} credits for inviting you.`)
        // In a real app, you might also give the new user some bonus credits
        // addCredits(50) // Example: new user bonus
      } else {
        setMessage(result.message || 'Invite code could not be processed.')
      }
    } catch (error) {
      console.error('Error processing invite:', error)
      setMessage('There was an error processing your invite. Please try again.')
    } finally {
      setProcessing(false)
      setProcessed(true)
      
      // Redirect to chat after 3 seconds
      setTimeout(() => {
        router.push('/chat')
      }, 3000)
    }
  }
  
  if (!inviteCode) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <Gift className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Invite Link</h1>
          <p className="text-zinc-400 mb-6">The invite link appears to be invalid or incomplete.</p>
          <button 
            onClick={() => router.push('/chat')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Go to Chat
          </button>
        </div>
      </div>
    )
  }
  
  if (!userId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <UserPlus className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Welcome to Flair!</h1>
          <p className="text-zinc-400 mb-6">You've been invited by a friend. Please sign in to activate your invite.</p>
          <button 
            onClick={() => router.push('/chat')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="text-center">
        <Sparkles className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Processing Your Invite</h1>
        {processing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            <p className="text-zinc-400">Processing invite...</p>
          </div>
        ) : (
          <div>
            <p className="text-zinc-300 mb-4">{message}</p>
            <p className="text-sm text-zinc-500">Redirecting to chat in a few seconds...</p>
          </div>
        )}
      </div>
    </div>
  )
}
