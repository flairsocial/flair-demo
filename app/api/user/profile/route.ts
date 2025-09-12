import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"

export async function PUT(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const { displayName, username, bio, profilePicture } = await request.json()
    
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
    
    await client.users.updateUser(userId, updateData)
    
    // Also update the profile in our database using the same sync logic as community API
    try {
      // Use the same helper function from community API
      const { createClient } = await import('@supabase/supabase-js')
      
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })
      
      // Get fresh user data from Clerk after update
      const userData = await client.users.getUser(userId)
      
      const profileData = {
        clerk_id: userId,
        username: userData?.username || `user_${userId.slice(-8)}`,
        display_name: userData?.fullName || userData?.firstName || userData?.username || 'User',
        profile_picture_url: userData?.imageUrl || null,
        updated_at: new Date().toISOString()
      }
      
      // Update or create profile in database
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'clerk_id' })
      
      if (upsertError) {
        console.error('Error updating database profile:', upsertError)
      } else {
        console.log('Database profile updated successfully')
      }
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
