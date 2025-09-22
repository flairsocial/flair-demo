import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { postId, action } = await request.json()

    if (!postId || !action) {
      return NextResponse.json({ error: 'Missing postId or action' }, { status: 400 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (action === 'like') {
      // Check if user already liked this post
      const { data: existingLike, error: likeCheckError } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('profile_id', profile.id)
        .single()

      if (existingLike) {
        return NextResponse.json({ error: 'Already liked this post' }, { status: 400 })
      }

      // Add like
      const { error: insertError } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          profile_id: profile.id
        })

      if (insertError) {
        console.error('Error adding like:', insertError)
        return NextResponse.json({ error: 'Failed to add like' }, { status: 500 })
      }

      // Update like count on post
      const { error: updateError } = await supabase.rpc('increment_like_count', {
        post_id: postId
      })

      if (updateError) {
        console.error('Error updating like count:', updateError)
      }

      // Get updated like count
      const { count: likeCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      return NextResponse.json({
        success: true,
        liked: true,
        likeCount: likeCount || 0
      })

    } else if (action === 'unlike') {
      // Remove like
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('profile_id', profile.id)

      if (deleteError) {
        console.error('Error removing like:', deleteError)
        return NextResponse.json({ error: 'Failed to remove like' }, { status: 500 })
      }

      // Update like count on post
      const { error: updateError } = await supabase.rpc('decrement_like_count', {
        post_id: postId
      })

      if (updateError) {
        console.error('Error updating like count:', updateError)
      }

      // Get updated like count
      const { count: likeCount } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      return NextResponse.json({
        success: true,
        liked: false,
        likeCount: likeCount || 0
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Like API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    }

    let userLiked = false

    if (userId) {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_id', userId)
        .single()

      if (profile) {
        // Check if user liked this post
        const { data: like } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('profile_id', profile.id)
          .single()

        userLiked = !!like
      }
    }

    // Get total like count
    const { count: likeCount } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    return NextResponse.json({
      liked: userLiked,
      likeCount: likeCount || 0
    })

  } catch (error) {
    console.error('Like status API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
