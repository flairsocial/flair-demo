import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { databaseService } from "@/lib/database-service"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    const { id: collectionId } = await params // Await params to fix Next.js warning
    
    console.log(`[Collection API] GET request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Collection API] Collection ID: ${collectionId}`)

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Ensure user exists in database with Clerk data
    if (user) {
      await databaseService.ensureUserExists(userId, {
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        imageUrl: user.imageUrl,
      })
    }

    // Get user's collections from database
    const collections = await databaseService.getCollections(userId)
    const collection = collections.find(col => col.id === collectionId)
    
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Get saved items that belong to this collection
    const savedItems = await databaseService.getSavedItems(userId)
    const collectionItems = savedItems.filter(item => 
      collection.itemIds.includes(item.id)
    )

    console.log(`[Collection API] Found ${collectionItems.length} items in collection`)

    return NextResponse.json(collectionItems, {
      headers: {
        'X-Source': 'database'
      }
    })
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

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // TODO: Implement deleteCollection in database service
    // For now, return an error to indicate this needs to be implemented
    return NextResponse.json({ 
      error: "Delete collection not yet implemented with database", 
      message: "Please use the collections management API" 
    }, { status: 501 })
    
  } catch (error) {
    console.error("[Collection API] Error deleting collection:", error)
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 })
  }
}
