"use client"

import { useState } from "react"
import { Info, Settings, Crown } from "lucide-react"
import { usePathname } from "next/navigation"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import { useMobile } from "@/hooks/use-mobile"
import InfoPopup from "./InfoPopup"
import PricingModal from "./PricingModal"
import CreditCounter from "./CreditCounter"
import Image from "next/image"
import Link from "next/link"

export default function Header() {
  const [showInfo, setShowInfo] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const pathname = usePathname()
  const isMobile = useMobile()

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

  return (
    <>
      <div className={`sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-zinc-900 h-16 relative ${isMobile ? 'px-3 py-3' : 'px-4 py-4'} flex items-center`}>
        {/* Left side: Logo and Credit Counter */}
        <div className="flex items-center justify-start flex-1 gap-3">
          {isMobile && (
            <Link href="/" className="flex items-center">
              <Image src="/flair-logo.png" alt="Flair Logo" width={32} height={32} className="object-contain" />
            </Link>
          )}
          {/* Credit Counter - Only show for signed in users */}
          <SignedIn>
            <CreditCounter />
          </SignedIn>
        </div>

        {/* Center: Page Title - Absolutely positioned for perfect centering */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <h1 className="text-lg font-medium tracking-tight whitespace-nowrap">{getTitle()}</h1>
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
              <button className={`bg-white text-black text-sm rounded-full hover:bg-zinc-200 transition-colors font-medium ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
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
    </>
  )
}
