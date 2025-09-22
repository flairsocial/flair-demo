import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { 
  getCollections, 
  removeCollection,
  getSavedItems
} from "@/lib/database-service-v2"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id: collectionId } = await params
    
    console.log(`[Collection API] GET request - User ID: ${userId}`)
    console.log(`[Collection API] Collection ID: ${collectionId}`)

    // First try to get collection from current user's collections
    if (userId) {
      const collections = await getCollections(userId)
      const userCollection = collections.find(col => col.id === collectionId)
      
      if (userCollection) {
        // User owns this collection, return full data with items
        // Get items directly from database to ensure consistency
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })

        // Get the user's profile ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('clerk_id', userId)
          .single()

        let collectionItems = []
        if (profile && userCollection.itemIds && userCollection.itemIds.length > 0) {
          const { data: savedItems, error: itemsError } = await supabase
            .from('saved_items')
            .select('product_id, product_data')
            .eq('profile_id', profile.id)
            .in('product_id', userCollection.itemIds)

          if (!itemsError && savedItems) {
            collectionItems = savedItems.map(item => ({
              ...item.product_data,
              saved: true
            }))
          }
        }

        console.log(`[Collection API] Found user's collection with ${collectionItems.length} items`)

        return NextResponse.json({
          ...userCollection,
          items: collectionItems,
          created_at: userCollection.createdAt,
          is_public: userCollection.isPublic
        })
      }
    }

    // If not found in user's collections, try to find it as a public collection
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get public collection
    const { data: collection, error } = await supabase
      .from('collections')
      .select(`
        *,
        profile:profiles!profile_id (
          clerk_id,
          username,
          display_name
        )
      `)
      .eq('id', collectionId)
      .eq('is_public', true)
      .single()

    if (error || !collection) {
      return NextResponse.json({ error: 'Collection not found or not public' }, { status: 404 })
    }

    // Get the collection owner's saved items that are in this collection
    const { data: savedItems, error: itemsError } = await supabase
      .from('saved_items')
      .select('product_id, product_data')
      .eq('profile_id', collection.profile_id)
      .in('product_id', collection.item_ids || [])

    let collectionItems = []
    if (!itemsError && savedItems) {
      collectionItems = savedItems.map(item => item.product_data)
    }

    console.log(`[Collection API] Found public collection with ${collectionItems.length} items`)

    return NextResponse.json({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      itemIds: collection.item_ids || [],
      items: collectionItems,
      created_at: collection.created_at,
      is_public: collection.is_public,
      customBanner: collection.custom_banner_url,
      owner: collection.profile
    })
  } catch (error) {
    console.error("[Collection API] Error fetching collection:", error)
    return NextResponse.json({ error: "Failed to fetch collection" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const { id: collectionId } = await params
    
    console.log(`[Collection API] DELETE request - User ID: ${userId}`)
    console.log(`[Collection API] Deleting collection: ${collectionId}`)

    // Remove the collection
    await removeCollection(userId, collectionId)

    return NextResponse.json({ success: true, message: 'Collection deleted' })
  } catch (error) {
    console.error("[Collection API] Error deleting collection:", error)
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 })
  }
}
