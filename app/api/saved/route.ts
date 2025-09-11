import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { databaseService } from "@/lib/database-service"
import type { Product } from "@/lib/types"

export async function GET() {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    
    console.log(`[Saved API] GET request - User ID: ${userId || 'anonymous'}`)
    
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
    
    const startTime = Date.now()
    const savedItems = await databaseService.getSavedItems(userId)
    const duration = Date.now() - startTime
    
    console.log(`[Saved API] Found ${savedItems.length} saved items in ${duration}ms`)

    return NextResponse.json(savedItems, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${duration}ms`,
        'X-Source': 'database'
      }
    })
  } catch (error) {
    console.error("[Saved API] Error fetching saved items:", error)
    return NextResponse.json({ error: "Failed to fetch saved items" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    const user = await currentUser()
    const { action, item } = await request.json()
    
    console.log(`[Saved API] POST request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Saved API] Action: ${action}`)

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

    const startTime = Date.now()
    let success = false

    if (action === 'add' && item) {
      success = await databaseService.addSavedItem(item, userId)
      if (success) {
        // Log activity
        await databaseService.logActivity(userId, 'save_item', 'product', item.id)
        
        const duration = Date.now() - startTime
        return NextResponse.json({ 
          success: true, 
          message: 'Item saved successfully',
          responseTime: `${duration}ms`,
          source: 'database'
        })
      }
    } else if (action === 'remove' && item?.id) {
      success = await databaseService.removeSavedItem(item.id, userId)
      if (success) {
        // Log activity
        await databaseService.logActivity(userId, 'remove_item', 'product', item.id)
        
        const duration = Date.now() - startTime
        return NextResponse.json({ 
          success: true, 
          message: 'Item removed successfully',
          responseTime: `${duration}ms`,
          source: 'database'
        })
      }
    }

    if (!success) {
      return NextResponse.json({ 
        error: 'Operation failed',
        source: 'database'
      }, { status: 500 })
    }

    return NextResponse.json({ 
      error: 'Invalid action or missing item data',
      source: 'database'
    }, { status: 400 })
  } catch (error) {
    console.error("[Saved API] Error saving/removing item:", error)
    return NextResponse.json({ error: "Failed to update saved items" }, { status: 500 })
  }
}
