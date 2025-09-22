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

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log(`[Debug] Checking invite system for user: ${userId}`)

    // Check user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', userId)
      .single()

    console.log(`[Debug] Profile data:`, { profile, profileError })

    // Check referrals
    const { data: referrals, error: referralsError } = await supabase
      .from('profiles')
      .select('id, clerk_id, referred_by')
      .eq('referred_by', profile?.id)

    console.log(`[Debug] Referrals data:`, { referrals, referralsError })

    // Check credit awards
    const { data: creditAwards, error: creditAwardsError } = await supabase
      .from('credit_awards')
      .select('*')
      .eq('recipient_clerk_id', userId)

    console.log(`[Debug] Credit awards data:`, { creditAwards, creditAwardsError })

    // Check if credit_awards table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('credit_awards')
      .select('count', { count: 'exact', head: true })

    console.log(`[Debug] Table check:`, { tableCheck, tableError })

    return NextResponse.json({
      userId,
      profile: {
        data: profile,
        error: profileError
      },
      referrals: {
        data: referrals,
        error: referralsError,
        count: referrals?.length || 0
      },
      creditAwards: {
        data: creditAwards,
        error: creditAwardsError,
        count: creditAwards?.length || 0
      },
      tableExists: !tableError,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Debug] Error in invite system debug:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
