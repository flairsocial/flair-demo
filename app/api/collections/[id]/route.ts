import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { 
  getCollections, 
  removeCollection,
  getSavedItems
} from "@/lib/profile-storage"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    const collectionId = params.id
    
    console.log(`[Collection API] GET request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Collection API] Collection ID: ${collectionId}`)

    // Get user's collections
    const collections = getCollections(userId || undefined)
    const collection = collections.find(col => col.id === collectionId)
    
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Get saved items for this user
    const savedItems = getSavedItems(userId || undefined)
    
    // Filter items that belong to this collection
    const collectionItems = savedItems.filter(item => 
      collection.itemIds.includes(item.id)
    )

    console.log(`[Collection API] Found ${collectionItems.length} items in collection`)

    return NextResponse.json(collectionItems)
  } catch (error) {
    console.error("[Collection API] Error fetching collection items:", error)
    return NextResponse.json({ error: "Failed to fetch collection items" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    const collectionId = params.id
    
    console.log(`[Collection API] DELETE request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Collection API] Deleting collection: ${collectionId}`)

    // Remove the collection
    removeCollection(collectionId, userId || undefined)

    return NextResponse.json({ success: true, message: 'Collection deleted' })
  } catch (error) {
    console.error("[Collection API] Error deleting collection:", error)
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 })
  }
}
