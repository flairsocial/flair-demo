import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateProfile } from '@/lib/database-service-v2'

// Test endpoint to manually trigger profile creation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clerkId } = body

    if (!clerkId) {
      return NextResponse.json({ error: 'Missing clerkId' }, { status: 400 })
    }

    console.log(`[Test Webhook] Manually creating profile for user: ${clerkId}`)

    try {
      // Create profile for the user
      const profileId = await getOrCreateProfile(clerkId)
      console.log(`[Test Webhook] Successfully created profile ${profileId} for user ${clerkId}`)

      return NextResponse.json({
        success: true,
        message: `Profile created successfully`,
        profileId,
        clerkId
      })
    } catch (error) {
      console.error(`[Test Webhook] Failed to create profile for user ${clerkId}:`, error)
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[Test Webhook] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
