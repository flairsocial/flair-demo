import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { CacheManager, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { uploadBase64ToStorage } from '../../../lib/image-sanitizer'
import { downloadJsonFromStorage } from '@/lib/storage-helpers'

import { getOrCreateProfile, supabase } from '@/lib/community-helpers'

// Helper function to add product data to posts (for cache hits)
// NOTE: For community feed, we don't add collection products - only metadata
async function addProductDataToPosts(posts: any[], userId: string): Promise<any[]> {
  // Since we removed products from the community feed entirely,
  // this function now just returns the posts as-is
  return posts
}

// Helper function to create minimal cacheable version of posts
function createCacheablePosts(posts: any[]): any[] {
  // Ultra-ultra-minimal feed shape: remove heavy fields to keep cache tiny
  return posts.map(post => {
    const minimal: any = {
      id: post.id,
      t: typeof post.title === 'string' ? post.title.substring(0, 40) : null, // very short title
      d: typeof post.description === 'string' ? post.description.substring(0, 80) : null, // very short description
      type: post.post_type,
      a: post.author ? { id: post.author.id, u: post.author.username, hasPicture: !!(typeof post.author.profile_picture_url === 'string' && !post.author.profile_picture_url.startsWith('data:image')) } : null,
      c: post.collection ? { id: post.collection.id } : null,
      created_at: post.created_at || null,
      image_url: post.image_url || null,
      like_count: post.like_count || post.likes || 0,
      comment_count: post.comment_count || 0,
      save_count: post.save_count || 0
    }
    return minimal
  })
}

// Helper function to reconstruct full posts from cached minimal version
async function reconstructPostsFromCache(cachedPosts: any[], userId: string): Promise<any[]> {
  // Get fresh author data and other dynamic data
  const authorIds = [...new Set(cachedPosts.map((p: any) => p.a?.id || p.a?.id).filter(Boolean))]

  let authorsMap = new Map()
  if (authorIds.length > 0) {
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, clerk_id, username, display_name, profile_picture_url, is_pro')
      .in('id', authorIds)

    authors?.forEach((author: any) => {
      authorsMap.set(author.id, author)
    })
  }

  // Reconstruct posts with fresh data; cached minimal shape uses short keys
  return cachedPosts.map((mp: any) => {
    const post: any = {
      id: mp.id,
      title: mp.t || null,
      description: mp.d || null,
      post_type: mp.type || 'text',
      created_at: mp.created_at || null,
      updated_at: mp.updated_at || null,
      image_url: mp.image_url || null,
      like_count: mp.like_count || mp.likes || 0,
      comment_count: mp.comment_count || 0,
      save_count: mp.save_count || 0,
      likes: mp.like_count || mp.likes || 0,
      userLiked: false,
      author: null,
      collection: null
    }

    if (mp.a?.id && authorsMap.has(mp.a.id)) {
      const a = authorsMap.get(mp.a.id)
      post.author = {
        id: a.id,
        username: a.username,
        display_name: a.display_name,
        profile_picture_url: (typeof a.profile_picture_url === 'string' && !a.profile_picture_url.startsWith('data:image')) ? a.profile_picture_url : null,
        is_pro: a.is_pro
      }
    } else if (mp.a) {
      post.author = {
        id: mp.a.id,
        username: mp.a.u,
        profile_picture_url: null
      }
    }

    // Collections are not fully cached here; collection id may be present
    if (mp.c?.id) {
      post.collection = { id: mp.c.id }
    }

    return post
  })
}

// Helper function to get or create profile WITHOUT overwriting existing data
// getOrCreateProfile and supabase imported from shared helper

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const url = new URL(request.url)
  // Enforce a hard backend limit to guarantee cacheability
  const MAX_FEED_LIMIT = 20
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), MAX_FEED_LIMIT)
  const offset = parseInt(url.searchParams.get('offset') || '0')

  // Create cache key for this request
  const cacheKey = `community:feed:${userId}:${limit}:${offset}`

  console.log('[Community API] Checking cache for community feed')
  // ENABLE CACHING: Try to get from cache first
  const cached = await CacheManager.get<any>(cacheKey)
  if (cached) {
    console.log('[Community API] Cache hit for community feed — reconstructing posts for client')
    try {
      // cached is a minimal shape produced by createCacheablePosts
      // We reconstruct a usable post list by fetching authors and collection metadata.
      const minimalPosts: any[] = Array.isArray(cached) ? cached : []
      // Gather author IDs and collection IDs referenced in the minimal posts
      const authorIds = [...new Set(minimalPosts.map((p: any) => p.a?.id).filter(Boolean))]
      const collectionIds = [...new Set(minimalPosts.map((p: any) => p.c?.id).filter(Boolean))]

      // Fetch authors from Supabase in one batch
      let authorsMap = new Map<string, any>()
      if (authorIds.length > 0) {
        const { data: authors } = await supabase
          .from('profiles')
          .select('id, clerk_id, username, display_name, profile_picture_url, is_pro')
          .in('id', authorIds)
        authors?.forEach((a: any) => authorsMap.set(a.id, a))
      }

      // Fetch collections metadata in one batch (including banner URL)
      let collectionsMap = new Map<string, any>()
      if (collectionIds.length > 0) {
        const { data: cols } = await supabase
          .from('collections')
          .select('id, name, color, description, custom_banner_url, is_public, item_count')
          .in('id', collectionIds)
        cols?.forEach((c: any) => collectionsMap.set(c.id, c))
      }

      // Rehydrate minimal posts into client-usable posts
      const rehydrated = minimalPosts.map((mp: any) => {
        const post: any = {
          id: mp.id,
          title: mp.t || null,
          description: mp.d || null,
          post_type: mp.type || 'text',
          created_at: mp.created_at || null,
          updated_at: mp.updated_at || null,
          likes: 0,
          userLiked: false,
          author: null,
          collection: null
        }

        if (mp.a?.id && authorsMap.has(mp.a.id)) {
          const a = authorsMap.get(mp.a.id)
          post.author = {
            id: a.id,
            username: a.username,
            display_name: a.display_name,
            profile_picture_url: (typeof a.profile_picture_url === 'string' && !a.profile_picture_url.startsWith('data:image')) ? a.profile_picture_url : null,
            is_pro: a.is_pro
          }
        } else if (mp.a) {
          // Fallback to whatever minimal author info exists
          post.author = {
            id: mp.a.id,
            username: mp.a.u,
            profile_picture_url: null
          }
        }

        if (mp.c?.id && collectionsMap.has(mp.c.id)) {
          const c = collectionsMap.get(mp.c.id)
          post.collection = {
            id: c.id,
            name: c.name,
            color: c.color,
            description: c.description,
            customBanner: (typeof c.custom_banner_url === 'string' && !c.custom_banner_url.startsWith('data:image')) ? c.custom_banner_url : null,
            isPublic: c.is_public,
            itemCount: c.item_count || 0
          }
        }

        // preserve image_url if present in the minimal post (came from original post)
        if (mp.image_url) post.image_url = mp.image_url

        return post
      })

      return NextResponse.json(rehydrated)
    } catch (reconstructError) {
      console.error('[Community API] Error reconstructing cached feed:', reconstructError)
      // If reconstruction fails, fallback to returning the cached minimal feed to avoid blocking.
      return NextResponse.json(cached)
    }
  }

  console.log('[Community API] Cache miss, fetching from database')

    // Get community posts with author info
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
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error getting community feed:', error)
      return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 })
    }

    // Get current user profile for like status
    const currentUserProfileId = await getOrCreateProfile(userId)

    // OPTIMIZED: Batch fetch all related data (eliminates N+1 queries)
    const enhancedPosts = []
    
    // Get all unique collection IDs in one batch
    const collectionIds = [...new Set(
      posts?.filter((p: any) => p.post_type === 'collection' && p.collection_id)
           .map((p: any) => p.collection_id) || []
    )]
    
    // Get all post IDs for likes lookup
    const postIds = posts?.map((p: any) => p.id) || []
    
    // Batch fetch likes for all posts
    let likesMap = new Map()
    if (postIds.length > 0) {
      const { data: allLikes } = await supabase
        .from('post_likes')
        .select('post_id, profile_id')
        .in('post_id', postIds)
      
      // Count likes and check if current user liked each post
      allLikes?.forEach((like: any) => {
        if (!likesMap.has(like.post_id)) {
          likesMap.set(like.post_id, { count: 0, userLiked: false })
        }
        likesMap.get(like.post_id).count++
        if (like.profile_id === currentUserProfileId) {
          likesMap.get(like.post_id).userLiked = true
        }
      })
    }
    
    // Batch fetch comment counts for all posts
    let commentsMap = new Map()
    if (postIds.length > 0) {
      const { data: allComments } = await supabase
        .from('post_comments')
        .select('post_id')
        .in('post_id', postIds)

      allComments?.forEach((c: any) => {
        if (!commentsMap.has(c.post_id)) commentsMap.set(c.post_id, 0)
        commentsMap.set(c.post_id, commentsMap.get(c.post_id) + 1)
      })
    }

    // Batch fetch save counts for all posts
    let savesMap = new Map()
    if (postIds.length > 0) {
      const { data: allSaves } = await supabase
        .from('post_saves')
        .select('post_id')
        .in('post_id', postIds)

      allSaves?.forEach((s: any) => {
        if (!savesMap.has(s.post_id)) savesMap.set(s.post_id, 0)
        savesMap.set(s.post_id, savesMap.get(s.post_id) + 1)
      })
    }
    
    // Batch fetch all collections at once (MINIMAL: only metadata for feed)
    let collectionsMap = new Map()
    if (collectionIds.length > 0) {
      const { data: collections } = await supabase
        .from('collections')
        .select('id, name, color, description, custom_banner_url, is_public, item_count') // Only metadata, no storage URLs for feed
        .in('id', collectionIds)
      
      collections?.forEach((col: any) => {
        collectionsMap.set(col.id, col)
      })
    }
    
    // NOTE: For community feed, we don't fetch collection items - only metadata
    // Items will be fetched on-demand when viewing individual collections
    
    // Now enhance posts with pre-fetched data (no additional queries!)
    for (const post of posts || []) {
      const likesData = likesMap.get(post.id) || { count: 0, userLiked: false };

      // Only include minimal fields for the feed
      const minimalPost: any = {
        id: post.id,
        title: post.title,
        description: post.description,
        image_url: (typeof post.image_url === 'string' && post.image_url.length < 500 && !post.image_url.includes('data:image')) ? post.image_url : null,
        link_url: post.link_url,
        post_type: post.post_type,
        collection_id: post.collection_id,
        created_at: post.created_at,
        updated_at: post.updated_at,
        // Standard count fields expected by the UI
        like_count: likesData.count,
        likes: likesData.count, // keep alias for backward-compat
        userLiked: likesData.userLiked,
        comment_count: commentsMap.get(post.id) || 0,
        save_count: savesMap.get(post.id) || 0,
        author: post.author ? {
          id: post.author.id,
          username: post.author.username,
          display_name: post.author.display_name,
          profile_picture_url: (typeof post.author.profile_picture_url === 'string' && post.author.profile_picture_url.length < 500 && !post.author.profile_picture_url.includes('data:image')) ? post.author.profile_picture_url : null,
          is_pro: post.author.is_pro
        } : null
      };

      if (post.post_type === 'collection' && post.collection_id) {
        const collection = collectionsMap.get(post.collection_id);
        if (collection) {
          // For community feed, only include basic collection metadata
          // Items will be fetched on-demand when viewing the collection
          minimalPost.collection = {
            id: collection.id,
            name: collection.name,
            color: collection.color,
            description: collection.description,
            customBanner: collection.custom_banner_url,
            isPublic: collection.is_public,
            itemCount: collection.item_count || 0
            // NOTE: No 'products' array - fetch items separately when needed
          };
        }
      }
      enhancedPosts.push(minimalPost);
    }

  // ENABLE CACHING: Store result in cache
  try {
    // Create minimal version for caching to reduce size
    const cacheablePosts = createCacheablePosts(enhancedPosts)
    // Sanitize nested collection banners to ensure no base64 data remains
    for (const p of cacheablePosts) {
      if (p.collection && typeof p.collection.customBanner === 'string') {
        if (p.collection.customBanner.startsWith('data:image')) {
          p.collection.customBanner = null
        }
      }
    }

    // Log the serialized size in bytes before caching for diagnostics
    try {
      const serializedForLog = JSON.stringify(cacheablePosts)
      const bytes = Buffer.byteLength(serializedForLog, 'utf8')
      console.log(`[Community API] Cacheable payload size: ${(bytes / 1024).toFixed(1)}KB`)
    } catch (e) {
      // ignore logging errors
    }

    await CacheManager.set(cacheKey, cacheablePosts, CACHE_TTL.COMMUNITY_POSTS)
    console.log('[Community API] Stored community feed in cache')
  } catch (cacheError) {
    console.warn('[Community API] Failed to cache community feed:', cacheError)
  }

  return NextResponse.json(enhancedPosts)
  } catch (error) {
    console.error('Community GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Community POST request received')
    
    const { userId } = await auth()
    console.log('👤 User ID from auth:', userId)
    
    if (!userId) {
      console.log('❌ No user ID - unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Request body:', body)
    
  const { action, postId, title, description, imageUrl, linkUrl, postType, collectionId } = body

    // Handle post deletion
    if (action === 'delete') {
      if (!postId) {
        return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
      }

      // Get user profile to verify ownership
      const profileId = await getOrCreateProfile(userId)

      // Delete the post (only if user owns it)
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('profile_id', profileId) // Only allow deletion of own posts

      if (error) {
        console.error('Error deleting community post:', error)
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // Handle post creation (existing code)
    if (!title?.trim()) {
      console.log('❌ No title provided')
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    console.log('🔄 Getting or creating profile...')
    // Get or create user profile
    const profileId = await getOrCreateProfile(userId)
    console.log('👤 Profile ID:', profileId)

    console.log('📝 Creating post data...')
    // Create the community post
    // Sanitize imageUrl: if it looks like a data:image base64 blob, upload and replace with storage URL
    let resolvedImageUrl = imageUrl?.trim() || null
    try {
      if (typeof resolvedImageUrl === 'string' && resolvedImageUrl.includes('data:image')) {
        console.log('[Community API] Detected base64 image in imageUrl; uploading to storage...')
        const uploaded = await uploadBase64ToStorage(resolvedImageUrl, 'community-images')
        if (uploaded) {
          resolvedImageUrl = uploaded
          console.log('[Community API] Uploaded image and will store URL instead of base64')
        } else {
          console.warn('[Community API] Upload returned no URL; dropping image from post')
          resolvedImageUrl = null
        }
      }
    } catch (err) {
      console.error('[Community API] Error while uploading imageUrl base64:', err)
      resolvedImageUrl = null
    }

    const postData = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      profile_id: profileId,
      title: title.trim(),
      description: description?.trim() || null,
      image_url: resolvedImageUrl,
      link_url: linkUrl?.trim() || null,
      post_type: postType || 'text',
      collection_id: collectionId || null,
      is_public: true,
      like_count: 0,
      comment_count: 0,
      save_count: 0,
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('💾 Inserting post data:', postData)

    const { data: newPost, error } = await supabase
      .from('community_posts')
      .insert(postData)
      .select('id')
      .single()

    if (error) {
      console.error('❌ Error creating community post:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        postData
      })
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    console.log('✅ Post created successfully:', newPost.id)
    return NextResponse.json({ success: true, postId: newPost.id })
  } catch (error) {
    console.error('Community POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
