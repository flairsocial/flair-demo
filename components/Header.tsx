"use client"

import { useState, useEffect } from "react"
import { Info, Settings, Crown, ChevronDown } from "lucide-react"
import { usePathname } from "next/navigation"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { useMobile } from "@/hooks/use-mobile"
import { useShoppingMode } from "@/lib/shopping-mode-context"
import { useCredits } from "@/lib/credit-context"
import { AnimatePresence, motion } from "framer-motion"
import InfoPopup from "./InfoPopup"
import PricingModal from "./PricingModal"
import CreditCounter from "./CreditCounter"
import Image from "next/image"
import Link from "next/link"
import { useRef } from "react"

export default function Header() {
  const [showInfo, setShowInfo] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const [showShoppingModeDropdown, setShowShoppingModeDropdown] = useState(false)
  const signInButtonRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const isMobile = useMobile()
  const { mode, setMode } = useShoppingMode()
  const { isSignedIn, isLoaded } = useUser()
  const { currentPlan } = useCredits()

  // Show Clerk SignIn modal for first-time visitors who are NOT signed in
  useEffect(() => {
    if (isLoaded && pathname === "/" && !isSignedIn) {
      const hasSeenInfo = localStorage.getItem('hasSeenInfoPopup')
      if (!hasSeenInfo) {
        // Small delay to ensure page is loaded
        const timer = setTimeout(() => {
          signInButtonRef.current?.click()
          localStorage.setItem('hasSeenInfoPopup', 'true')
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [pathname, isSignedIn, isLoaded])

  if (pathname === "/chat") {
    return null
  }

  const getTitle = () => {
    switch (pathname) {
      case "/":
        return "Discover"
      case "/saved":
        return "Saved"
      case "/profile":
        return "Profile"
      case "/settings":
        return "Settings"
      default:
        if (pathname.startsWith("/products/")) {
          return "Product Details"
        }
        return "Flair"
    }
  }

  const isDiscoverPage = pathname === "/"

  const renderDiscoverTitle = () => {
    if (!isDiscoverPage) {
      return <h1 className="text-lg font-medium tracking-tight whitespace-nowrap">{getTitle()}</h1>
    }

    return (
      <button
        onClick={() => setShowShoppingModeDropdown(!showShoppingModeDropdown)}
        className="flex items-center gap-1.5 text-lg font-medium tracking-tight hover:text-zinc-300 transition-colors"
      >
        
        Discover
        <ChevronDown className="w-3 h-3" />
      </button>
    )
  }

  return (
    <>
      <div className={`sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-zinc-900 h-16 relative ${isMobile ? 'px-3 py-3' : 'px-4 py-4'} flex items-center`}>
        {/* Left side: Logo and Credit Counter */}
        <div className="flex items-center justify-start flex-1 gap-3">
          {isMobile && (
            <button 
              onClick={() => setShowInfo(true)}
              className="flex items-center hover:opacity-80 transition-opacity"
              aria-label="About Flair"
            >
              <Image src="/flair-logo.png" alt="Flair Logo" width={32} height={32} className="object-contain" />
            </button>
          )}
          {/* Credit Counter - Only show for signed in users */}
          <SignedIn>
            <CreditCounter />
          </SignedIn>
        </div>

        {/* Center: Page Title - Absolutely positioned for perfect centering */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          {renderDiscoverTitle()}
        </div>

        {/* Right side: Upgrade Plan, Settings, Auth */}
        <div className={`flex items-center justify-end flex-1 ${isMobile ? 'gap-0.5' : 'gap-2'}`}>
          {/* Upgrade Plan Button - Only show for signed in users */}
          <SignedIn>
            <button
              onClick={() => setShowPricing(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              aria-label="Upgrade your plan"
            >
              <Crown className="w-4 h-4" />
              Upgrade your plan
            </button>

            {/* Mobile Upgrade Plan Button - Crown icon only */}
            <button
              onClick={() => setShowPricing(true)}
              className={`sm:hidden rounded-full hover:bg-zinc-800 transition-colors flex items-center justify-center ${isMobile ? 'p-2 w-10 h-10' : 'p-1.5'}`}
              aria-label="Upgrade your plan"
            >
              <Crown className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
            </button>
          </SignedIn>
          
          {/* Settings button available on all pages except settings itself */}
          {pathname !== "/settings" && (
            <SignedIn>
              <Link
                href="/settings"
                className={`rounded-full hover:bg-zinc-800 transition-colors flex items-center justify-center ${isMobile ? 'p-2 w-10 h-10' : 'p-1.5'}`}
                aria-label="User Settings"
              >
                <Settings className="w-5 h-5 text-white" strokeWidth={1.5} />
              </Link>
            </SignedIn>
          )}
          
          {/* Clerk Authentication */}
          <SignedOut>
            <SignInButton mode="modal">
              <button 
                ref={signInButtonRef}
                className={`bg-white text-black text-sm rounded-full hover:bg-zinc-200 transition-colors font-medium ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'}`}
              >
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <div className={isMobile ? 'ml-1' : ''}>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverCard: "bg-zinc-900 border border-zinc-800",
                    userButtonPopoverActionButton: "text-white hover:bg-zinc-800",
                  },
                }}
              />
            </div>
          </SignedIn>
        </div>
      </div>
      {showInfo && <InfoPopup onClose={() => setShowInfo(false)} />}
      {showPricing && <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />}
      
      {/* Shopping Mode Dropdown - Portal Style */}
      <AnimatePresence>
        {showShoppingModeDropdown && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setShowShoppingModeDropdown(false)}
            />
            
            {/* Dropdown menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="relative bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg py-1 min-w-[160px] mt-2"
            >
              <button
                onClick={() => {
                  setMode('default')
                  setShowShoppingModeDropdown(false)
                }}
                className={`w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors ${
                  mode === 'default' ? 'text-white bg-zinc-800' : 'text-zinc-400'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Default</span>
                  <span className="text-xs text-zinc-500">Google Shopping</span>
                </div>
              </button>
              <button
                onClick={() => {
                  // Check if user is trying to switch to marketplace mode
                  if (!isSignedIn || currentPlan === 'free') {
                    // Trigger pricing modal
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('showPricingModal'))
                    }
                    setShowShoppingModeDropdown(false)
                    return // Don't change mode
                  }
                  setMode('marketplace')
                  setShowShoppingModeDropdown(false)
                }}
                className={`w-full px-3 py-2 text-left hover:bg-zinc-800 transition-colors ${
                  mode === 'marketplace' ? 'text-white bg-zinc-800' : 'text-zinc-400'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Marketplace</span>
                  <span className="text-xs text-zinc-500">Multi-platform</span>
                </div>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
