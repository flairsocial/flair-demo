'use client'

import { useShoppingMode } from '@/lib/shopping-mode-context'
import { useCredits } from '@/lib/credit-context'
import { useUser } from '@clerk/nextjs'

interface ShoppingModeToggleProps {
  onModeChange?: (mode: 'default' | 'marketplace') => void
  className?: string
}

export default function ShoppingModeToggle({ onModeChange, className = '' }: ShoppingModeToggleProps) {
  const { mode, setMode } = useShoppingMode()
  const { currentPlan } = useCredits()
  const { isSignedIn } = useUser()

  const handleModeChange = (newMode: 'default' | 'marketplace') => {
    // Check if user is trying to switch to marketplace mode
    if (newMode === 'marketplace') {
      // Block marketplace access for free users or non-signed-in users
      if (!isSignedIn || currentPlan === 'free') {
        // Trigger pricing modal
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('showPricingModal'))
        }
        return // Don't change mode
      }
    }

    setMode(newMode)
    onModeChange?.(newMode)
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <button
        onClick={() => handleModeChange('default')}
        className={`text-xs font-medium transition-colors ${
          mode === 'default' 
            ? 'text-white' 
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        Default
      </button>
      <div className="w-px h-3 bg-zinc-600" />
      <button
        onClick={() => handleModeChange('marketplace')}
        className={`text-xs font-medium transition-colors ${
          mode === 'marketplace' 
            ? 'text-white' 
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        Marketplace
      </button>
    </div>
  )
}
