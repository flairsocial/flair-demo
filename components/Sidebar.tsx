"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { HomeIcon, ChevronsLeftIcon as ChatBubbleLeftIcon, UserIcon, ChevronRight, Info, Globe } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import InfoPopup from "./InfoPopup"

const navItems = [
  { path: "/", label: "Discover", icon: HomeIcon },
  { path: "/chat", label: "AI Agent", icon: ChatBubbleLeftIcon },
  { path: "/community", label: "Community", icon: Globe },
  { path: "/profile", label: "Profile", icon: UserIcon },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const isMobile = useMobile()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const toggleSidebar = () => {
    setExpanded(!expanded)
  }

  if (isMobile) {
    return (
      <>
        <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-900 z-50">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              const Icon = item.icon

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className="flex flex-col items-center justify-center w-full h-full relative group"
                  aria-label={item.label}
                >
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
                    }`}
                    strokeWidth={1.5}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="mobileNavIndicator"
                      className="absolute bottom-2 w-1.5 h-1.5 bg-white rounded-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>
        {showInfo && <InfoPopup onClose={() => setShowInfo(false)} />}
      </>
    )
  }

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full z-50 flex flex-col bg-black border-r border-zinc-900 transition-all duration-300 ${
          expanded ? "w-56" : "w-16"
        } hidden md:flex`}
      >
        <div
          className={`flex items-center border-b border-zinc-900 h-20 ${expanded ? "justify-start px-4" : "justify-center"}`}
        >
          <Link href="/" className="flex items-center">
            <div className={`${expanded ? "w-8 h-8" : "w-8 h-8"} relative transition-all duration-300`}>
              <Image src="/flair-logo.png" alt="Flair Logo" fill className="object-contain" />
            </div>
            {expanded && <span className="ml-2 text-lg font-semibold text-white">Flair</span>}
          </Link>
        </div>

        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-24 bg-zinc-900 rounded-full p-1 border border-zinc-800 hover:bg-zinc-700 transition-colors"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
        </button>

        <nav className="flex-1 py-8 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path
            const Icon = item.icon

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center py-3 relative group transition-colors ${
                  expanded ? "px-4" : "justify-center"
                } ${isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"}`}
                aria-label={item.label}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktopNavIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                {expanded && <span className="ml-3 text-sm font-medium">{item.label}</span>}
                {!expanded && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className={`border-t border-zinc-900 py-4 ${expanded ? "px-4" : "flex justify-center"}`}>
          <button
            onClick={() => setShowInfo(true)}
            className={`flex items-center w-full group transition-colors relative ${
              pathname === "/about" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
            } ${!expanded ? "justify-center" : ""}`}
            aria-label="About the founder"
          >
            <Info className="w-5 h-5" strokeWidth={1.5} />
            {expanded && <span className="ml-3 text-sm">About</span>}
            {!expanded && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                About
              </span>
            )}
          </button>
        </div>
      </div>

      {showInfo && <InfoPopup onClose={() => setShowInfo(false)} />}
    </>
  )
}
