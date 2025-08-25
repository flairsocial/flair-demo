"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { usePathname } from "next/navigation"
import { useMobile } from "@/hooks/use-mobile"
import InfoPopup from "./InfoPopup"
import Image from "next/image" // Import Image
import Link from "next/link" // Import Link

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

        {/* Right side: Info Icon */}
        <div className="w-8 flex justify-end">
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
