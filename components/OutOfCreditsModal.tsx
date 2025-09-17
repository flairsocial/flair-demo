"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X, Crown, Sparkles, Zap, Shield, TrendingUp, MessageCircle } from "lucide-react"
import { useCredits } from "@/lib/credit-context"

interface OutOfCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
}

export default function OutOfCreditsModal({ isOpen, onClose, onUpgrade }: OutOfCreditsModalProps) {
  const { currentPlan, maxCredits } = useCredits()

  const benefits = [
    {
      icon: <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />,
      title: "More Daily Credits",
      description: "Get 500+ credits that reset daily"
    },
    {
      icon: <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />,
      title: "Advanced AI Analysis",
      description: "Deep pricing insights & market analysis"
    },
    {
      icon: <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />,
      title: "Fraud Detection",
      description: "Protect yourself from scams and fakes"
    },
    {
      icon: <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />,
      title: "Unlimited Chat",
      description: "Chat with AI without credit limits"
    }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-gradient-to-br from-black via-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-xl border border-gray-700/50 shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #000000 0%, #1f1f1f 50%, #181c21ff 100%)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(114, 114, 114, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1 rounded-lg hover:bg-zinc-800/50 transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                You've Used All Your Credits
              </h2>
              <p className="text-zinc-400 text-sm">
                Your {currentPlan} plan gives you {maxCredits} daily credits. They'll reset tomorrow, or upgrade now for instant access.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                Upgrade Benefits
              </h3>
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30">
                    {benefit.icon}
                    <div>
                      <div className="font-medium text-white text-sm">{benefit.title}</div>
                      <div className="text-zinc-400 text-xs">{benefit.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={onUpgrade}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-2.5 sm:py-3 px-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 text-sm sm:text-base"
              >
                Upgrade Now
              </button>
              <button
                onClick={onClose}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 sm:py-2.5 px-4 rounded-lg transition-colors text-xs sm:text-sm"
              >
                Wait for Tomorrow's Reset
              </button>
            </div>

            {/* Footer */}
            <div className="text-center mt-4 pt-4 border-t border-zinc-700/30">
              <p className="text-xs text-zinc-500">
                Credits reset daily at midnight. Upgrade for instant access.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
