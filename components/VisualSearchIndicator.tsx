import React from 'react'
import { Eye, Search, Sparkles, Target } from 'lucide-react'
import { motion } from 'framer-motion'

interface VisualSearchIndicatorProps {
  isActive: boolean
  confidence?: number
  featuresFound?: string[]
  className?: string
}

export default function VisualSearchIndicator({ 
  isActive, 
  confidence, 
  featuresFound, 
  className = "" 
}: VisualSearchIndicatorProps) {
  if (!isActive) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 ${className}`}
    >
      {/* Icon */}
      <div className="relative">
        <Eye className="w-4 h-4 text-purple-400" />
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5] 
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0"
        >
          <Sparkles className="w-4 h-4 text-blue-400" />
        </motion.div>
      </div>

      {/* Text */}
      <div className="flex items-center gap-1 text-sm">
        <span className="text-purple-300 font-medium">Visual Search</span>
        
        {confidence && (
          <span className="text-blue-300 text-xs">
            {confidence}% match
          </span>
        )}
      </div>

      {/* Features indicator */}
      {featuresFound && featuresFound.length > 0 && (
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3 text-green-400" />
          <span className="text-xs text-green-300">
            {featuresFound.length} features
          </span>
        </div>
      )}
    </motion.div>
  )
}

// Alternative compact version
export function VisualSearchBadge({ 
  isActive, 
  confidence,
  className = "" 
}: Pick<VisualSearchIndicatorProps, 'isActive' | 'confidence' | 'className'>) {
  if (!isActive) return null

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/20 border border-purple-500/30 ${className}`}
    >
      <Eye className="w-3 h-3 text-purple-400" />
      <span className="text-xs text-purple-300 font-medium">
        Visual{confidence && ` ${confidence}%`}
      </span>
    </motion.div>
  )
}
