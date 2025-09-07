import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { 
  getCollections, 
  addCollection, 
  removeCollection, 
  addItemToCollection, 
  removeItemFromCollection 
} from "@/lib/profile-storage"
import type { Collection } from "@/lib/profile-storage"

export async function GET() {
  try {
    const { userId } = await auth()
    
    // Get user's collections from storage
    const collections = getCollections(userId || undefined)
    
    console.log(`[Collections API] GET request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Collections API] Found ${collections.length} collections`)

    return NextResponse.json(collections)
  } catch (error) {
    console.error("[Collections API] Error fetching collections:", error)
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    const { action, collection, itemId, collectionId } = await request.json()
    
    console.log(`[Collections API] POST request - User ID: ${userId || 'anonymous'}`)
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
            customBanner: collection.customBanner || undefined
          }
          addCollection(newCollection, userId || undefined)
          return NextResponse.json({ success: true, collection: newCollection })
        }
        break

      case 'delete':
        if (collectionId) {
          removeCollection(collectionId, userId || undefined)
          return NextResponse.json({ success: true, message: 'Collection deleted successfully' })
        }
        break

      case 'addItem':
        if (itemId && collectionId) {
          addItemToCollection(itemId, collectionId, userId || undefined)
          return NextResponse.json({ success: true, message: 'Item added to collection' })
        }
        break

      case 'removeItem':
        if (itemId && collectionId) {
          removeItemFromCollection(itemId, collectionId, userId || undefined)
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
    const { id, name, description, customBanner } = await request.json()
    
    console.log(`[Collections API] PUT request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Collections API] Updating collection: ${id}`)

    // Get current collections
    const collections = getCollections(userId || undefined)
    const collectionIndex = collections.findIndex(col => col.id === id)
    
    if (collectionIndex === -1) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Update the collection
    const updatedCollection = {
      ...collections[collectionIndex],
      name: name || collections[collectionIndex].name,
      description: description !== undefined ? description : collections[collectionIndex].description,
      customBanner: customBanner !== undefined ? customBanner : collections[collectionIndex].customBanner
    }

    collections[collectionIndex] = updatedCollection

    // Save updated collections
    // Note: This is a simplified approach. In a real app, you'd have a proper update function
    removeCollection(id, userId || undefined)
    addCollection(updatedCollection, userId || undefined)

    return NextResponse.json(updatedCollection)
  } catch (error) {
    console.error("[Collections API] Error updating collection:", error)
    return NextResponse.json({ error: "Failed to update collection" }, { status: 500 })
  }
}
