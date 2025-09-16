"use client"

import type React from "react"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { useUser, SignInButton } from "@clerk/nextjs"
import { useCredits } from "@/lib/credit-context"
import PricingModal from "./PricingModal"

interface SearchBarProps {
  onSearch: (query: string) => void
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const { isSignedIn, isLoaded } = useUser()
  const { credits, isOutOfCredits, checkCreditsAvailable } = useCredits()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check authentication before allowing search
    if (!isSignedIn && isLoaded) {
      setShowSignInPrompt(true)
      return
    }

    // Check credits before allowing search
    if (isOutOfCredits || !checkCreditsAvailable(1)) {
      setShowPricingModal(true)
      return
    }
    
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleInputFocus = () => {
    setIsFocused(true)
    // Check authentication when user tries to interact with search
    if (!isSignedIn && isLoaded) {
      setShowSignInPrompt(true)
      return
    }

    // Check credits when user tries to interact with search
    if (isOutOfCredits || !checkCreditsAvailable(1)) {
      setShowPricingModal(true)
      return
    }
  }

  const clearSearch = () => {
    setQuery("")
    onSearch("")
  }

  const getPlaceholder = () => {
    if (!isSignedIn) return "Sign in to search..."
    if (isOutOfCredits) return "No credits - upgrade to search..."
    return "Search for items..."
  }

  const isDisabled = (!isSignedIn && isLoaded) || isOutOfCredits

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={`relative flex items-center rounded-full overflow-hidden transition-all duration-300 ${
          isFocused && !isDisabled ? "bg-zinc-800 ring-1 ring-white/20" : "bg-zinc-900"
        }`}
      >
        <Search className="w-4 h-4 text-zinc-400 ml-3" strokeWidth={2} />
        <input
          type="text"
          placeholder={getPlaceholder()}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={() => setIsFocused(false)}
          disabled={isDisabled}
          className={`w-full py-2.5 px-2 bg-transparent text-white placeholder-zinc-400 focus:outline-none text-sm ${
            isDisabled ? 'cursor-pointer' : ''
          }`}
        />
        {query && isSignedIn && !isOutOfCredits && (
          <button type="button" onClick={clearSearch} className="p-2 text-zinc-400" aria-label="Clear search">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
      </form>

      {/* Sign-in prompt modal */}
      {showSignInPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-sm w-full border border-zinc-800">
            <h3 className="text-lg font-semibold mb-2">Sign in to search</h3>
            <p className="text-zinc-400 mb-4">
              Please sign in to search for items and use Flair's features.
            </p>
            <div className="flex gap-3">
              <SignInButton mode="modal">
                <button className="flex-1 bg-white text-black py-2 px-4 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <button
                onClick={() => setShowSignInPrompt(false)}
                className="flex-1 bg-zinc-800 text-white py-2 px-4 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing modal for credit exhaustion */}
      {showPricingModal && (
        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
        />
      )}
    </>
  )
}
