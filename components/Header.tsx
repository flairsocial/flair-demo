"use client"

import { useState } from "react"
import { Info, Settings } from "lucide-react"
import { usePathname } from "next/navigation"
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs"
import { useMobile } from "@/hooks/use-mobile"
import InfoPopup from "./InfoPopup"
import Image from "next/image"
import Link from "next/link"

export default function Header() {
  const [showInfo, setShowInfo] = useState(false)
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
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 py-4 flex justify-between items-center border-b border-zinc-900 h-16">
        {/* Left side: Logo on mobile, empty on desktop to align with sidebar */}
        <div className="w-8">
          {isMobile && (
            <Link href="/" className="flex items-center">
              <Image src="/flair-logo.png" alt="Flair Logo" width={32} height={32} className="object-contain" />
            </Link>
          )}
        </div>

        {/* Center: Page Title */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-medium tracking-tight">{getTitle()}</h1>
        </div>

        {/* Right side: Settings, Auth, and Info Icons */}
        <div className="w-auto flex items-center justify-end gap-2">
          {/* Settings button only on discover page */}
          {pathname === "/" && (
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
    </>
  )
}
