"use client"

import { useState } from "react"
import { Gift, X, Copy, Check } from "lucide-react"
import { useCredits } from "@/lib/credit-context"
import { motion, AnimatePresence } from "framer-motion"

export default function CreditCounter() {
  const [showModal, setShowModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const { credits, currentPlan, maxCredits } = useCredits()

  const planNames = {
    free: "Free",
    plus: "Plus", 
    pro: "Pro"
  }

  const generateInviteLink = () => {
    // Generate a unique invite link (in real app, this would be generated server-side)
    const inviteCode = Math.random().toString(36).substring(2, 15)
    return `https://flair.social/invite/${inviteCode}`
  }

  const handleCopyLink = async () => {
    const inviteLink = generateInviteLink()
    try {
      await navigator.clipboard.writeText(inviteLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors relative"
      >
        <Gift className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
      </button>

      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setShowModal(false)}
            />
            
            {/* Popup positioned relative to button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="fixed top-16 left-4 z-50 bg-zinc-900/95 backdrop-blur-md rounded-xl p-4 w-80 border border-zinc-700/50 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-lg font-medium text-white">Credits</h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>

              {/* Current Credits Display */}
              <div className="mb-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/30">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500 mb-1">
                    {credits.toLocaleString()}
                  </div>
                  <div className="text-sm text-zinc-400">
                    Daily Credits Remaining
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {planNames[currentPlan]} Plan • Resets daily to {maxCredits.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Invite Section */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Earn 100 Credits per Referral
                </h3>
                
                <p className="text-xs text-zinc-400 mb-3">
                  Share your invite link and earn 100 credits for every friend who signs up
                </p>
                
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg transition-all duration-200 text-white text-sm font-medium"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Generate Invite Link
                    </>
                  )}
                </button>
              </div>

              {/* Usage Info */}
              <div className="text-xs text-zinc-500 text-center pt-3 border-t border-zinc-700/30">
                Credits are used for product searches and AI analysis
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
