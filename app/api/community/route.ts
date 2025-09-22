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

// Helper function to get or create profile WITHOUT overwriting existing data
async function getOrCreateProfile(clerkId: string): Promise<string> {
  if (!clerkId) {
    throw new Error('ClerkId is required')
  }

  // Try to get existing profile first
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()
  
  if (existingProfile) {
    // Profile exists - return it WITHOUT updating to preserve user changes
    console.log(`[Community API] Found existing profile: ${existingProfile.id}`)
    return existingProfile.id
  }

  if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Database error in getOrCreateProfile:', {
      message: selectError.message,
      details: selectError.details,
      hint: selectError.hint,
      code: selectError.code,
      clerkId: clerkId
    })
    throw new Error(`Database error: ${selectError.message}`)
  }

  // Only create new profile if it doesn't exist - use minimal data
  console.log(`[Community API] Creating new profile for clerk_id: ${clerkId}`)
  
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      clerk_id: clerkId,
      username: `user_${clerkId.slice(-8)}`,
      display_name: 'User',
      profile_picture_url: null,
      is_public: true,
      data: {},
      created_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Error creating profile:', {
      message: insertError.message,
      details: insertError.details,
      hint: insertError.hint,
      code: insertError.code
    })
    throw new Error(`Failed to create profile: ${insertError.message}`)
  }

  console.log(`[Community API] Created new profile: ${newProfile.id}`)
  return newProfile.id
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')

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

    // Enhance posts with collection data if they are collection posts
    const enhancedPosts = await Promise.all(
      (posts || []).map(async (post: any) => {
        if (post.post_type === 'collection' && post.collection_id) {
          try {
            // Get collection data
            const { data: collection, error: collectionError } = await supabase
              .from('collections')
              .select('*')
              .eq('id', post.collection_id)
              .single()

            if (!collectionError && collection) {
              // Get real products in the collection from the collection owner's saved items
              const productIds = collection.item_ids || []
              if (productIds.length > 0) {
                try {
                  // Get the collection owner's profile to fetch their saved items
                  const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('clerk_id')
                    .eq('id', post.profile_id)
                    .single()
                  
                  if (!profileError && profile) {
                    // Fetch saved items for the collection owner
                    const { data: savedItems, error: savedItemsError } = await supabase
                      .from('saved_items')
                      .select('product')
                      .eq('profile_id', post.profile_id)
                    
                    if (!savedItemsError && savedItems) {
                      // Filter saved items to only include those in the collection
                      const collectionProducts = savedItems
                        .filter(item => productIds.includes(item.product.id))
                        .map(item => item.product)
                      
                      collection.products = collectionProducts
                    }
                  }
                } catch (error) {
                  console.error('Error fetching collection products:', error)
                  // Fallback to empty array if there's an error
                  collection.products = []
                }
              } else {
                collection.products = []
              }
              
              return {
                ...post,
                collection: {
                  id: collection.id,
                  name: collection.name,
                  color: collection.color,
                  description: collection.description,
                  customBanner: collection.custom_banner_url,
                  isPublic: collection.is_public,
                  itemCount: (collection.item_ids || []).length,
                  products: collection.products || []
                }
              }
            }
          } catch (error) {
            console.error('Error fetching collection data:', error)
          }
        }
        return post
      })
    )

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
