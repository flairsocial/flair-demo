import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
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

// Helper function to get or create profile
async function getOrCreateProfile(clerkId: string): Promise<string> {
  if (!clerkId) {
    throw new Error('ClerkId is required')
  }

  // Get user data from Clerk first
  let userData: any = null
  try {
    const client = await clerkClient()
    userData = await client.users.getUser(clerkId)
  } catch (error) {
    console.error('Error fetching user from Clerk:', error)
  }

  // Try to get existing profile
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()
  
  // Always update profile with latest Clerk data (whether it exists or not)
  const profileData = {
    clerk_id: clerkId,
    username: userData?.username || `user_${clerkId.slice(-8)}`,
    display_name: userData?.fullName || userData?.firstName || userData?.username || 'User',
    profile_picture_url: userData?.imageUrl || null,
    updated_at: new Date().toISOString()
  }

  if (existingProfile) {
    // Update existing profile with latest Clerk data
    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('clerk_id', clerkId)

    if (updateError) {
      console.error('Error updating profile:', updateError)
    } else {
      console.log('Profile updated with latest Clerk data')
    }
    
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

  // Create new profile with Clerk data
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      ...profileData,
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
          username,
          display_name,
          profile_picture_url
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
              // Get products in the collection
              const productIds = collection.item_ids || []
              if (productIds.length > 0) {
                // For now, we'll create mock product data
                // In a real app, you'd fetch from a products table
                const products = productIds.map((id: string, index: number) => ({
                  id,
                  title: `Product ${index + 1}`,
                  image: `/placeholder.svg?${index}`,
                  price: Math.floor(Math.random() * 200) + 50,
                  brand: 'Sample Brand'
                }))
                
                collection.products = products
              }
              
              return {
                ...post,
                collection: {
                  id: collection.id,
                  name: collection.name,
                  color: collection.color,
                  description: collection.description,
                  customBanner: collection.metadata?.customBanner,
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
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
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
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Get or create user profile
    const profileId = await getOrCreateProfile(userId)

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

    const { data: newPost, error } = await supabase
      .from('community_posts')
      .insert(postData)
      .select('id')
      .single()

    if (error) {
      console.error('Error creating community post:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        postData
      })
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }

    return NextResponse.json({ success: true, postId: newPost.id })
  } catch (error) {
    console.error('Community POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
