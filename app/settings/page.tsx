"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Save, User, Ruler, Package } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { RedirectToSignIn } from "@clerk/nextjs"
import Link from "next/link"
import { motion } from "framer-motion"

interface UserProfile {
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
  preferredStyle: string[]
  budget: string
  allergies: string
  notes: string
}

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  
  const [profile, setProfile] = useState<UserProfile>({
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
    preferredStyle: [],
    budget: "",
    allergies: "",
    notes: "",
  })

  const [isLoading, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")

  // Load saved profile from API or localStorage
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Try to load from API first when user is authenticated
      loadUserProfile()
    } else if (isLoaded && !isSignedIn) {
      // Fallback to localStorage for demo purposes when not signed in
      const savedProfile = localStorage.getItem("flairUserProfile")
      if (savedProfile) {
        try {
          setProfile(JSON.parse(savedProfile))
        } catch (error) {
          console.error("Error loading saved profile:", error)
        }
      }
    }
  }, [isLoaded, isSignedIn])

  const loadUserProfile = async () => {
    try {
      const response = await fetch("/api/profile")
      if (response.ok) {
        const profileData = await response.json()
        setProfile(profileData)
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
      // Fallback to localStorage
      const savedProfile = localStorage.getItem("flairUserProfile")
      if (savedProfile) {
        try {
          setProfile(JSON.parse(savedProfile))
        } catch (error) {
          console.error("Error loading saved profile:", error)
        }
      }
    }
  }

  const handleInputChange = (field: keyof UserProfile, value: string | string[]) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleStyleToggle = (style: string) => {
    setProfile(prev => ({
      ...prev,
      preferredStyle: prev.preferredStyle.includes(style)
        ? prev.preferredStyle.filter(s => s !== style)
        : [...prev.preferredStyle, style]
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage("")

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

        if (response.ok) {
          setSaveMessage("Profile saved to your account!")
        } else {
          throw new Error("API save failed")
        }
      } else {
        // Fallback to localStorage for demo purposes
        localStorage.setItem("flairUserProfile", JSON.stringify(profile))
        setSaveMessage("Profile saved locally (sign in to save to your account)")
      }
      
      // Simulate save delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setTimeout(() => setSaveMessage(""), 3000)
    } catch (error) {
      console.error("Error saving profile:", error)
      // Fallback to localStorage
      localStorage.setItem("flairUserProfile", JSON.stringify(profile))
      setSaveMessage("Profile saved locally")
      setTimeout(() => setSaveMessage(""), 3000)
    } finally {
      setSaving(false)
    }
  }

  const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"]
  const bodyTypeOptions = ["Ectomorph (Slim)", "Mesomorph (Athletic)", "Endomorph (Curvy)", "Unsure"]
  const styleOptions = [
    "Casual", "Business", "Formal", "Streetwear", "Vintage", "Minimalist", 
    "Bohemian", "Sporty", "Preppy", "Edgy", "Romantic", "Classic"
  ]
  const budgetOptions = ["Under $50", "$50-$100", "$100-$250", "$250-$500", "$500+", "No limit"]

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }

  // Redirect to sign in if not authenticated (optional - you can allow guest access)
  // if (!isSignedIn) {
  //   return <RedirectToSignIn />
  // }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md px-4 py-4 flex items-center border-b border-zinc-900">
        <Link href="/" className="mr-3 p-1.5 rounded-full hover:bg-zinc-800">
          <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
        </Link>
        <h1 className="text-lg font-medium">Personal Settings</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-8">
        {/* Save Message */}
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-lg text-center ${
              saveMessage.includes("Error") 
                ? "bg-red-900/20 border border-red-900/30 text-red-300" 
                : "bg-green-900/20 border border-green-900/30 text-green-300"
            }`}
          >
            {saveMessage}
          </motion.div>
        )}

        {/* Privacy Notice */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-white mb-2">🔒 Privacy & Security</h2>
          <p className="text-xs text-zinc-400">
            Your personal information is kept secure and private. This data helps us provide better, 
            more personalized fashion recommendations. You can update or delete this information anytime.
          </p>
        </div>

        {/* Basic Information */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-white" />
            <h2 className="text-xl font-semibold">Basic Information</h2>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Gender</label>
            <div className="grid grid-cols-2 gap-2">
              {genderOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleInputChange("gender", option)}
                  className={`p-3 rounded-lg border text-sm transition-colors ${
                    profile.gender === option
                      ? "bg-white text-black border-white"
                      : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Body Type */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Body Type</label>
            <div className="grid grid-cols-1 gap-2">
              {bodyTypeOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleInputChange("bodyType", option)}
                  className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                    profile.bodyType === option
                      ? "bg-white text-black border-white"
                      : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Measurements */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="w-5 h-5 text-white" />
            <h2 className="text-xl font-semibold">Measurements</h2>
          </div>

          {/* Height */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-white mb-2">Height</label>
              <input
                type="text"
                value={profile.height}
                onChange={(e) => handleInputChange("height", e.target.value)}
                placeholder="e.g., 5'8&quot; or 173"
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Unit</label>
              <select
                value={profile.heightUnit}
                onChange={(e) => handleInputChange("heightUnit", e.target.value)}
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="feet">Feet</option>
                <option value="cm">CM</option>
              </select>
            </div>
          </div>

          {/* Weight */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-white mb-2">Weight (Optional)</label>
              <input
                type="text"
                value={profile.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                placeholder="e.g., 150 or 68"
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Unit</label>
              <select
                value={profile.weightUnit}
                onChange={(e) => handleInputChange("weightUnit", e.target.value)}
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                <option value="lbs">LBS</option>
                <option value="kg">KG</option>
              </select>
            </div>
          </div>

          {/* Sizes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Shoe Size</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={profile.shoeSize}
                  onChange={(e) => handleInputChange("shoeSize", e.target.value)}
                  placeholder="9.5"
                  className="flex-1 p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <select
                  value={profile.shoeSizeUnit}
                  onChange={(e) => handleInputChange("shoeSizeUnit", e.target.value)}
                  className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                >
                  <option value="US">US</option>
                  <option value="EU">EU</option>
                  <option value="UK">UK</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Waist Size</label>
              <input
                type="text"
                value={profile.waistSize}
                onChange={(e) => handleInputChange("waistSize", e.target.value)}
                placeholder="32"
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Chest/Bust Size</label>
              <input
                type="text"
                value={profile.chestSize}
                onChange={(e) => handleInputChange("chestSize", e.target.value)}
                placeholder="36"
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Hip Size</label>
              <input
                type="text"
                value={profile.hipSize}
                onChange={(e) => handleInputChange("hipSize", e.target.value)}
                placeholder="38"
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>
        </div>

        {/* Style Preferences */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-white" />
            <h2 className="text-xl font-semibold">Style Preferences</h2>
          </div>

          {/* Preferred Styles */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Preferred Styles (Select multiple)</label>
            <div className="grid grid-cols-3 gap-2">
              {styleOptions.map(style => (
                <button
                  key={style}
                  onClick={() => handleStyleToggle(style)}
                  className={`p-2 rounded-lg border text-xs transition-colors ${
                    profile.preferredStyle.includes(style)
                      ? "bg-white text-black border-white"
                      : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Typical Budget per Item</label>
            <div className="grid grid-cols-3 gap-2">
              {budgetOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleInputChange("budget", option)}
                  className={`p-3 rounded-lg border text-sm transition-colors ${
                    profile.budget === option
                      ? "bg-white text-black border-white"
                      : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Allergies/Materials to Avoid</label>
            <input
              type="text"
              value={profile.allergies}
              onChange={(e) => handleInputChange("allergies", e.target.value)}
              placeholder="e.g., wool, latex, certain dyes"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Additional Notes</label>
            <textarea
              value={profile.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Any additional style preferences, fit concerns, or special considerations..."
              rows={4}
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="sticky bottom-4 bg-black/80 backdrop-blur-md p-4 -mx-4 border-t border-zinc-800">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-5 h-5" />
            {isLoading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  )
}
