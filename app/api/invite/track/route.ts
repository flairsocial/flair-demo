import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { inviteCode } = await request.json()

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Validate invite code format
    if (!inviteCode.startsWith('user_')) {
      return NextResponse.json(
        { error: 'Invalid invite code format' },
        { status: 400 }
      )
    }

    // Check if referrer exists
    const { data: referrerData, error: referrerError } = await supabase
      .from('profiles')
      .select('id, clerk_id')
      .eq('clerk_id', inviteCode)
      .single()

    if (referrerError || !referrerData) {
      return NextResponse.json(
        { error: 'Invalid referrer' },
        { status: 400 }
      )
    }

    // Track the invite click (we'll use a simple approach for now)
    // In production, you'd want to store this in a dedicated table with analytics
    console.log(`[Invite Tracking] Invite link clicked for referrer: ${inviteCode}`)

    // For now, we'll just return success
    // In the future, you could increment invite click counts here

    return NextResponse.json({
      success: true,
      referrerId: referrerData.id
    })

  } catch (error) {
    console.error('Error tracking invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
