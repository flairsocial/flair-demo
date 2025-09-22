import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateProfile, getUserProfile } from '@/lib/database-service-v2'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Test Profile] Testing profile creation for user:', userId)

    // Test profile creation
    const profileId = await getOrCreateProfile(userId)
    console.log('[Test Profile] Profile ID:', profileId)

    // Get the profile data
    const profile = await getUserProfile(userId)
    console.log('[Test Profile] Profile data:', profile)

    return NextResponse.json({
      success: true,
      userId,
      profileId,
      profile,
      message: 'Profile creation test completed successfully'
    })
  } catch (error) {
    console.error('[Test Profile] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
