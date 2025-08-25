"use client"

import { useState } from "react"
import { Sparkles, Zap } from "lucide-react"
import { motion } from "framer-motion"

interface AnalyzeWithAIButtonProps {
  onClick: () => void
  variant?: "primary" | "secondary" | "floating" | "inline" | "chat"
  size?: "sm" | "md" | "lg"
  className?: string
}

export default function AnalyzeWithAIButton({
  onClick,
  variant = "primary",
  size = "md",
  className = "",
}: AnalyzeWithAIButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Determine classes based on variant and size
  const getButtonClasses = () => {
    let baseClasses =
      "flex items-center justify-center font-medium transition-all duration-300 relative overflow-hidden"

    // Size classes
    if (size === "sm") baseClasses += " text-xs py-1.5 px-3 rounded-lg"
    else if (size === "md") baseClasses += " text-sm py-2 px-4 rounded-lg"
    else baseClasses += " text-base py-3 px-5 rounded-xl"

    // Variant classes
    if (variant === "primary") {
      baseClasses +=
        " bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20"
    } else if (variant === "secondary") {
      baseClasses += " bg-zinc-900 border border-blue-500/30 text-blue-400 hover:bg-zinc-800 hover:border-blue-500/50"
    } else if (variant === "floating") {
      baseClasses +=
        " bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20 rounded-full"
    } else if (variant === "inline") {
      baseClasses += " bg-transparent text-blue-400 hover:text-blue-300 p-0 underline underline-offset-2"
    }

    return `${baseClasses} ${className}`
  }

  return (
    <motion.button
      className={getButtonClasses()}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: variant === "inline" ? 1 : 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      {variant !== "inline" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-400/10"
          initial={{ x: "-100%" }}
          animate={{ x: isHovered ? "100%" : "-100%" }}
          transition={{ duration: 1, repeat: isHovered ? Number.POSITIVE_INFINITY : 0 }}
        />
      )}

      {variant === "floating" ? (
        <Zap className={`${size === "sm" ? "w-4 h-4" : size === "md" ? "w-5 h-5" : "w-6 h-6"}`} />
      ) : variant === "chat" ? (
        <>
          <Sparkles className={`${size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5"} mr-1.5`} />
          <span>Chat with AI</span>
        </>
      ) : (
        <>
          <Sparkles className={`${size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5"} mr-1.5`} />
          <span>Analyze with AI</span>
        </>
      )}
    </motion.button>
  )
}
