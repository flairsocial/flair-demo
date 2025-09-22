"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SignUp, useUser, useClerk } from "@clerk/nextjs"
import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useUser()
  const { client } = useClerk()
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('invite')
  const [inviteValid, setInviteValid] = useState<boolean | null>(null)
  const [inviterName, setInviterName] = useState<string>("")

  // Validate invite code on page load
  useEffect(() => {
    if (inviteCode) {
      // Validate the invite code
      fetch(`/api/invite/validate/${inviteCode}`)
        .then(response => response.json())
        .then(data => {
          if (data.valid) {
            setInviteValid(true)
            setInviterName(data.inviterName || "a friend")
          } else {
            setInviteValid(false)
          }
        })
        .catch(error => {
          console.error('Error validating invite:', error)
          setInviteValid(false)
        })
    }
  }, [inviteCode])

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 py-4 flex items-center border-b border-zinc-900">
        <Link href="/" className="mr-3 p-1.5 rounded-full hover:bg-zinc-800">
          <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
        </Link>
        <h1 className="text-lg font-medium">Join FlairSocial</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Invite Banner */}
        {inviteCode && inviteValid === true && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-900/20 border border-green-900/30 rounded-lg p-4 text-center"
          >
            <div className="text-green-400 text-sm mb-2">🎉 You've been invited!</div>
            <div className="text-white text-sm">
              {inviterName} invited you to join FlairSocial. Both of you will get 100 bonus credits!
            </div>
          </motion.div>
        )}

        {inviteCode && inviteValid === false && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/20 border border-red-900/30 rounded-lg p-4 text-center"
          >
            <div className="text-red-400 text-sm">Invalid invite link</div>
            <div className="text-zinc-400 text-sm">
              This invite link is not valid. You can still sign up normally.
            </div>
          </motion.div>
        )}

        {/* Clerk Sign Up Component */}
        <div className="bg-zinc-900/50 rounded-lg p-6">
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            redirectUrl={inviteCode ? `/invite/${inviteCode}` : "/"}
            unsafeMetadata={inviteCode ? { inviteCode } : undefined}
            appearance={{
              baseTheme: undefined,
              variables: {
                colorPrimary: "#ffffff",
                colorBackground: "transparent",
                colorInputBackground: "#27272a",
                colorInputText: "#ffffff",
                colorText: "#ffffff",
                borderRadius: "0.5rem"
              },
              elements: {
                formButtonPrimary: "bg-white text-black hover:bg-zinc-200",
                card: "bg-transparent shadow-none",
                headerTitle: "text-white",
                headerSubtitle: "text-zinc-400",
                formFieldLabel: "text-zinc-300",
                formFieldInput: "bg-zinc-800 border-zinc-700 text-white",
                footerActionLink: "text-blue-400 hover:text-blue-300",
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
