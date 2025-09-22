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
    if (!code.startsWith('user_')) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid invite code format'
      })
    }

    // Check if the user (referrer) exists in the profiles table
    const { data: referrerData, error: referrerError } = await supabase
      .from('profiles')
      .select('username, display_name, clerk_id')
      .eq('clerk_id', code)
      .single()

    if (referrerError || !referrerData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid invite code - user not found'
      })
    }

    // Invite is valid - return referrer information
    const inviterName = referrerData.display_name || referrerData.username || 'a friend'

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
