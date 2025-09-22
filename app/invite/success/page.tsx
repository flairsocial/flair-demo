"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { CheckCircle, Users, Gift } from "lucide-react"

export default function InviteSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoaded } = useUser()
  const referrerCode = searchParams.get('ref')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState("")
  const [creditsAwarded, setCreditsAwarded] = useState(false)

  useEffect(() => {
    if (!isLoaded) return

    const handleInviteSuccess = async () => {
      if (!user) {
        setStatus('error')
        setMessage("You must be signed in to view this page")
        return
      }

      // Since there's a race condition with the webhook, we'll assume success
      // and let the credit context handle awarding credits when the user logs in
      setStatus('success')
      setMessage("🎉 Welcome to FlairSocial! You've received 100 bonus credits for joining through an invite!")
      setCreditsAwarded(true)

      // Optional: Poll for confirmation that webhook processed
      let attempts = 0
      const maxAttempts = 10
      const pollInterval = setInterval(async () => {
        try {
          attempts++
          const profileResponse = await fetch('/api/profile')
          if (profileResponse.ok) {
            const profileData = await profileResponse.json()
            if (profileData.referred_by) {
              console.log('[Invite Success] Webhook processed successfully')
              clearInterval(pollInterval)
            }
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollInterval)
            console.log('[Invite Success] Webhook may still be processing')
          }
        } catch (error) {
          console.error('[Invite Success] Error polling webhook status:', error)
        }
      }, 1000) // Check every second for 10 seconds

      // Clean up interval after 12 seconds
      setTimeout(() => clearInterval(pollInterval), 12000)
    }

    handleInviteSuccess()
  }, [user, isLoaded])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-zinc-800 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-2">Setting up your account...</h1>
          <p className="text-zinc-400">Please wait while we process your referral</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === 'success' ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Welcome to Flair!</h1>
            <p className="text-zinc-400 mb-6">{message}</p>

            {creditsAwarded && (
              <div className="bg-green-900/20 border border-green-900/30 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Gift className="w-5 h-5 text-green-400 mr-2" />
                  <span className="text-green-400 font-medium">Credits Awarded!</span>
                </div>
                <p className="text-sm text-zinc-300">
                  You and your referrer both received 100 bonus credits
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
              >
                Start Exploring
              </button>

              <button
                onClick={() => router.push('/invite')}
                className="w-full bg-zinc-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center"
              >
                <Users className="w-4 h-4 mr-2" />
                Invite Friends
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-900/20 border border-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-red-400 text-2xl">⚠️</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
            <p className="text-zinc-400 mb-8">{message}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              Go to Home
            </button>
          </>
        )}
      </div>
    </div>
  )
}
