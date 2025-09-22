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

    // Check if the invite code exists in the database
    const { data: inviteData, error } = await supabase
      .from('invites')
      .select('id, referrer_id, created_at, used_at, expires_at')
      .eq('code', code)
      .single()

    if (error || !inviteData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid invite code'
      })
    }

    // Check if invite has expired
    if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Invite code has expired'
      })
    }

    // Check if invite has already been used
    if (inviteData.used_at) {
      return NextResponse.json({
        valid: false,
        error: 'Invite code has already been used'
      })
    }

    // Get referrer information
    const { data: referrerData, error: referrerError } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('clerk_id', inviteData.referrer_id)
      .single()

    const inviterName = referrerData?.display_name || referrerData?.username || 'a friend'

    return NextResponse.json({
      valid: true,
      inviteId: inviteData.id,
      referrerId: inviteData.referrer_id,
      inviterName: inviterName,
      createdAt: inviteData.created_at,
      expiresAt: inviteData.expires_at
    })

  } catch (error) {
    console.error('Error validating invite code:', error)
    return NextResponse.json(
      { error: 'Internal server error', valid: false },
      { status: 500 }
    )
  }
}
