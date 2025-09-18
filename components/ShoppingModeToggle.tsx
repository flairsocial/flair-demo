'use client'

import { useShoppingMode } from '@/lib/shopping-mode-context'

interface ShoppingModeToggleProps {
  onModeChange?: (mode: 'default' | 'marketplace') => void
  className?: string
}

export default function ShoppingModeToggle({ onModeChange, className = '' }: ShoppingModeToggleProps) {
  const { mode, setMode } = useShoppingMode()

  const handleModeChange = (newMode: 'default' | 'marketplace') => {
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