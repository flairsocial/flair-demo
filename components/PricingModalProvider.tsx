"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'
import PricingModal from './PricingModal'

interface PricingModalContextType {
  showPricingModal: () => void
  hidePricingModal: () => void
}

const PricingModalContext = createContext<PricingModalContextType | undefined>(undefined)

export function usePricingModal() {
  const context = useContext(PricingModalContext)
  if (context === undefined) {
    throw new Error('usePricingModal must be used within a PricingModalProvider')
  }
  return context
}

interface PricingModalProviderProps {
  children: ReactNode
}

export default function PricingModalProvider({ children }: PricingModalProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const showPricingModal = () => setIsOpen(true)
  const hidePricingModal = () => setIsOpen(false)

  // Listen for custom event to show pricing modal
  React.useEffect(() => {
    const handleShowPricingModal = () => {
      setIsOpen(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('showPricingModal', handleShowPricingModal)
      return () => window.removeEventListener('showPricingModal', handleShowPricingModal)
    }
  }, [])

  return (
    <PricingModalContext.Provider value={{ showPricingModal, hidePricingModal }}>
      {children}
      <PricingModal isOpen={isOpen} onClose={hidePricingModal} />
    </PricingModalContext.Provider>
  )
}
