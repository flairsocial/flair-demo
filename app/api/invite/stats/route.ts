import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get the user's profile ID first
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (profileError || !profileData) {
      return NextResponse.json(
        { error: 'Profile not found', totalInvites: 0, successfulSignups: 0, creditsEarned: 0 },
        { status: 404 }
      )
    }

    // Count successful signups (users referred by this user)
    const { data: referralsData, error: referralsError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('referred_by', profileData.id)

    if (referralsError) {
      console.error('Error counting referrals:', referralsError)
    }

    const successfulSignups = referralsData?.length || 0
    const creditsEarned = successfulSignups * 100 // 100 credits per successful referral

    // For now, we'll use successful signups as total invites
    // In production, you'd track invite link clicks separately
    const totalInvites = successfulSignups

    return NextResponse.json({
      totalInvites,
      successfulSignups,
      creditsEarned
    })

  } catch (error) {
    console.error('Error fetching invite stats:', error)
    return NextResponse.json(
      { error: 'Internal server error', totalInvites: 0, successfulSignups: 0, creditsEarned: 0 },
      { status: 500 }
    )
  }
}
