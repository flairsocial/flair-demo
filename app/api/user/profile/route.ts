import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getUserProfile, updateUserProfile } from "@/lib/database-service-v2"

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Profile API] GET request - User ID: ${userId}`)

    // Get user's community profile using database service v2
    const profile = await getUserProfile(userId)

    if (!profile) {
      return NextResponse.json(null)
    }

    console.log(`[Profile API] Found profile for user: ${userId}`)
    return NextResponse.json(profile)
  } catch (error) {
    console.error('[Profile API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const { displayName, username, bio, profilePicture } = await request.json()
    
    console.log(`[User Profile API] PUT request - User ID: ${userId}`)
    console.log(`[User Profile API] Update data:`, { displayName, username, bio, profilePicture: !!profilePicture })
    
    const client = await clerkClient()
    
    // Update Clerk user data
    const updateData: any = {}
    
    if (displayName) {
      // Split display name into first and last name
      const nameParts = displayName.trim().split(' ')
      updateData.firstName = nameParts[0]
      if (nameParts.length > 1) {
        updateData.lastName = nameParts.slice(1).join(' ')
      }
    }
    
    if (username) {
      updateData.username = username
    }
    
    // Store bio in public metadata
    if (bio !== undefined) {
      updateData.publicMetadata = { bio }
    }
    
    // Note: Profile picture updates in Clerk require special handling
    // For now, we'll store it in metadata and handle uploads separately
    if (profilePicture) {
      updateData.publicMetadata = { 
        ...updateData.publicMetadata, 
        customProfilePicture: profilePicture 
      }
    }
    
    console.log(`[User Profile API] Updating Clerk user data:`, updateData)
    await client.users.updateUser(userId, updateData)
    
    // Also update the profile in our database
    try {
      // Get fresh user data from Clerk after update
      const userData = await client.users.getUser(userId)
      
      // Update database profile using the new service function
      await updateUserProfile(userId, {
        username: userData?.username || username || `user_${userId.slice(-8)}`,
        display_name: userData?.fullName || displayName || userData?.firstName || userData?.username || 'User',
        full_name: userData?.fullName || undefined,
        bio: bio || userData?.publicMetadata?.bio as string || undefined,
        profile_picture_url: userData?.imageUrl || profilePicture || undefined
      })
      
      console.log('[User Profile API] Database profile updated successfully')
    } catch (dbError) {
      console.error('Error updating database profile:', dbError)
      // Don't fail the whole request if database update fails
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Profile updated successfully" 
    })
  } catch (error) {
    console.error("[User Profile API] Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
