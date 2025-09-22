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

    // Check for pending credit awards for this user
    const { data: awards, error } = await supabase
      .from('credit_awards')
      .select('id, amount, recipient_clerk_id')
      .eq('recipient_clerk_id', userId)
      .is('applied_at', null) // Only get unapplied awards

    if (error) {
      // If table doesn't exist, return empty
      console.log('[Credits] Credit awards table not found, returning empty')
      return NextResponse.json({
        totalCredits: 0,
        awardIds: [],
        awards: []
      })
    }

    const totalCredits = awards?.reduce((sum, award) => sum + (award.amount || 0), 0) || 0
    const awardIds = awards?.map(award => award.id) || []

    return NextResponse.json({
      totalCredits,
      awardIds,
      awards: awards || []
    })

  } catch (error) {
    console.error('Error checking credit awards:', error)
    return NextResponse.json(
      { error: 'Internal server error', totalCredits: 0, awardIds: [] },
      { status: 500 }
    )
  }
}
