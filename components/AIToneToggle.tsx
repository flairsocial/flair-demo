"use client"

import React from "react"
import { motion } from "framer-motion"
import { Briefcase, MessageSquare, Heart } from "lucide-react"
import { useAITone, type AITone } from "@/lib/ai-tone-context"

export default function AIToneToggle() {
  const { tone, setTone, getToneDescription } = useAITone()

  const tones: { value: AITone; label: string; icon: any; color: string; description: string }[] = [
    {
      value: "professional",
      label: "Professional",
      icon: Briefcase,
      color: "bg-blue-600",
      description: "Brief & efficient"
    },
    {
      value: "casual",
      label: "Casual",
      icon: MessageSquare,
      color: "bg-purple-600",
      description: "Balanced & conversational"
    },
    {
      value: "friendly",
      label: "Friendly",
      icon: Heart,
      color: "bg-pink-600",
      description: "Warm & playful"
    }
  ]

  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-white">AI Personality</h4>
        <span className="text-xs text-zinc-400">{getToneDescription()}</span>
      </div>
      
      <div className="relative bg-zinc-900 rounded-lg p-1 flex">
        {tones.map((toneOption) => {
          const Icon = toneOption.icon
          const isActive = tone === toneOption.value
          
          return (
            <button
              key={toneOption.value}
              onClick={() => setTone(toneOption.value)}
              className={`relative flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? "text-white"
                  : "text-zinc-400 hover:text-zinc-300"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeToneBg"
                  className={`absolute inset-0 ${toneOption.color} rounded-md`}
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Icon className="w-3 h-3 relative z-10" strokeWidth={2} />
              <span className="relative z-10">{toneOption.label}</span>
            </button>
          )
        })}
      </div>
      
      <p className="text-xs text-zinc-500 mt-2">
        {tone === "professional" && "AI will provide concise, direct responses"}
        {tone === "casual" && "AI will use a balanced, conversational tone"}
        {tone === "friendly" && "AI will be warm, personal, and use emojis"}
      </p>
    </div>
  )
}
