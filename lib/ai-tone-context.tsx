"use client"

import React, { createContext, useContext, useState } from "react"

export type AITone = "professional" | "casual" | "friendly"

interface AIToneContextType {
  tone: AITone
  setTone: (tone: AITone) => void
  getToneDescription: () => string
}

const AIToneContext = createContext<AIToneContextType | undefined>(undefined)

export function AIToneProvider({ children }: { children: React.ReactNode }) {
  const [tone, setTone] = useState<AITone>("casual")

  const getToneDescription = () => {
    switch (tone) {
      case "professional":
        return "Brief, direct responses"
      case "casual":
        return "Balanced, conversational tone"
      case "friendly":
        return "Warm, personal with emojis"
    }
  }

  return (
    <AIToneContext.Provider value={{
      tone,
      setTone,
      getToneDescription
    }}>
      {children}
    </AIToneContext.Provider>
  )
}

export function useAITone() {
  const context = useContext(AIToneContext)
  if (context === undefined) {
    throw new Error("useAITone must be used within an AIToneProvider")
  }
  return context
}
