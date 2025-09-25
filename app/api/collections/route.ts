import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from '@supabase/supabase-js'
import {
  getCollections,
  addCollection,
  removeCollection,
  addItemToCollection,
  removeItemFromCollection,
  updateCollection,
  removePostForCollection,
  getOrCreateProfile
} from "@/lib/database-service-v2"
import { getCachedUserCollections, invalidateUserCache } from "@/lib/cache/user-cache"
import { downloadJsonFromStorage } from "@/lib/storage-helpers"
import type { Collection } from "@/lib/database-service-v2"

export async function GET() {
  try {
    const { userId } = await auth()

    // Require authentication for database access
    if (!userId) {
      console.log('[Collections API] No user ID provided')
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    console.log(`[Collections API] GET request - User ID: ${userId}`)

    // Get user's collections from cache (with database fallback)
    const collections = await getCachedUserCollections(userId)

    // Ensure we have an array
    const collectionsArray = Array.isArray(collections) ? collections : []

    // Collections are returned as cached minimal previews by getCachedUserCollections
    // which avoids downloading items and does chunked caching. We assume it returns
    // items preview already populated. Use the cached/minimal result directly.
    const minimalCollections = collectionsArray

    // Add cache prevention headers
    const response = NextResponse.json(minimalCollections)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error("[Collections API] Error fetching collections:", error)
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const { action, collection, itemId, collectionId } = await request.json()
    
    console.log(`[Collections API] POST request - User ID: ${userId}`)
    console.log(`[Collections API] Action: ${action}`)

    switch (action) {
      case 'create':
        if (collection) {
          const newCollection: Collection = {
            id: `col-${Date.now()}`,
            name: collection.name,
            color: collection.color || 'bg-blue-500',
            createdAt: new Date().toISOString(),
            itemIds: [],
            description: collection.description || undefined,
            customBanner: collection.customBanner || undefined,
            isPublic: collection.isPublic || false
          }
          await addCollection(userId, newCollection)
          
          // If the collection is public, create a community post
          if (newCollection.isPublic) {
            try {
              // Import the createPostForCollection function
              const { createPostForCollection } = await import("@/lib/database-service-v2")
              await createPostForCollection(userId, newCollection)
            } catch (error) {
              console.error('Error creating community post for collection:', error)
              // Don't fail the collection creation if community post fails
            }
          }
          
          return NextResponse.json({ success: true, collection: newCollection })
        }
        break

      case 'delete':
        if (collectionId) {
          await removeCollection(userId, collectionId)
          return NextResponse.json({ success: true, message: 'Collection deleted successfully' })
        }
        break

      case 'addItem':
        if (itemId && collectionId) {
          await addItemToCollection(userId, itemId, collectionId)
          return NextResponse.json({ success: true, message: 'Item added to collection' })
        }
        break

      case 'removeItem':
        if (itemId && collectionId) {
          await removeItemFromCollection(userId, itemId, collectionId)
          return NextResponse.json({ success: true, message: 'Item removed from collection' })
        }
        break

      case 'shareToCommunity':
        if (collectionId) {
          // Get the collection details
          const collections = await getCollections(userId)
          const collection = collections.find(col => col.id === collectionId)

          if (collection) {
            await addCollection(userId, collection) // This will create/update the community post
            return NextResponse.json({ success: true, message: 'Collection shared to community' })
          }
        }
        break

      case 'removeFromCommunity':
        if (collectionId) {
          await removePostForCollection(userId, collectionId)
          return NextResponse.json({ success: true, message: 'Collection removed from community' })
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  } catch (error) {
    console.error("[Collections API] Error:", error)
    return NextResponse.json({ error: "Failed to update collections" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth()
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const { id, name, description, customBanner, isPublic } = await request.json()
    
    console.log(`[Collections API] PUT request - User ID: ${userId}`)
    console.log(`[Collections API] Updating collection: ${id}`)

    // Use the new updateCollection function
    const updates: Partial<Collection> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (customBanner !== undefined) updates.customBanner = customBanner
    if (isPublic !== undefined) updates.isPublic = isPublic

    await updateCollection(userId, id, updates)

    // If collection was updated, update community posts that reference this collection
    if (customBanner !== undefined || name !== undefined || description !== undefined) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        })

        // Update community posts that reference this collection
        await supabase
          .from('community_posts')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('collection_id', id)
          .eq('post_type', 'collection')

        console.log(`✅ Updated community posts for collection: ${id}`)
      } catch (error) {
        console.error('Error updating community posts:', error)
      }
    }

    // Get the updated collection to return
    const collections = await getCollections(userId)
    const updatedCollection = collections.find(col => col.id === id)
    
    if (!updatedCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // If making public, create community post
    if (isPublic === true && updatedCollection.isPublic) {
      try {
        const { createPostForCollection } = await import("@/lib/database-service-v2")
        await createPostForCollection(userId, updatedCollection)
      } catch (error) {
        console.error('Error creating community post for collection:', error)
        // Don't fail the update if community post fails
      }
    }

    return NextResponse.json(updatedCollection)
  } catch (error) {
    console.error("[Collections API] Error updating collection:", error)
    return NextResponse.json({ error: "Failed to update collection" }, { status: 500 })
  }
}
