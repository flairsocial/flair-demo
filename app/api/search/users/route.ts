import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for server-side operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const query = url.searchParams.get('q')
    const limit = parseInt(url.searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json([])
    }

    console.log(`[Search API] Searching for: "${query}"`)

    // Search users by username or display name
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, clerk_id, username, display_name, profile_picture_url, follower_count, post_count')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .eq('is_public', true)
      .order('follower_count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[Search API] Error searching users:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    console.log(`[Search API] Found ${users.length} users`)
    return NextResponse.json(users)
  } catch (error) {
    console.error('[Search API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}