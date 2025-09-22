import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required', valid: false },
        { status: 400 }
      )
    }

    // Validate that the invite code is a valid Clerk user ID format
    if (!code.startsWith('user_') || code.length < 20) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid invite code format'
      })
    }

    // For user-based invites, we accept any valid user ID format
    // The actual validation happens during signup via webhook
    // Try to get referrer information if available
    let inviterName = 'a friend'
    try {
      const { data: referrerData, error: referrerError } = await supabase
        .from('profiles')
        .select('username, display_name, clerk_id')
        .eq('clerk_id', code)
        .single()

      if (!referrerError && referrerData) {
        inviterName = referrerData.display_name || referrerData.username || 'a friend'
      }
      // If referrer doesn't exist in profiles yet, that's okay - invite is still valid
    } catch (error) {
      // Ignore errors - referrer info is optional for validation
      console.log('Could not fetch referrer info, but invite is still valid:', error)
    }

    return NextResponse.json({
      valid: true,
      inviteId: code, // Use the user ID as the invite ID
      referrerId: code,
      inviterName: inviterName,
      createdAt: new Date().toISOString(), // Current time as creation
      expiresAt: null // No expiration for user-based invites
    })

  } catch (error) {
    console.error('Error validating invite code:', error)
    return NextResponse.json(
      { error: 'Internal server error', valid: false },
      { status: 500 }
    )
  }
}
