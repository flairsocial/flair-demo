// OPTIMIZED API ROUTES - PRODUCTION PERFORMANCE
// This replaces the existing API routes with high-performance versions

// /api/community/route.ts - OPTIMIZED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getCommunityFeed, getOrCreateProfile } from '@/lib/database-service-optimized'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50) // Limit max results
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Use optimized function that eliminates N+1 queries
    const posts = await getCommunityFeed(limit, offset)

    // Add proper cache headers
    const response = NextResponse.json(posts)
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    
    return response
  } catch (error) {
    console.error('Community GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST endpoint remains mostly the same but with better validation
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, postId, title, description, imageUrl, linkUrl, postType, collectionId } = body

    // Rate limiting check (implement in production)
    // if (await isRateLimited(userId)) {
    //   return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    // }

    if (action === 'delete') {
      if (!postId) {
        return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
      }

      const profileId = await getOrCreateProfile(userId)
      const supabase = getSupabaseClient()

      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('profile_id', profileId)

      if (error) {
        console.error('Error deleting post:', error)
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const profileId = await getOrCreateProfile(userId)
    const supabase = getSupabaseClient()

    const postData = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      profile_id: profileId,
      title: title.trim(),
      description: description?.trim() || null,
      image_url: imageUrl?.trim() || null,
      link_url: linkUrl?.trim() || null,
      post_type: postType || 'text',
      collection_id: collectionId || null,
      is_public: true,
      like_count: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: newPost, error } = await supabase
      .from('community_posts')
      .insert(postData)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    return NextResponse.json({ success: true, postId: newPost.id })
  } catch (error) {
    console.error('Community POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// BATCH OPERATIONS API ENDPOINT
// ============================================================================

// /api/collections/batch/route.ts - NEW ENDPOINT
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, itemIds, collectionId } = await request.json()

    if (action === 'addItems' && itemIds?.length && collectionId) {
      const profileId = await getOrCreateProfile(userId)
      const supabase = getSupabaseClient()

      // Get current collection
      const { data: collection, error: fetchError } = await supabase
        .from('collections')
        .select('item_ids')
        .eq('id', collectionId)
        .eq('profile_id', profileId)
        .single()

      if (fetchError || !collection) {
        return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
      }

      // Merge new items with existing ones (deduplicate)
      const currentItemIds = collection.item_ids || []
      const newItemIds = [...new Set([...currentItemIds, ...itemIds])]

      // Single update query
      const { error: updateError } = await supabase
        .from('collections')
        .update({ 
          item_ids: newItemIds,
          item_count: newItemIds.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId)
        .eq('profile_id', profileId)

      if (updateError) {
        console.error('Batch update error:', updateError)
        return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        addedCount: newItemIds.length - currentItemIds.length 
      })
    }

    return NextResponse.json({ error: 'Invalid batch operation' }, { status: 400 })
  } catch (error) {
    console.error('Batch operation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// OPTIMIZED COLLECTIONS API
// ============================================================================

// /api/collections/route.ts - OPTIMIZED VERSION
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Use optimized function
    const collections = await getCollections(userId)
    
    // Add cache headers for collections (they don't change often)
    const response = NextResponse.json(collections)
    response.headers.set('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=240')
    
    return response
  } catch (error) {
    console.error('Collections GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { action, collection, itemId, collectionId } = await request.json()

    // Input validation
    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    switch (action) {
      case 'create':
        if (!collection?.name?.trim()) {
          return NextResponse.json({ error: 'Collection name is required' }, { status: 400 })
        }

        const newCollection = {
          id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: collection.name.trim(),
          color: collection.color || 'bg-blue-500',
          createdAt: new Date().toISOString(),
          itemIds: [],
          description: collection.description?.trim() || undefined,
          customBanner: collection.customBanner || undefined,
          isPublic: collection.isPublic || false
        }

        await addCollection(userId, newCollection)
        return NextResponse.json({ success: true, collection: newCollection })

      case 'addItem':
        if (!itemId || !collectionId) {
          return NextResponse.json({ error: 'Item ID and Collection ID are required' }, { status: 400 })
        }
        
        await addItemToCollection(userId, itemId, collectionId)
        return NextResponse.json({ success: true })

      case 'removeItem':
        if (!itemId || !collectionId) {
          return NextResponse.json({ error: 'Item ID and Collection ID are required' }, { status: 400 })
        }
        
        await removeItemFromCollection(userId, itemId, collectionId)
        return NextResponse.json({ success: true })

      case 'delete':
        if (!collectionId) {
          return NextResponse.json({ error: 'Collection ID is required' }, { status: 400 })
        }
        
        await removeCollection(userId, collectionId)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Collections POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}