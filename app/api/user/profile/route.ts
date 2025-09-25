import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { getUserProfile, updateUserProfile } from "../../../../lib/database-service-v2"
import { CacheManager, CACHE_TTL } from '@/lib/redis'
import { uploadBase64ToStorage } from '../../../../lib/image-sanitizer'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Profile API] GET request - User ID: ${userId}`)

    const cacheKey = `user:${userId}:profile`
    // Try cache first
    const cached = await CacheManager.get<any>(cacheKey)
    if (cached) {
      console.log(`[Profile API] Returning cached profile for user: ${userId}`)
      return NextResponse.json(cached)
    }

    // Get user's community profile using database service v2
    const profile = await getUserProfile(userId)

    if (!profile) {
      return NextResponse.json(null)
    }

    console.log(`[Profile API] Found profile for user: ${userId}`)
    // Cache the profile for faster subsequent reads
    try {
      await CacheManager.set(cacheKey, profile, CACHE_TTL.USER_PROFILE)
    } catch (e) {
      // ignore caching errors
    }
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
    
    // Validate profile picture size and format
    if (profilePicture) {
      let base64Data = profilePicture
      
      // Check if it's a data URL (base64 encoded image)
      if (profilePicture.startsWith('data:image/')) {
        // Extract base64 data
        base64Data = profilePicture.split(',')[1]
        if (!base64Data) {
          return NextResponse.json({ 
            error: "Invalid image format", 
            details: "Profile picture must be a valid base64 encoded image" 
          }, { status: 422 })
        }
      }
      
      // Validate base64 format
      try {
        atob(base64Data) // Test if it's valid base64
      } catch (e) {
        return NextResponse.json({ 
          error: "Invalid base64 format", 
          details: "Profile picture must be valid base64 encoded data" 
        }, { status: 422 })
      }
      
      // Check base64 size (approximately 4/3 of actual file size)
      const sizeInBytes = (base64Data.length * 3) / 4
      const maxSize = 500 * 1024 // Reduce to 500KB max for profile pictures
      
      if (sizeInBytes > maxSize) {
        return NextResponse.json({ 
          error: "Profile picture too large", 
          details: `Profile picture must be smaller than ${maxSize / 1024}KB. Current size: ${(sizeInBytes / 1024).toFixed(1)}KB` 
        }, { status: 422 })
      }
      
      console.log(`[User Profile API] Processing base64 image - size: ${(sizeInBytes / 1024).toFixed(1)}KB`)
    }
    
    // Validate display name
    if (displayName && displayName.trim().length > 100) {
      return NextResponse.json({ 
        error: "Display name too long", 
        details: "Display name must be 100 characters or less" 
      }, { status: 422 })
    }
    
    // Validate username
    if (username && (username.length > 30 || !/^[a-z0-9_]+$/.test(username))) {
      return NextResponse.json({ 
        error: "Invalid username", 
        details: "Username must be 30 characters or less and contain only lowercase letters, numbers, and underscores" 
      }, { status: 422 })
    }
    
    const client = await clerkClient()
    
    // Update Clerk user data
    const updateData: any = {}
    
    if (displayName) {
      // Handle name update - completely replace the name instead of just updating parts
      const nameParts = displayName.trim().split(' ')
      updateData.firstName = nameParts[0]
      updateData.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''
      
      // Also update the full name directly if Clerk supports it
      updateData.publicMetadata = { ...updateData.publicMetadata, fullName: displayName.trim() }
    }
    
    if (username) {
      updateData.username = username
    }
    
    // Store bio and profile picture in public metadata
    if (bio !== undefined) {
      updateData.publicMetadata = { 
        ...updateData.publicMetadata, 
        bio 
      }
    }
    
    // Handle profile picture update - upload base64 to storage and store URL only
    let profilePictureUrl = undefined
    if (profilePicture) {
      if (profilePicture.startsWith('data:')) {
        // Upload to storage and get public URL
        const uploaded = await uploadBase64ToStorage(profilePicture, 'profile-images')
        if (uploaded) profilePictureUrl = uploaded
      } else {
        // Might already be a URL
        profilePictureUrl = profilePicture
      }

      console.log(`[User Profile API] Processed profile picture - final URL present: ${!!profilePictureUrl}`)

      // Only store a flag in Clerk public metadata, not the full image
      updateData.publicMetadata = {
        ...updateData.publicMetadata,
        hasCustomProfilePicture: !!profilePictureUrl
      }
    }
    
    console.log(`[User Profile API] Updating Clerk user data:`, updateData)
    
    try {
      await client.users.updateUser(userId, updateData)
      console.log('[User Profile API] Clerk user updated successfully')
    } catch (clerkError) {
      console.error('[User Profile API] Error updating Clerk user:', clerkError)
      return NextResponse.json({ 
        error: "Failed to update user profile", 
        details: clerkError instanceof Error ? clerkError.message : 'Unknown Clerk error' 
      }, { status: 500 })
    }
    
    // Also update the profile in our database
    try {
      // Get fresh user data from Clerk after update
      const userData = await client.users.getUser(userId)
      
      // Update database profile using the new service function
      await updateUserProfile(userId, {
        username: userData?.username || username || `user_${userId.slice(-8)}`,
        display_name: displayName || userData?.publicMetadata?.fullName as string || userData?.fullName || userData?.firstName || userData?.username || 'User',
        full_name: displayName || userData?.fullName || undefined,
        bio: bio || userData?.publicMetadata?.bio as string || undefined,
        profile_picture_url: profilePictureUrl || userData?.imageUrl || undefined
      })
      
      console.log('[User Profile API] Database profile updated successfully')
    } catch (dbError) {
      console.error('Error updating database profile:', dbError)
      return NextResponse.json({ 
        error: "Failed to update profile in database", 
        details: dbError instanceof Error ? dbError.message : 'Unknown database error' 
      }, { status: 500 })
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
