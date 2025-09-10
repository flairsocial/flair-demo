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
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 py-4 flex items-center border-b border-zinc-900 h-16 relative">
        {/* Left side: Logo and Credit Counter */}
        <div className="flex items-center justify-start flex-1 gap-3">
          {isMobile && (
            <Link href="/" className="flex items-center">
              <Image src="/flair-logo.png" alt="Flair Logo" width={32} height={32} className="object-contain" />
            </Link>
          )}
          <CreditCounter />
        </div>

        {/* Center: Page Title - Absolutely positioned for perfect centering */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <h1 className="text-lg font-medium tracking-tight whitespace-nowrap">{getTitle()}</h1>
        </div>

        {/* Right side: Upgrade Plan, Settings, Auth, and Info Icons */}
        <div className="flex items-center justify-end gap-2 flex-1">
          {/* Upgrade Plan Button */}
          <button
            onClick={() => setShowPricing(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            aria-label="Upgrade your plan"
          >
            <Crown className="w-4 h-4" />
            Upgrade your plan
          </button>

          {/* Mobile Upgrade Plan Button */}
          <button
            onClick={() => setShowPricing(true)}
            className="sm:hidden p-1 rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="Upgrade your plan"
          >
            <Crown className="w-5 h-5 text-zinc-400" strokeWidth={1.5} />
          </button>
          {/* Settings button available on all pages except settings itself */}
          {pathname !== "/settings" && (
            <SignedIn>
              <Link
                href="/settings"
                className="p-1 rounded-full hover:bg-zinc-800 transition-colors"
                aria-label="User Settings"
              >
                <Settings className="w-5 h-5 text-white" strokeWidth={1.5} />
              </Link>
            </SignedIn>
          )}
          
          {/* Clerk Authentication */}
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-3 py-1.5 bg-white text-black text-sm rounded-full hover:bg-zinc-200 transition-colors font-medium">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                  userButtonPopoverCard: "bg-zinc-900 border border-zinc-800",
                  userButtonPopoverActionButton: "text-white hover:bg-zinc-800",
                },
              }}
            />
          </SignedIn>

          {isMobile && (
            <button
              onClick={() => setShowInfo(true)}
              className="p-1 rounded-full hover:bg-zinc-800"
              aria-label="About the founder"
            >
              <Info className="w-5 h-5 text-white" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
      {showInfo && <InfoPopup onClose={() => setShowInfo(false)} />}
      {showPricing && <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />}
    </>
  )
}
