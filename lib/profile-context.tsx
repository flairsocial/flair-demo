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
  const [hasInitialized, setHasInitialized] = useState(false)

  // Load profile only once when user status is available and we haven't initialized yet
  useEffect(() => {
    if (userLoaded && !hasInitialized) {
      console.log('[ProfileContext] Initializing profile for first time')
      loadUserProfile()
      setHasInitialized(true)
    }
  }, [userLoaded, hasInitialized])

  // Also load from localStorage immediately on mount (for faster UX)
  useEffect(() => {
    if (!hasInitialized) {
      const savedProfile = localStorage.getItem("flairUserProfile")
      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile)
          console.log('[ProfileContext] Loading profile from localStorage')
          setProfile({ ...defaultProfile, ...parsedProfile })
          setIsLoaded(true)
        } catch (error) {
          console.error("Error parsing saved profile:", error)
        }
      }
    }
  }, [hasInitialized])

  const loadUserProfile = async () => {
    if (isLoading) {
      console.log('[ProfileContext] Already loading, skipping...')
      return // Prevent concurrent loads
    }
    
    setIsLoading(true)
    console.log('[ProfileContext] Loading user profile...')
    
    try {
      if (isSignedIn && userLoaded) {
        console.log('[ProfileContext] User is signed in, attempting API load')
        // Try to load from API when authenticated
        const response = await fetch("/api/profile", {
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        if (response.ok) {
          const profileData = await response.json()
          if (profileData && Object.keys(profileData).length > 0) {
            console.log('[ProfileContext] Successfully loaded profile from API')
            setProfile({ ...defaultProfile, ...profileData })
            // Also save to localStorage for faster future loads
            localStorage.setItem("flairUserProfile", JSON.stringify(profileData))
            setIsLoaded(true)
            setIsLoading(false)
            return
          }
        } else {
          console.log('[ProfileContext] API load failed, status:', response.status)
        }
      }
      
      // Fallback to localStorage (for signed out users or API failures)
      const savedProfile = localStorage.getItem("flairUserProfile")
      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile)
          console.log('[ProfileContext] Loaded profile from localStorage fallback')
          setProfile({ ...defaultProfile, ...parsedProfile })
        } catch (error) {
          console.error("Error parsing saved profile:", error)
        }
      } else {
        console.log('[ProfileContext] No saved profile found, using defaults')
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
      // Try localStorage as last resort
      const savedProfile = localStorage.getItem("flairUserProfile")
      if (savedProfile) {
        try {
          const parsedProfile = JSON.parse(savedProfile)
          setProfile({ ...defaultProfile, ...parsedProfile })
        } catch (e) {
          console.error("Error parsing fallback profile:", e)
        }
      }
    } finally {
      setIsLoaded(true)
      setIsLoading(false)
    }
  }

  const updateProfile = (newProfile: Partial<UserProfile>) => {
    const updatedProfile = { ...profile, ...newProfile }
    setProfile(updatedProfile)
    
    // Immediately save to localStorage to prevent data loss on navigation
    try {
      localStorage.setItem("flairUserProfile", JSON.stringify(updatedProfile))
      console.log('[ProfileContext] Profile updated and saved to localStorage')
    } catch (error) {
      console.error("Error saving updated profile to localStorage:", error)
    }
  }

  const saveProfile = async (): Promise<void> => {
    setIsLoading(true)
    console.log('[ProfileContext] Saving profile...')
    
    try {
      // Always save to localStorage first (immediate persistence)
      localStorage.setItem("flairUserProfile", JSON.stringify(profile))
      console.log('[ProfileContext] Profile saved to localStorage')
      
      if (isSignedIn && userLoaded) {
        console.log('[ProfileContext] Attempting to save to API...')
        // Save via API when authenticated
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(profile),
        })

        if (response.ok) {
          console.log('[ProfileContext] Profile successfully saved to API')
        } else {
          console.log('[ProfileContext] API save failed, but localStorage save succeeded')
          // Don't throw error since localStorage save succeeded
        }
      } else {
        console.log('[ProfileContext] User not signed in, localStorage save only')
      }
    } catch (error) {
      console.error("Error saving profile to API:", error)
      // Ensure localStorage backup even if API fails
      try {
        localStorage.setItem("flairUserProfile", JSON.stringify(profile))
        console.log('[ProfileContext] Fallback save to localStorage succeeded')
      } catch (storageError) {
        console.error("Error saving to localStorage backup:", storageError)
        throw storageError
      }
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
