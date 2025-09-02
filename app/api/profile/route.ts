import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET() {
  try {
    const { userId } = await auth()
    
    // Allow unauthenticated access for demo purposes
    // if (!userId) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    // For now, return empty profile for demo purposes
    // Later this will fetch from database using userId
    const defaultProfile = {
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
    }

    console.log(`[Profile API] GET request - User ID: ${userId || 'anonymous'}`)
    return NextResponse.json(defaultProfile)
  } catch (error) {
    console.error("[Profile API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    // Allow unauthenticated access for demo purposes
    // if (!userId) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const profileData = await request.json()
    
    // TODO: Validate profileData schema here
    
    // For now, just return success
    // Later this will save to database with userId
    console.log(`[Profile API] POST request - User ID: ${userId || 'anonymous'}`)
    console.log("[Profile API] Profile data received:", profileData)
    
    return NextResponse.json({ 
      success: true, 
      message: `Profile saved successfully${userId ? ' to your account' : ' (guest mode)'}` 
    })
  } catch (error) {
    console.error("[Profile API] Error saving profile:", error)
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 })
  }
}
