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
            itemIds: []
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
