"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Save, User, Ruler, Package, ShoppingBag } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { RedirectToSignIn } from "@clerk/nextjs"
import Link from "next/link"
import { motion } from "framer-motion"
import { useProfile } from "@/lib/profile-context"
import { useShoppingMode } from "@/lib/shopping-mode-context"
import { useCredits } from "@/lib/credit-context"

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser()

  // Use global profile context instead of local state
  const { profile, updateProfile, saveProfile, isLoading: profileLoading, isLoaded: profileLoaded } = useProfile()
  const { mode: shoppingMode, setMode: setShoppingMode } = useShoppingMode()
  const { currentPlan } = useCredits()

  const [isLoading, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")

  // Debug logging to track profile state
  useEffect(() => {
    console.log('[SettingsPage] Profile loaded:', profileLoaded)
    console.log('[SettingsPage] Profile data:', profile)
  }, [profileLoaded, profile])

  const handleInputChange = (field: keyof typeof profile, value: string | string[]) => {
    updateProfile({ [field]: value })
  }

  const handleStyleToggle = (style: string) => {
    const newStyles = profile.style.includes(style)
      ? profile.style.filter((s: string) => s !== style)
      : [...profile.style, style]
    updateProfile({ style: newStyles })
  }

  const handleBudgetToggle = (budget: string) => {
    const newBudgets = profile.budgetRange.includes(budget)
      ? profile.budgetRange.filter((b: string) => b !== budget)
      : [...profile.budgetRange, budget]
    updateProfile({ budgetRange: newBudgets })
  }

  const handleSourceToggle = (source: string) => {
    const newSources = profile.shoppingSources.includes(source)
      ? profile.shoppingSources.filter((s: string) => s !== source)
      : [...profile.shoppingSources, source]
    updateProfile({ shoppingSources: newSources })
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage("")

    try {
      await saveProfile()
      setSaveMessage("Profile saved successfully!")
      
      // Simulate save delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setTimeout(() => setSaveMessage(""), 3000)
    } catch (error) {
      console.error("Error saving profile:", error)
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

  // Show loading while Clerk is initializing or profile is loading
  if (!isLoaded || !profileLoaded) {
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

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Age</label>
            <input
              type="number"
              value={profile.age}
              onChange={(e) => handleInputChange("age", e.target.value)}
              placeholder="Enter your age"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        {/* Region Settings */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-white" />
            <h2 className="text-xl font-semibold">Region Settings</h2>
          </div>

          <p className="text-sm text-zinc-400 mb-4">
            Set your location to get personalized marketplace results from your region.
            This helps find products available in your area and improves search relevance.
          </p>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Country</label>
            <select
              value={profile.country}
              onChange={(e) => handleInputChange("country", e.target.value)}
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              <option value="">Select Country</option>
              <option value="us">United States</option>
              <option value="ca">Canada</option>
              <option value="uk">United Kingdom</option>
              <option value="au">Australia</option>
              <option value="de">Germany</option>
              <option value="fr">France</option>
              <option value="jp">Japan</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* State/Province */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">State/Province</label>
            <input
              type="text"
              value={profile.state}
              onChange={(e) => handleInputChange("state", e.target.value)}
              placeholder="e.g., California, Ontario, Texas"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">City</label>
            <input
              type="text"
              value={profile.city}
              onChange={(e) => handleInputChange("city", e.target.value)}
              placeholder="e.g., Los Angeles, Toronto, New York"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        {/* Shopping Preferences */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-5 h-5 text-white" />
            <h2 className="text-xl font-semibold">Shopping Preferences</h2>
          </div>

          {/* Shopping Mode */}
          <div>
            
            <p className="text-xs text-zinc-400 mb-3">
              Choose your preferred shopping mode. You can always switch between modes while browsing.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setShoppingMode('default')}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  shoppingMode === 'default'
                    ? "bg-white text-black border-white"
                    : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Default Mode</span>
                  <span className="text-sm opacity-70">Fast, comprehensive results</span>
                </div>
              </button>
              <button
                onClick={() => {
                  // Check if user is trying to switch to marketplace mode
                  if (!isSignedIn || currentPlan === 'free') {
                    // Trigger pricing modal
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('showPricingModal'))
                    }
                    return // Don't change mode
                  }
                  setShoppingMode('marketplace')
                }}
                className={`p-4 rounded-lg border text-left transition-colors ${
                  shoppingMode === 'marketplace'
                    ? "bg-white text-black border-white"
                    : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Marketplace Mode</span>
                  <span className="text-sm opacity-70">Multi-platform - Facebook, Grailed, Etsy, eBay, StockX, Poshmark, AliExpress, etc</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Style Preferences */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-white" />
            <h2 className="text-xl font-semibold">Style Preferences</h2>
          </div>

          {/* Preferred Style */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Preferred Style (Select multiple)</label>
            <div className="grid grid-cols-3 gap-2">
              {styleOptions.map(style => (
                <button
                  key={style}
                  onClick={() => handleStyleToggle(style)}
                  className={`p-2 rounded-lg border text-xs transition-colors ${
                    profile.style.includes(style)
                      ? "bg-white text-black border-white"
                      : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Budget Range</label>
            <div className="grid grid-cols-3 gap-2">
              {budgetOptions.map(option => (
                <button
                  key={option}
                  onClick={() => handleBudgetToggle(option)}
                  className={`p-3 rounded-lg border text-sm transition-colors ${
                    profile.budgetRange.includes(option)
                      ? "bg-white text-black border-white"
                      : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Shopping Sources */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Preferred Shopping Sources</label>
            <div className="grid grid-cols-2 gap-2">
              {["Online retailers", "Department stores", "Boutiques", "Thrift stores", "Luxury brands", "Fast fashion", "Sustainable brands", "Local designers"].map(source => (
                <button
                  key={source}
                  onClick={() => handleSourceToggle(source)}
                  className={`p-2 rounded-lg border text-xs transition-colors ${
                    profile.shoppingSources.includes(source)
                      ? "bg-white text-black border-white"
                      : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          {/* Lifestyle */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Lifestyle</label>
            <input
              type="text"
              value={profile.lifestyle}
              onChange={(e) => handleInputChange("lifestyle", e.target.value)}
              placeholder="e.g., office worker, student, traveler, parent"
              className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
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

        {/* Save Button */}
        <div className="pb-8">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full bg-white text-black p-4 rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isLoading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  )
}
