import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getProfile, setProfile } from "@/lib/profile-storage"

export async function GET() {
  try {
    const { userId } = await auth()
    
    // Get saved profile or return default
    const savedProfile = getProfile(userId || undefined)
    
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

    console.log(`[Profile API] GET request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Profile API] Profile found:`, !!savedProfile)
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
    
    console.log(`[Profile API] POST request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Profile API] Saving profile data:`, profileData)

    setProfile(profileData, userId || undefined)

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
