import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateProfile, supabase } from '@/lib/community-helpers'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids) ? body.ids : []
    if (ids.length === 0) return NextResponse.json([], { status: 200 })

    // Fetch posts by IDs
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!profile_id (
          id,
          clerk_id,
          username,
          display_name,
          profile_picture_url,
          is_pro
        )
      `)
      .in('id', ids)

    if (error) {
      console.error('Error fetching posts by ids:', error)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    const currentUserProfileId = await getOrCreateProfile(userId)

    const postIds = posts?.map((p: any) => p.id) || []
    let likesMap = new Map()
    if (postIds.length > 0) {
      const { data: allLikes } = await supabase
        .from('post_likes')
        .select('post_id, profile_id')
        .in('post_id', postIds)
      allLikes?.forEach((like: any) => {
        if (!likesMap.has(like.post_id)) likesMap.set(like.post_id, { count: 0, userLiked: false })
        likesMap.get(like.post_id).count++
        if (like.profile_id === currentUserProfileId) likesMap.get(like.post_id).userLiked = true
      })
    }

    // Build collections map
    const collectionIds = [...new Set(posts?.filter((p: any) => p.post_type === 'collection' && p.collection_id).map((p: any) => p.collection_id) || [])]
    let collectionsMap = new Map()
    if (collectionIds.length > 0) {
      const { data: collections } = await supabase
        .from('collections')
        .select('id, name, color, description, custom_banner_url, is_public, item_count')
        .in('id', collectionIds)
      collections?.forEach((col: any) => collectionsMap.set(col.id, col))
    }

    const enhanced: any[] = []
    for (const post of posts || []) {
      const likesData = likesMap.get(post.id) || { count: 0, userLiked: false }
      const p: any = {
        id: post.id,
        title: post.title,
        description: post.description,
        image_url: (typeof post.image_url === 'string' && post.image_url.length < 500 && !post.image_url.includes('data:image')) ? post.image_url : null,
        link_url: post.link_url,
        post_type: post.post_type,
        collection_id: post.collection_id,
        created_at: post.created_at,
        updated_at: post.updated_at,
        likes: likesData.count,
        userLiked: likesData.userLiked,
        author: post.author ? {
          id: post.author.id,
          username: post.author.username,
          display_name: post.author.display_name,
          profile_picture_url: (typeof post.author.profile_picture_url === 'string' && post.author.profile_picture_url.length < 500 && !post.author.profile_picture_url.includes('data:image')) ? post.author.profile_picture_url : null,
          is_pro: post.author.is_pro
        } : null
      }

      if (post.post_type === 'collection' && post.collection_id) {
        const col = collectionsMap.get(post.collection_id)
        if (col) p.collection = { id: col.id, name: col.name, color: col.color, description: col.description, customBanner: col.custom_banner_url, isPublic: col.is_public, itemCount: col.item_count }
      }

      enhanced.push(p)
    }

    return NextResponse.json(enhanced)
  } catch (err) {
    console.error('Batch posts endpoint error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
