import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { 
  getCollections, 
  removeCollection,
  getSavedItems
} from "@/lib/database-service-v2"
import { downloadJsonFromStorage } from "@/lib/storage-helpers"

// Define a helper function to minimize item data and preserve image fields (support image_url and imageUrl)
function minimalItem(item: any) {
  const imageUrl = item.imageUrl || item.image_url || item.image || ''
  return {
    id: item.id,
    name: item.name || item.title || "Unknown",
    price: item.price || 0,
    // Provide both common field forms so front-end components can read either
    imageUrl,
    image_url: imageUrl
  };
}

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
        let collectionItems: Array<{ id: string; name: string; price: number; imageUrl: string }> = []
        
        if (userCollection.items_storage_url) {
          try {
            // Parse the storage URL to extract bucket and fileName
            const urlParts = userCollection.items_storage_url.split('/storage/v1/object/public/')
            if (urlParts.length === 2) {
              const pathParts = urlParts[1].split('/')
              const bucket = pathParts[0]
              const fileName = pathParts.slice(1).join('/')

              const itemIds = await downloadJsonFromStorage(bucket, fileName)
              if (Array.isArray(itemIds) && itemIds.length > 0) {
                // Fetch full product data from saved_items
                const savedItems = await getSavedItems(userId)
                collectionItems = itemIds.map(itemId => {
                  const fullItem = savedItems.find(item => item.id === itemId);
                  return fullItem ? minimalItem(fullItem) : null;
                }).filter((item): item is { id: string; name: string; price: number; imageUrl: string; image_url: string } => item !== null)
              }
            }
          } catch (error) {
            console.error(`Error fetching items for collection ${collectionId}:`, error)
            collectionItems = []
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
    let collectionItems: any[] = []
    
    if (collection.items_storage_url) {
      try {
        // Parse the storage URL to extract bucket and fileName
        const urlParts = collection.items_storage_url.split('/storage/v1/object/public/')
        if (urlParts.length === 2) {
          const pathParts = urlParts[1].split('/')
          const bucket = pathParts[0]
          const fileName = pathParts.slice(1).join('/')

          const itemIds = await downloadJsonFromStorage(bucket, fileName)
          if (Array.isArray(itemIds) && itemIds.length > 0) {
            // Fetch full product data from the collection owner's saved items
            const ownerSavedItems = await getSavedItems(collection.profile.clerk_id)
            collectionItems = itemIds.map(itemId => {
              const fullItem = ownerSavedItems.find(item => item.id === itemId);
              return fullItem ? minimalItem(fullItem) : null;
            }).filter((item): item is { id: string; name: string; price: number; imageUrl: string; image_url: string } => item !== null)
          }
        }
      } catch (error) {
        console.error(`Error fetching items for public collection ${collectionId}:`, error)
        collectionItems = []
      }
    }

    console.log(`[Collection API] Found public collection with ${collectionItems.length} items`)

    return NextResponse.json({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      itemIds: collection.item_ids || [], // Keep for backward compatibility
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
