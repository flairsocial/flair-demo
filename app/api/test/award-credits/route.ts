import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { action, targetUserId } = await request.json()

    console.log(`[Test Credits] ${action} for user ${userId}, target: ${targetUserId}`)

    if (action === 'award_referral_credits') {
      // Manually award 100 credits to the current user (simulating referral)
      await supabase
        .from('credit_awards')
        .insert({
          recipient_clerk_id: userId,
          amount: 100,
          reason: 'test_referral',
          awarded_by: 'test_system'
        })

      console.log(`[Test Credits] Awarded 100 test referral credits to ${userId}`)
      return NextResponse.json({ success: true, message: 'Referral credits awarded' })
    }

    if (action === 'award_referrer_credits') {
      // Manually award 100 credits to a target user (simulating referrer bonus)
      if (!targetUserId) {
        return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
      }

      await supabase
        .from('credit_awards')
        .insert({
          recipient_clerk_id: targetUserId,
          amount: 100,
          reason: 'test_referrer_bonus',
          awarded_by: userId
        })

      console.log(`[Test Credits] Awarded 100 test referrer credits to ${targetUserId}`)
      return NextResponse.json({ success: true, message: 'Referrer credits awarded' })
    }

    if (action === 'set_referred_by') {
      // Manually set referred_by for testing
      if (!targetUserId) {
        return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
      }

      // Get profile ID for current user
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_id', userId)
        .single()

      if (!currentProfile) {
        return NextResponse.json({ error: 'Current user profile not found' }, { status: 404 })
      }

      // Set referred_by for target user
      await supabase
        .from('profiles')
        .update({ referred_by: currentProfile.id })
        .eq('clerk_id', targetUserId)

      console.log(`[Test Credits] Set referred_by for ${targetUserId} to ${currentProfile.id}`)
      return NextResponse.json({ success: true, message: 'Referral relationship set' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('[Test Credits] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
