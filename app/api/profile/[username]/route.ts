import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    // Get user profile by username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .eq('is_public', true)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get user's public posts
    const { data: posts, error: postsError } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!profile_id (
          id,
          username,
          display_name,
          profile_picture_url
        )
      `)
      .eq('profile_id', profile.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20)

    if (postsError) {
      console.error('Error fetching user posts:', postsError)
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
    }

    // Get user's public collections
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (collectionsError) {
      console.error('Error fetching user collections:', collectionsError)
      return NextResponse.json({ error: 'Failed to load collections' }, { status: 500 })
    }

    return NextResponse.json({
      profile,
      posts: posts || [],
      collections: collections || []
    })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
