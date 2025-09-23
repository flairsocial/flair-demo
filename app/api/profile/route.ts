import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getCachedUserProfile, getCachedUserPreferences, invalidateUserCache } from "@/lib/cache/user-cache"
import { setProfile } from "@/lib/database-service-v2"

export async function GET() {
  try {
    const { userId } = await auth()

    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get cached full user profile including referral data
    const userProfile = await getCachedUserProfile(userId)

    // Get cached user preferences
    const savedProfile = await getCachedUserPreferences(userId)

    const defaultProfile = {
      age: "",
      gender: "",
      bodyType: "",
      style: [],
      budgetRange: [],
      shoppingSources: [],
      lifestyle: "",
      goals: [],
      height: "",
      heightUnit: "feet",
      weight: "",
      weightUnit: "lbs",
      shoeSize: "",
      shoeSizeUnit: "US",
      waistSize: "",
      chestSize: "",
      hipSize: "",
      allergies: "",
      notes: "",
    }

    const profile = savedProfile ? { ...defaultProfile, ...savedProfile } : defaultProfile

    // Merge with database profile data
    const fullProfile = {
      ...profile,
      ...userProfile,
      // Ensure referral data is included
      referred_by: userProfile?.referred_by || null
    }

    console.log(`[Profile API] GET request - User ID: ${userId} (cached)`)
    console.log(`[Profile API] Profile found:`, !!savedProfile)
    console.log(`[Profile API] Referral data:`, { referred_by: fullProfile.referred_by })
    return NextResponse.json(fullProfile)
  } catch (error) {
    console.error("[Profile API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const profileData = await request.json()

    console.log(`[Profile API] POST request - User ID: ${userId}`)
    console.log(`[Profile API] Saving profile data:`, profileData)

    // Save to database
    await setProfile(userId, profileData)

    // Invalidate cache since profile was updated
    await invalidateUserCache(userId)

    return NextResponse.json({
      success: true,
      message: "Profile saved successfully to your account",
      data: profileData
    })
  } catch (error) {
    console.error("[Profile API] Error saving profile:", error)
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }
}
