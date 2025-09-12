import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    // Get current user data from Clerk
    const client = await clerkClient()
    const userData = await client.users.getUser(userId)

    return NextResponse.json({
      database_profile: profile,
      clerk_data: {
        id: userData.id,
        username: userData.username,
        fullName: userData.fullName,
        firstName: userData.firstName,
        lastName: userData.lastName,
        imageUrl: userData.imageUrl,
        publicMetadata: userData.publicMetadata
      }
    })
  } catch (error) {
    console.error('Debug profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Force refresh profile data from Clerk
    const client = await clerkClient()
    const userData = await client.users.getUser(userId)

    const profileData = {
      clerk_id: userId,
      username: userData?.username || `user_${userId.slice(-8)}`,
      display_name: userData?.fullName || userData?.firstName || userData?.username || 'User',
      profile_picture_url: userData?.imageUrl || null,
      updated_at: new Date().toISOString()
    }

    // Update profile in database
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'clerk_id' })

    if (upsertError) {
      console.error('Error updating profile:', upsertError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile refreshed successfully',
      profile: profileData 
    })
  } catch (error) {
    console.error('Refresh profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
