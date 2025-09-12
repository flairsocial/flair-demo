import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSavedItems, addSavedItem, removeSavedItem } from "@/lib/database-service"
import type { Product } from "@/lib/types"

export async function GET() {
  try {
    const { userId } = await auth()
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    // Get user's actual saved items from storage
    const savedItems = await getSavedItems(userId)
    
    console.log(`[Saved API] GET request - User ID: ${userId}`)
    console.log(`[Saved API] Found ${savedItems.length} saved items`)

    // Add cache prevention headers
    const response = NextResponse.json(savedItems)
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error("[Saved API] Error fetching saved items:", error)
    return NextResponse.json({ error: "Failed to fetch saved items" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const { action, item } = await request.json()
    
    console.log(`[Saved API] POST request - User ID: ${userId}`)
    console.log(`[Saved API] Action: ${action}`)

    if (action === 'add' && item) {
      await addSavedItem(userId, item)
      return NextResponse.json({ success: true, message: 'Item saved successfully' })
    } else if (action === 'remove' && item?.id) {
      await removeSavedItem(userId, item.id)
      return NextResponse.json({ success: true, message: 'Item removed successfully' })
    } else {
      return NextResponse.json({ error: 'Invalid action or missing item data' }, { status: 400 })
    }
  } catch (error) {
    console.error("[Saved API] Error saving/removing item:", error)
    return NextResponse.json({ error: "Failed to update saved items" }, { status: 500 })
  }
}
