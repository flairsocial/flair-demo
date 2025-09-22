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

    const { postId, content, parentCommentId } = await request.json()

    if (!postId || !content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Missing postId or content' }, { status: 400 })
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

    // Add comment
    const { data: comment, error: insertError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        profile_id: profile.id,
        content: content.trim(),
        parent_comment_id: parentCommentId || null
      })
      .select(`
        *,
        author:profiles!profile_id (
          id,
          username,
          display_name,
          profile_picture_url,
          is_pro
        )
      `)
      .single()

    if (insertError) {
      console.error('Error adding comment:', insertError)
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
    }

    // Update comment count on post
    const { error: updateError } = await supabase.rpc('increment_comment_count', {
      post_id: postId
    })

    if (updateError) {
      console.error('Error updating comment count:', updateError)
    }

    // Get updated comment count
    const { count: commentCount } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        author: comment.author
      },
      commentCount: commentCount || 0
    })

  } catch (error) {
    console.error('Comment API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'Missing commentId' }, { status: 400 })
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

    // Check if user owns this comment
    const { data: comment, error: commentError } = await supabase
      .from('post_comments')
      .select('id, post_id, profile_id')
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.profile_id !== profile.id) {
      return NextResponse.json({ error: 'Unauthorized to delete this comment' }, { status: 403 })
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
    }

    // Update comment count on post
    const { error: updateError } = await supabase.rpc('decrement_comment_count', {
      post_id: comment.post_id
    })

    if (updateError) {
      console.error('Error updating comment count:', updateError)
    }

    // Get updated comment count
    const { count: commentCount } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', comment.post_id)

    return NextResponse.json({
      success: true,
      commentCount: commentCount || 0
    })

  } catch (error) {
    console.error('Delete comment API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!postId) {
      return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    }

    // Get comments for the post
    const { data: comments, error: commentsError } = await supabase
      .from('post_comments')
      .select(`
        *,
        author:profiles!profile_id (
          id,
          username,
          display_name,
          profile_picture_url,
          is_pro
        ),
        replies:post_comments!parent_comment_id (
          *,
          author:profiles!profile_id (
            id,
            username,
            display_name,
            profile_picture_url,
            is_pro
          )
        )
      `)
      .eq('post_id', postId)
      .is('parent_comment_id', null) // Only top-level comments
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
      return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 })
    }

    // Get total count
    const { count } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    return NextResponse.json({
      comments: comments || [],
      totalCount: count || 0,
      hasMore: (offset + limit) < (count || 0)
    })

  } catch (error) {
    console.error('Comments fetch API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
