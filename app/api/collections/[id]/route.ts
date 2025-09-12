import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { 
  getCollections, 
  removeCollection,
  getSavedItems
} from "@/lib/database-service"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const collectionId = params.id
    
    console.log(`[Collection API] GET request - User ID: ${userId}`)
    console.log(`[Collection API] Collection ID: ${collectionId}`)

    // Get user's collections
    const collections = await getCollections(userId)
    const collection = collections.find(col => col.id === collectionId)
    
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Get saved items for this user
    const savedItems = await getSavedItems(userId)
    
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
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const collectionId = params.id
    
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
