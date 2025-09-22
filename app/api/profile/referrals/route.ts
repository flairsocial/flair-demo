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
        { error: 'Profile not found', referralCount: 0 },
        { status: 404 }
      )
    }

    // Count how many users this user has referred
    const { data: referralsData, error: referralsError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('referred_by', profileData.id)

    if (referralsError) {
      console.error('Error counting referrals:', referralsError)
      return NextResponse.json(
        { error: 'Failed to count referrals', referralCount: 0 },
        { status: 500 }
      )
    }

    const referralCount = referralsData?.length || 0

    return NextResponse.json({
      referralCount,
      referrerId: profileData.id
    })

  } catch (error) {
    console.error('Error fetching referrals:', error)
    return NextResponse.json(
      { error: 'Internal server error', referralCount: 0 },
      { status: 500 }
    )
  }
}
