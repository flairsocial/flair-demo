"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Globe, Book, Instagram } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface InfoPopupProps {
  onClose: () => void
}

export default function InfoPopup({ onClose }: InfoPopupProps) {
  const links = [
    {
      href: "https://flair.social",
      label: "Product Page",
      icon: Globe,
    },
    {
      href: "https://flair.wiki",
      label: "Company Page",
      icon: Book,
    },
    {
      href: "https://instagram.com/app.flair",
      label: "Instagram",
      icon: Instagram,
    },
  ]

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-zinc-900 w-full max-w-md border border-zinc-800 shadow-2xl" // No rounded corners here
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Banner Section */}
          <div className="relative h-20 w-full bg-zinc-900">
            {" "}
            {/* Changed bg to zinc-900 for consistency */}
            <Image
              src="/flair-social-banner.png" // Ensure this path is correct
              alt="Flair Social Banner"
              layout="fill"
              objectFit="contain" // Ensures entire image is visible and scales
              className="p-2" // Adds some padding around the banner image
            />
            {/* Optional: subtle gradient overlay if needed for text legibility over banner, if banner had complex background */}
            {/* <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" /> */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Content Section */}
          <div className="p-6">
            <div className="text-center mb-5">
              <h2 className="text-xl sm:text-2xl font-semibold text-white">Welcome to Flair</h2>
              <p className="text-xs text-zinc-400 tracking-widest mt-1 uppercase">Beta Release v.0.01</p>
            </div>

            <p className="text-zinc-300 text-sm leading-relaxed text-center mb-6">
              Flair is your AI-powered style assistant, designed to help you discover fashion that truly represents you.
              Explore, get inspired, and build your perfect wardrobe.
            </p>

            <div className="space-y-3">
              {links.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-3 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-md transition-all duration-200 group"
                  >
                    <Icon className="w-5 h-5 text-zinc-400 group-hover:text-white mr-3 transition-colors" />
                    <span className="text-sm text-white">{link.label}</span>
                    <Globe className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400 ml-auto transition-opacity opacity-0 group-hover:opacity-100" />
                  </Link>
                )
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
