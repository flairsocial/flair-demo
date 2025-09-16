'use client'

import { useState, useEffect } from 'react'
import OutOfCreditsModal from './OutOfCreditsModal'
import PricingModal from './PricingModal'

interface CreditGuardProps {
  children: React.ReactNode
}

// Global state for modal management
let globalModalControls: {
  showModal: () => void
  showPricingModal: () => void
} | null = null

// Function to trigger the modal from anywhere in the app
export const showOutOfCreditsModal = () => {
  if (globalModalControls) {
    globalModalControls.showModal()
  }
}

// Function to trigger the pricing modal directly from anywhere in the app
export const showPricingModal = () => {
  if (globalModalControls) {
    globalModalControls.showPricingModal()
  }
}

export default function CreditGuard({ children }: CreditGuardProps) {
  const [showModal, setShowModal] = useState(false)
  const [showPricing, setShowPricing] = useState(false)

  // Register global modal controls
  useEffect(() => {
    globalModalControls = {
      showModal: () => setShowModal(true),
      showPricingModal: () => setShowPricing(true)
    }
    
    return () => {
      globalModalControls = null
    }
  }, [])

  const handleUpgrade = () => {
    setShowModal(false)
    setShowPricing(true)
  }

  return (
    <>
      {children}
      {showModal && (
        <OutOfCreditsModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          onUpgrade={handleUpgrade}
        />
      )}
      {showPricing && (
        <PricingModal
          isOpen={showPricing}
          onClose={() => setShowPricing(false)}
        />
      )}
    </>
  )
}
