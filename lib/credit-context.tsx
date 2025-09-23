"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { SubscriptionService } from "@/lib/subscription-service"
import { useUser } from "@clerk/nextjs"

interface CreditContextType {
  credits: number
  useCredits: (amount: number) => boolean
  addCredits: (amount: number) => void
  setPlan: (plan: 'free' | 'plus' | 'pro') => Promise<void>
  currentPlan: 'free' | 'plus' | 'pro'
  maxCredits: number
  isOutOfCredits: boolean
  checkCreditsAvailable: (amount: number) => boolean
}

const CreditContext = createContext<CreditContextType | undefined>(undefined)

const PLAN_LIMITS = {
  free: 50,
  plus: 500, 
  pro: 5000
}

export function CreditProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState(50) // Start with free tier
  const [currentPlan, setCurrentPlan] = useState<'free' | 'plus' | 'pro'>('free')
  const [maxCredits, setMaxCredits] = useState(PLAN_LIMITS.free)
  const { user } = useUser()

  // Load credits from localStorage on mount
  useEffect(() => {
    const savedCredits = localStorage.getItem('flair-credits')
    const savedPlan = localStorage.getItem('flair-plan') as 'free' | 'plus' | 'pro' | null
    const lastResetDate = localStorage.getItem('flair-last-reset')

    const today = new Date().toDateString()

    // Reset credits daily
    if (lastResetDate !== today) {
      const plan = savedPlan || 'free'
      setCredits(PLAN_LIMITS[plan])
      setCurrentPlan(plan)
      setMaxCredits(PLAN_LIMITS[plan])
      localStorage.setItem('flair-last-reset', today)
    } else {
      if (savedCredits) {
        setCredits(parseInt(savedCredits))
      }

      if (savedPlan && PLAN_LIMITS[savedPlan]) {
        setCurrentPlan(savedPlan)
        setMaxCredits(PLAN_LIMITS[savedPlan])
      }
    }
  }, [])

  // Check for referral credits when user logs in
  useEffect(() => {
    if (user?.id) {
      checkAndAwardReferralCredits(user.id)
      checkAndAwardReferrerCredits(user.id)
      checkAndApplyCreditAwards(user.id)
    }
  }, [user?.id])

  const checkAndAwardReferralCredits = async (userId: string) => {
    try {
      // Check if we've already awarded referral credits to this user
      const referralAwarded = localStorage.getItem(`flair-referral-awarded-${userId}`)
      if (referralAwarded === 'true') {
        console.log(`[Credits] Referral credits already awarded to user ${userId}`)
        return // Already awarded
      }

      // Fetch user profile to check for referrer
      const response = await fetch('/api/profile')
      if (response.ok) {
        const profileData = await response.json()

        if (profileData.referred_by) {
          // User was referred! Award 100 bonus credits
          console.log(`[Credits] Awarding 100 referral credits to new user ${userId} (referred by ${profileData.referred_by})`)
          addCredits(100)
          localStorage.setItem(`flair-referral-awarded-${userId}`, 'true')
          console.log(`[Credits] Successfully awarded 100 credits to referred user ${userId}`)
        } else {
          console.log(`[Credits] User ${userId} has no referrer`)
        }
      } else {
        console.error(`[Credits] Failed to fetch profile for user ${userId}:`, response.status)
      }
    } catch (error) {
      console.error('[Credits] Error checking referral credits:', error)
    }
  }

  const checkAndAwardReferrerCredits = async (userId: string) => {
    try {
      // Check if user has any referrals and award credits accordingly
      const referralsResponse = await fetch('/api/profile/referrals')
      if (referralsResponse.ok) {
        const referralsData = await referralsResponse.json()
        const currentReferralCount = referralsData.referralCount || 0

        // Check how many referrals we've already awarded credits for
        const awardedCount = parseInt(localStorage.getItem(`flair-referrer-awarded-count-${userId}`) || '0')

        if (currentReferralCount > awardedCount) {
          // User has new referrals! Award 100 credits per new referral
          const newReferrals = currentReferralCount - awardedCount
          const creditsToAward = newReferrals * 100
          console.log(`[Credits] Awarding ${creditsToAward} referral credits to referrer ${userId} for ${newReferrals} new referrals (${currentReferralCount} total)`)
          addCredits(creditsToAward)
          localStorage.setItem(`flair-referrer-awarded-count-${userId}`, currentReferralCount.toString())
          console.log(`[Credits] Successfully awarded ${creditsToAward} credits to referrer ${userId}`)
        } else {
          console.log(`[Credits] Referrer ${userId} has ${currentReferralCount} referrals, ${awardedCount} already awarded`)
        }
      } else {
        console.error(`[Credits] Failed to fetch referrals for user ${userId}:`, referralsResponse.status)
      }
    } catch (error) {
      console.error('[Credits] Error checking referrer credits:', error)
    }
  }

  const checkAndApplyCreditAwards = async (userId: string) => {
    try {
      // Check for pending credit awards for this user
      const awardsResponse = await fetch('/api/credits/check-awards')
      if (awardsResponse.ok) {
        const awardsData = await awardsResponse.json()
        if (awardsData.totalCredits > 0) {
          console.log(`[Credits] Applying ${awardsData.totalCredits} pending credit awards to user ${userId}`)
          addCredits(awardsData.totalCredits)

          // Mark awards as applied
          await fetch('/api/credits/mark-awards-applied', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ awardIds: awardsData.awardIds })
          })
        }
      }
    } catch (error) {
      console.error('[Credits] Error checking credit awards:', error)
    }
  }

  // Save credits to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('flair-credits', credits.toString())
  }, [credits])

  // Save plan to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('flair-plan', currentPlan)
  }, [currentPlan])

  const checkCreditsAvailable = (amount: number): boolean => {
    // Check if we would have enough credits for the operation
    let creditsNeeded = 0
    
    if (amount >= 10) {
      creditsNeeded = 10
    } else {
      const currentUsage = parseInt(localStorage.getItem('flair-pending-usage') || '0')
      const newUsage = currentUsage + amount
      
      if (newUsage >= 10) {
        creditsNeeded = 10
      }
    }
    
    return creditsNeeded <= credits
  }

  const useCredits = (amount: number): boolean => {
    // Credit consumption logic - much more generous:
    // - Each credit = 2-3 serper credits
    // - Product searches: 10-15 searches = 10 credits (1 credit per search, accumulates slowly)
    // - AI analysis (collective): 10 credits total
    // - Chat prompts: 10-15 prompts = 10 credits (1 credit per prompt, accumulates slowly)
    
    let creditsToConsume = 0
    
    if (amount >= 10) {
      // AI analysis or major operation
      creditsToConsume = 10
    } else {
      // Small operations accumulate more slowly
      // Only consume credits every few operations
      const currentUsage = parseInt(localStorage.getItem('flair-pending-usage') || '0')
      const newUsage = currentUsage + amount
      
      if (newUsage >= 10) {
        creditsToConsume = 10
        localStorage.setItem('flair-pending-usage', '0')
      } else {
        localStorage.setItem('flair-pending-usage', newUsage.toString())
        creditsToConsume = 0
      }
    }
    
    // Check if we have enough credits
    if (creditsToConsume > credits) {
      return false // Cannot proceed
    }
    
    if (creditsToConsume > 0) {
      setCredits(prev => {
        const newCredits = Math.max(0, prev - creditsToConsume)
        console.log(`[Credits] Used ${creditsToConsume} credits. Remaining: ${newCredits}`)
        return newCredits
      })
    }
    
    return true // Operation can proceed
  }

  const addCredits = (amount: number) => {
    setCredits(prev => Math.min(maxCredits, prev + amount))
  }

  // Function to award referral credits
  const awardReferralCredits = async (referrerClerkId: string, newUserClerkId: string) => {
    try {
      // Award 100 credits to referrer
      const referrerCredits = parseInt(localStorage.getItem(`flair-credits-${referrerClerkId}`) || '0')
      const referrerPlan = localStorage.getItem(`flair-plan-${referrerClerkId}`) || 'free'
      const referrerMax = PLAN_LIMITS[referrerPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free
      const newReferrerCredits = Math.min(referrerMax, referrerCredits + 100)
      localStorage.setItem(`flair-credits-${referrerClerkId}`, newReferrerCredits.toString())

      // Award 100 credits to new user
      const newUserCredits = 100 // New users start with 100 bonus credits
      localStorage.setItem(`flair-credits-${newUserClerkId}`, newUserCredits.toString())
      localStorage.setItem(`flair-plan-${newUserClerkId}`, 'free')
      localStorage.setItem(`flair-last-reset-${newUserClerkId}`, new Date().toDateString())

      console.log(`[Credits] Awarded 100 referral credits to referrer ${referrerClerkId} and new user ${newUserClerkId}`)
    } catch (error) {
      console.error('[Credits] Error awarding referral credits:', error)
    }
  }

  const setPlan = async (plan: 'free' | 'plus' | 'pro') => {
    const newMaxCredits = PLAN_LIMITS[plan]
    setCurrentPlan(plan)
    setMaxCredits(newMaxCredits)
    // Top up to new plan limit
    setCredits(newMaxCredits)

    // Update Supabase is_pro field when upgrading to pro
    if (plan === 'pro' && user?.id) {
      try {
        await SubscriptionService.updateSubscriptionStatus(user.id, true)
        console.log('[Subscription] Updated user to PRO status in database')
      } catch (error) {
        console.error('[Subscription] Failed to update PRO status:', error)
      }
    } else if (plan !== 'pro' && user?.id) {
      // Revoke pro status if downgrading
      try {
        await SubscriptionService.updateSubscriptionStatus(user.id, false)
        console.log('[Subscription] Revoked PRO status in database')
      } catch (error) {
        console.error('[Subscription] Failed to revoke PRO status:', error)
      }
    }
  }

  return (
    <CreditContext.Provider value={{
      credits,
      useCredits,
      addCredits,
      setPlan,
      currentPlan,
      maxCredits,
      isOutOfCredits: credits <= 0,
      checkCreditsAvailable
    }}>
      {children}
    </CreditContext.Provider>
  )
}

export function useCredits() {
  const context = useContext(CreditContext)
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditProvider')
  }
  return context
}
