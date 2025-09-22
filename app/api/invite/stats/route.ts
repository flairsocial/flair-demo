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

    // Import the database service to get or create profile
    const { getOrCreateProfile } = await import('@/lib/database-service-v2')

    // Get or create the user's profile ID
    const profileId = await getOrCreateProfile(userId)
    console.log(`[Invite Stats] Profile ID for ${userId}: ${profileId}`)

    // Count successful signups (users referred by this user)
    const { count: referralsCount, error: referralsError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referred_by', profileId)

    if (referralsError) {
      console.error('Error counting referrals:', referralsError)
    }

    const successfulSignups = referralsCount || 0
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
