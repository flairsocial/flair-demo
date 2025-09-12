import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
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

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all community posts
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!profile_id (
          id,
          clerk_id,
          username,
          display_name,
          profile_picture_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error getting posts:', error)
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
    }

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Debug posts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all community posts for current user (for testing)
    // First get the user's actual profile ID from the database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('profile_id', profile.id)

    if (error) {
      console.error('Error deleting posts:', error)
      return NextResponse.json({ error: 'Failed to delete posts' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'All posts deleted successfully' 
    })
  } catch (error) {
    console.error('Delete posts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
