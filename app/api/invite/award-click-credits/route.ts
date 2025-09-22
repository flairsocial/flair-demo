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
      return NextResponse.json({
        success: true,
        message: 'Cannot refer yourself'
      })
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

    // Check if we've already awarded credits for this click (prevent spam)
    const clickKey = `invite-click-${userId}-${inviteCode}`
    const alreadyAwarded = localStorage?.getItem(clickKey)

    if (alreadyAwarded) {
      return NextResponse.json({
        success: true,
        message: 'Credits already awarded for this click'
      })
    }

    // Award 100 credits to the referrer by creating a credit award
    console.log(`[Invite Click Credits] Awarding 100 credits to referrer ${referrerData.id} for click by user ${userId}`)

    try {
      // Create credit award in database
      const { error: insertError } = await supabase
        .from('credit_awards')
        .insert({
          recipient_clerk_id: inviteCode,
          amount: 100,
          reason: 'invite_click',
          awarded_by: userId
        })

      if (insertError) {
        console.error('[Invite Click Credits] Failed to create credit award:', insertError)
        return NextResponse.json(
          { error: 'Failed to award credits' },
          { status: 500 }
        )
      }

      console.log(`[Invite Click Credits] Successfully created credit award for referrer ${inviteCode}`)

      // Mark as awarded to prevent spam (client-side tracking)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(clickKey, 'true')
      }

      return NextResponse.json({
        success: true,
        message: 'Referrer awarded 100 credits for your visit!'
      })

    } catch (dbError) {
      console.error('[Invite Click Credits] Database error:', dbError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error awarding click credits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
