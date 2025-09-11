import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { databaseService } from "@/lib/database-service"

export async function GET() {
  try {
    const { userId } = await auth()
    
    console.log(`[Collections API] GET request - User ID: ${userId || 'anonymous'}`)
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const startTime = Date.now()
    const collections = await databaseService.getCollections(userId)
    const duration = Date.now() - startTime
    
    console.log(`[Collections API] Found ${collections.length} collections in ${duration}ms`)

    return NextResponse.json(collections, {
      headers: {
        'X-Response-Time': `${duration}ms`,
        'X-Source': 'database'
      }
    })
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

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const startTime = Date.now()

    switch (action) {
      case 'create':
        if (collection) {
          const newCollection = await databaseService.createCollection(
            collection.name, 
            userId, 
            collection.color || '#3b82f6',
            collection.description
          )
          
          if (newCollection) {
            await databaseService.logActivity(userId, 'create_collection', 'collection', newCollection.id)
            
            const duration = Date.now() - startTime
            return NextResponse.json({ 
              success: true, 
              collection: newCollection,
              responseTime: `${duration}ms`,
              source: 'database'
            })
          }
        }
        break

      case 'addItem':
        if (itemId && collectionId) {
          const success = await databaseService.addItemToCollection(collectionId, itemId, userId)
          if (success) {
            await databaseService.logActivity(userId, 'add_to_collection', 'collection', collectionId, { itemId })
            
            const duration = Date.now() - startTime
            return NextResponse.json({ 
              success: true, 
              message: 'Item added to collection',
              responseTime: `${duration}ms`,
              source: 'database'
            })
          }
        }
        break

      case 'removeItem':
        if (itemId && collectionId) {
          const success = await databaseService.removeItemFromCollection(collectionId, itemId, userId)
          if (success) {
            await databaseService.logActivity(userId, 'remove_from_collection', 'collection', collectionId, { itemId })
            
            const duration = Date.now() - startTime
            return NextResponse.json({ 
              success: true, 
              message: 'Item removed from collection',
              responseTime: `${duration}ms`,
              source: 'database'
            })
          }
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Missing required parameters or operation failed' }, { status: 400 })
  } catch (error) {
    console.error("[Collections API] Error:", error)
    return NextResponse.json({ error: "Failed to update collections" }, { status: 500 })
  }
}
