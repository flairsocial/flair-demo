'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type ShoppingMode = 'default' | 'marketplace'

export interface ShoppingModeContextType {
  mode: ShoppingMode
  setMode: (mode: ShoppingMode) => void
  isMarketplace: boolean
  isDefault: boolean
}

const ShoppingModeContext = createContext<ShoppingModeContextType | undefined>(undefined)

export function ShoppingModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ShoppingMode>('default')

  // Load from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('shopping-mode') as ShoppingMode
    if (savedMode && (savedMode === 'default' || savedMode === 'marketplace')) {
      setModeState(savedMode)
    }
  }, [])

  // Save to localStorage when mode changes
  const setMode = (newMode: ShoppingMode) => {
    setModeState(newMode)
    localStorage.setItem('shopping-mode', newMode)
  }

  const value: ShoppingModeContextType = {
    mode,
    setMode,
    isMarketplace: mode === 'marketplace',
    isDefault: mode === 'default'
  }

  return (
    <ShoppingModeContext.Provider value={value}>
      {children}
    </ShoppingModeContext.Provider>
  )
}

export function useShoppingMode() {
  const context = useContext(ShoppingModeContext)
  if (context === undefined) {
    throw new Error('useShoppingMode must be used within a ShoppingModeProvider')
  }
  return context
}

// Utility hook for components that need to refresh when mode changes
export function useShoppingModeRefresh() {
  const { mode } = useShoppingMode()
  return mode // This will trigger re-renders when mode changes
}