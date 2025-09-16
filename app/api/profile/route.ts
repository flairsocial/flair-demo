import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getProfile, setProfile } from "@/lib/database-service-v2"

export async function GET() {
  try {
    const { userId } = await auth()
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    // Get saved profile or return default
    const savedProfile = await getProfile(userId)
    
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

    console.log(`[Profile API] GET request - User ID: ${userId}`)
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
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const profileData = await request.json()
    
    console.log(`[Profile API] POST request - User ID: ${userId}`)
    console.log(`[Profile API] Saving profile data:`, profileData)

    await setProfile(userId, profileData)

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
