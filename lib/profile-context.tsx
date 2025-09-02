"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export interface UserProfile {
  age: string
  gender: string
  height: string
  heightUnit: string
  weight: string
  weightUnit: string
  shoeSize: string
  shoeSizeUnit: string
  waistSize: string
  chestSize: string
  hipSize: string
  bodyType: string
  style: string[]
  budgetRange: string[]
  shoppingSources: string[]
  lifestyle: string
  goals: string[]
  allergies: string
  notes: string
}

interface ProfileContextType {
  profile: UserProfile
  updateProfile: (newProfile: Partial<UserProfile>) => void
  saveProfile: () => Promise<void>
  isLoading: boolean
  isLoaded: boolean
}

const defaultProfile: UserProfile = {
  age: "",
  gender: "",
  height: "",
  heightUnit: "feet",
  weight: "",
  weightUnit: "lbs",
  shoeSize: "",
  shoeSizeUnit: "US",
  waistSize: "",
  chestSize: "",
  hipSize: "",
  bodyType: "",
  style: [],
  budgetRange: [],
  shoppingSources: [],
  lifestyle: "",
  goals: [],
  allergies: "",
  notes: "",
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: userLoaded, isSignedIn, user } = useUser()
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load profile when user status changes
  useEffect(() => {
    if (userLoaded) {
      loadUserProfile()
    }
  }, [userLoaded, isSignedIn])

  const loadUserProfile = async () => {
    setIsLoading(true)
    try {
      if (isSignedIn) {
        // Try to load from API when authenticated
        const response = await fetch("/api/profile")
        if (response.ok) {
          const profileData = await response.json()
          if (profileData && Object.keys(profileData).length > 0) {
            setProfile({ ...defaultProfile, ...profileData })
            setIsLoaded(true)
            setIsLoading(false)
            return
          }
        }
      }
      
      // Fallback to localStorage
      const savedProfile = localStorage.getItem("flairUserProfile")
      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile)
          setProfile({ ...defaultProfile, ...parsedProfile })
        } catch (error) {
          console.error("Error parsing saved profile:", error)
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
    } finally {
      setIsLoaded(true)
      setIsLoading(false)
    }
  }

  const updateProfile = (newProfile: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...newProfile }))
  }

  const saveProfile = async (): Promise<void> => {
    setIsLoading(true)
    try {
      if (isSignedIn) {
        // Save via API when authenticated
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profile),
        })

        if (!response.ok) {
          throw new Error("API save failed")
        }
      } else {
        // Fallback to localStorage
        localStorage.setItem("flairUserProfile", JSON.stringify(profile))
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      // Always save to localStorage as backup
      localStorage.setItem("flairUserProfile", JSON.stringify(profile))
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Generate search context from profile for AI
  const getSearchContext = (): string => {
    const parts: string[] = []
    
    if (profile.age) parts.push(`Age: ${profile.age}`)
    if (profile.gender) parts.push(`Gender: ${profile.gender}`)
    if (profile.bodyType) parts.push(`Body type: ${profile.bodyType}`)
    if (profile.height && profile.heightUnit) parts.push(`Height: ${profile.height} ${profile.heightUnit}`)
    if (profile.waistSize) parts.push(`Waist: ${profile.waistSize}`)
    if (profile.chestSize) parts.push(`Chest/Bust: ${profile.chestSize}`)
    if (profile.shoeSize && profile.shoeSizeUnit) parts.push(`Shoe size: ${profile.shoeSize} ${profile.shoeSizeUnit}`)
    if (profile.style.length > 0) parts.push(`Style preferences: ${profile.style.join(', ')}`)
    if (profile.budgetRange.length > 0) parts.push(`Budget: ${profile.budgetRange.join(', ')}`)
    if (profile.shoppingSources.length > 0) parts.push(`Preferred stores: ${profile.shoppingSources.join(', ')}`)
    if (profile.lifestyle) parts.push(`Lifestyle: ${profile.lifestyle}`)
    if (profile.goals.length > 0) parts.push(`Goals: ${profile.goals.join(', ')}`)
    if (profile.allergies) parts.push(`Avoid materials: ${profile.allergies}`)
    
    return parts.join('. ')
  }

  const value: ProfileContextType = {
    profile,
    updateProfile,
    saveProfile,
    isLoading,
    isLoaded,
  }

  // Add getSearchContext to the context value
  const extendedValue = {
    ...value,
    getSearchContext,
  }

  return (
    <ProfileContext.Provider value={extendedValue as ProfileContextType}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context as ProfileContextType & { getSearchContext: () => string }
}
