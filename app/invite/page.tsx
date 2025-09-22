"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Copy, Check, Gift, Users, Zap } from "lucide-react"
import { useCredits } from "@/lib/credit-context"

export default function InvitePage() {
  const { user } = useUser()
  const { addCredits } = useCredits()
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [inviteStats, setInviteStats] = useState({
    totalInvites: 0,
    successfulSignups: 0,
    creditsEarned: 0
  })

  useEffect(() => {
    if (user?.id) {
      // Generate invite link using user's ID
      const link = `https://app.flair.social/invite/${user.id}`
      setInviteLink(link)

      // Load invite stats (placeholder for now)
      loadInviteStats()
    }
  }, [user])

  const loadInviteStats = async () => {
    try {
      const response = await fetch('/api/invite/stats')
      if (response.ok) {
        const stats = await response.json()
        setInviteStats(stats)
      }
    } catch (error) {
      console.error('Error loading invite stats:', error)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const generateNewLink = async () => {
    try {
      const response = await fetch('/api/invite/generate', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setInviteLink(data.inviteLink)
      }
    } catch (error) {
      console.error('Error generating new link:', error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Invite Friends & Earn Credits</h1>
          <p className="text-zinc-400 text-lg">
            Share Flair with friends and earn 100 credits for each successful signup!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center space-x-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-zinc-400">Total Invites</span>
            </div>
            <div className="text-2xl font-bold">{inviteStats.totalInvites}</div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center space-x-3 mb-2">
              <Check className="w-5 h-5 text-green-400" />
              <span className="text-sm text-zinc-400">Successful Signups</span>
            </div>
            <div className="text-2xl font-bold">{inviteStats.successfulSignups}</div>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center space-x-3 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-zinc-400">Credits Earned</span>
            </div>
            <div className="text-2xl font-bold">{inviteStats.creditsEarned}</div>
          </div>
        </div>

        {/* Invite Link Section */}
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-8 border border-zinc-800 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Invite Link</h2>

          <div className="flex items-center space-x-3 mb-4">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="flex items-center space-x-2 bg-white text-black px-6 py-3 rounded-lg hover:bg-zinc-200 transition-colors font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              Share this link with friends. When they sign up, you'll both get 100 credits!
            </p>
            <button
              onClick={generateNewLink}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Generate New Link
            </button>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl p-8 border border-zinc-800">
          <h2 className="text-xl font-semibold mb-6">How It Works</h2>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Share Your Link</h3>
                <p className="text-zinc-400 text-sm">
                  Copy your unique invite link and share it with friends via email, social media, or messaging apps.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Friend Signs Up</h3>
                <p className="text-zinc-400 text-sm">
                  When your friend clicks the link and creates an account, the system tracks the referral automatically.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Earn Credits</h3>
                <p className="text-zinc-400 text-sm">
                  Both you and your friend receive 100 credits immediately. Use them for AI analysis, searches, and more!
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start space-x-3">
              <Zap className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-400 mb-1">Pro Tip</h4>
                <p className="text-sm text-zinc-300">
                  Credits refresh daily! Free users get 50 credits every 24 hours, while Plus and Pro users get higher limits.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
