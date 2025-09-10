'use client'

import { useState, useEffect } from 'react'
import OutOfCreditsModal from './OutOfCreditsModal'

interface CreditGuardProps {
  children: React.ReactNode
}

// Global state for modal management
let globalModalControls: {
  showModal: () => void
} | null = null

// Function to trigger the modal from anywhere in the app
export const showOutOfCreditsModal = () => {
  if (globalModalControls) {
    globalModalControls.showModal()
  }
}

export default function CreditGuard({ children }: CreditGuardProps) {
  const [showModal, setShowModal] = useState(false)

  // Register global modal controls
  useEffect(() => {
    globalModalControls = {
      showModal: () => setShowModal(true)
    }
    
    return () => {
      globalModalControls = null
    }
  }, [])

  return (
    <>
      {children}
      {showModal && (
        <OutOfCreditsModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          onUpgrade={() => {
            setShowModal(false)
            // The OutOfCreditsModal handles upgrade internally
          }}
        />
      )}
    </>
  )
}
