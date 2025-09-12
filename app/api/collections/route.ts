import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { 
  getCollections, 
  addCollection, 
  removeCollection, 
  addItemToCollection, 
  removeItemFromCollection,
  updateCollection 
} from "@/lib/database-service"
import type { Collection } from "@/lib/database-service"

export async function GET() {
  try {
    const { userId } = await auth()
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    // Get user's collections from storage
    const collections = await getCollections(userId)
    
    console.log(`[Collections API] GET request - User ID: ${userId}`)
    console.log(`[Collections API] Found ${collections.length} collections`)

    // Add cache prevention headers
    const response = NextResponse.json(collections)
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
              const { createPostForCollection } = await import("@/lib/database-service")
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

    // Get the updated collection to return
    const collections = await getCollections(userId)
    const updatedCollection = collections.find(col => col.id === id)
    
    if (!updatedCollection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // If making public, create community post
    if (isPublic === true && updatedCollection.isPublic) {
      try {
        const { createPostForCollection } = await import("@/lib/database-service")
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
