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
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)]" />

      {/* Header */}
      <div className="relative z-10 sticky top-0 bg-black/20 backdrop-blur-xl px-6 py-4 flex items-center border-b border-white/10">
        <Link href="/" className="mr-4 p-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
        </Link>
        <h1 className="text-xl font-light tracking-wide">Join Flair</h1>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-200px)] px-6 py-12">
        <div className="w-full max-w-md">
          {/* Invite Banner */}
          {inviteCode && inviteValid === true && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="text-emerald-400 text-2xl mb-3">🎉</div>
                <div className="text-emerald-300 text-sm font-medium mb-2">You've been invited!</div>
                <div className="text-white/80 text-sm leading-relaxed">
                  {inviterName} invited you to join FlairSocial. Both of you will get 100 bonus credits!
                </div>
              </div>
            </motion.div>
          )}

          {inviteCode && inviteValid === false && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="text-red-400 text-2xl mb-3">⚠️</div>
                <div className="text-red-300 text-sm font-medium mb-2">Invalid invite link</div>
                <div className="text-white/60 text-sm">
                  This invite link is not valid. You can still sign up normally.
                </div>
              </div>
            </motion.div>
          )}

          {/* Clerk Sign Up Component */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl"
          >
            <SignUp
              path="/sign-up"
              routing="path"
              signInUrl="/sign-in"
              redirectUrl={inviteCode ? `/invite/success?ref=${inviteCode}` : "/"}
              unsafeMetadata={inviteCode ? { pendingInviteCode: inviteCode } : undefined}
              appearance={{
                baseTheme: undefined,
                variables: {
                  colorPrimary: "#ffffff",
                  colorBackground: "transparent",
                  colorInputBackground: "rgba(255,255,255,0.05)",
                  colorInputText: "#ffffff",
                  colorText: "#ffffff",
                  borderRadius: "0.75rem",
                  fontFamily: "system-ui, -apple-system, sans-serif"
                },
                elements: {
                  formButtonPrimary: "bg-white text-black hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-200 font-medium",
                  card: "bg-transparent shadow-none",
                  headerTitle: "text-white text-2xl font-light tracking-wide",
                  headerSubtitle: "text-white/60 text-sm",
                  formFieldLabel: "text-white/80 text-sm font-medium",
                  formFieldInput: "bg-white/5 border-white/20 text-white placeholder-white/40 focus:bg-white/10 focus:border-white/30 transition-all duration-200",
                  formFieldInputShowPasswordButton: "text-white/60 hover:text-white",
                  footerActionLink: "text-white/80 hover:text-white font-medium transition-colors",
                  dividerLine: "bg-white/20",
                  dividerText: "text-white/60 text-sm",
                  socialButtonsBlockButton: "bg-white/10 hover:bg-white/20 border-white/20 text-white transition-all duration-200",
                  socialButtonsBlockButtonText: "text-white font-medium",
                  formFieldErrorText: "text-red-300 text-sm",
                  alert: "bg-red-500/10 border-red-500/20 text-red-300",
                },
              }}
            />
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-8 text-center"
          >
            <p className="text-white/40 text-xs">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
