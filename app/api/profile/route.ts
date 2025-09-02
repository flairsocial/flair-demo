import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

// In-memory storage for demo purposes (in production, use a database)
const profileStorage = new Map<string, any>()

export async function GET() {
  try {
    const { userId } = await auth()
    
    const profileKey = userId || 'anonymous'
    
    // Get saved profile or return default
    const savedProfile = profileStorage.get(profileKey)
    
    const defaultProfile = {
      age: "",
      gender: "",
      bodyType: "",
      style: "",
      favoriteColors: [],
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

    console.log(`[Profile API] GET request - User ID: ${profileKey}`)
    console.log(`[Profile API] Returning profile:`, profile)
    return NextResponse.json(profile)
  } catch (error) {
    console.error("[Profile API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    const profileData = await request.json()
    const profileKey = userId || 'anonymous'
    
    // Save profile data
    profileStorage.set(profileKey, profileData)
    
    console.log(`[Profile API] POST request - User ID: ${profileKey}`)
    console.log("[Profile API] Profile data saved:", profileData)
    
    return NextResponse.json({ 
      success: true, 
      message: `Profile saved successfully${userId ? ' to your account' : ' (guest mode)'}`,
      data: profileData
    })
  } catch (error) {
    console.error("[Profile API] Error saving profile:", error)
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }
}
