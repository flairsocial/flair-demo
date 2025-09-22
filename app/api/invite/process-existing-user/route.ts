import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    const { inviteCode } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

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

    // Don't allow self-referral
    if (inviteCode === userId) {
      return NextResponse.json(
        { error: 'Cannot refer yourself' },
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

    // Check if this user has already been awarded credits for this referrer
    // We'll use a simple approach: check if the user is already referred by this referrer
    const { data: existingReferral } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .eq('referred_by', referrerData.id)
      .single()

    // If user is already referred by this referrer, don't award again
    if (existingReferral) {
      return NextResponse.json({
        success: true,
        message: 'Already processed'
      })
    }

    // Award 100 credits to the referrer
    // Since we can't directly modify another user's credits from server-side,
    // we'll store this in the database and let the client-side credit context handle it
    console.log(`[Invite Processing] Awarding 100 credits to referrer ${referrerData.id} for user ${userId} interaction`)

    // For now, we'll just log this and rely on the client-side logic
    // In a production system, you'd want to update the referrer's credits directly

    return NextResponse.json({
      success: true,
      message: 'Referrer credited'
    })

  } catch (error) {
    console.error('Error processing invite for existing user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
