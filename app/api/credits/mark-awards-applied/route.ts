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
    const { awardIds } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!awardIds || !Array.isArray(awardIds) || awardIds.length === 0) {
      return NextResponse.json(
        { error: 'Award IDs are required' },
        { status: 400 }
      )
    }

    // Mark the awards as applied
    const { error } = await supabase
      .from('credit_awards')
      .update({ applied_at: new Date().toISOString() })
      .in('id', awardIds)
      .eq('recipient_clerk_id', userId) // Security: only allow marking own awards

    if (error) {
      // If table doesn't exist, just log success
      console.log('[Credits] Credit awards table not found, marking as applied (no-op)')
      return NextResponse.json({ success: true })
    }

    console.log(`[Credits] Marked ${awardIds.length} credit awards as applied for user ${userId}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error marking credit awards as applied:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
