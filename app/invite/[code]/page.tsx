"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!isLoaded) return

    const processInvite = async () => {
      const inviteCode = params.code as string

      if (!inviteCode) {
        setStatus('error')
        setMessage("Invalid invite link")
        return
      }

      try {
        // Check if user is signed in
        if (!user) {
          // Store invite code in Clerk user metadata for webhook processing
          // For now, we'll use localStorage as fallback and redirect to sign-up
          localStorage.setItem('pendingInviteCode', inviteCode)
          // Redirect to sign up with invite code
          router.push(`/sign-up?invite=${inviteCode}`)
          return
        }

        // User is signed in, process the invite
        const response = await fetch('/api/invite/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode })
        })

        if (response.ok) {
          const data = await response.json()
          setStatus('success')
          setMessage(data.message || "Welcome! You've been credited with bonus rewards.")
        } else {
          const error = await response.json()
          setStatus('error')
          setMessage(error.error || "Failed to process invite")
        }
      } catch (error) {
        console.error('Error processing invite:', error)
        setStatus('error')
        setMessage("Something went wrong. Please try again.")
      }
    }

    processInvite()
  }, [params.code, user, isLoaded, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
          <h1 className="text-2xl font-bold mb-2">Processing Invite</h1>
          <p className="text-zinc-400">Please wait while we set up your account...</p>
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
            <p className="text-zinc-400 mb-8">{message}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              Get Started
            </button>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Invite Error</h1>
            <p className="text-zinc-400 mb-8">{message}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
            >
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  )
}
