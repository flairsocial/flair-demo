"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface CreditContextType {
  credits: number
  useCredits: (amount: number) => boolean
  addCredits: (amount: number) => void
  setPlan: (plan: 'free' | 'plus' | 'pro') => void
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

  const setPlan = (plan: 'free' | 'plus' | 'pro') => {
    const newMaxCredits = PLAN_LIMITS[plan]
    setCurrentPlan(plan)
    setMaxCredits(newMaxCredits)
    // Top up to new plan limit
    setCredits(newMaxCredits)
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
