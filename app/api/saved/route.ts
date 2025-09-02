import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSavedItems, addSavedItem, removeSavedItem } from "@/lib/profile-storage"
import type { Product } from "@/lib/types"

export async function GET() {
  try {
    const { userId } = await auth()
    
    // Get user's actual saved items from storage
    const savedItems = getSavedItems(userId || undefined)
    
    console.log(`[Saved API] GET request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Saved API] Found ${savedItems.length} saved items`)

    return NextResponse.json(savedItems)
  } catch (error) {
    console.error("[Saved API] Error fetching saved items:", error)
    return NextResponse.json({ error: "Failed to fetch saved items" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    const { action, item } = await request.json()
    
    console.log(`[Saved API] POST request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Saved API] Action: ${action}`)

    if (action === 'add' && item) {
      addSavedItem(item, userId || undefined)
      return NextResponse.json({ success: true, message: 'Item saved successfully' })
    } else if (action === 'remove' && item?.id) {
      removeSavedItem(item.id, userId || undefined)
      return NextResponse.json({ success: true, message: 'Item removed successfully' })
    } else {
      return NextResponse.json({ error: 'Invalid action or missing item data' }, { status: 400 })
    }
  } catch (error) {
    console.error("[Saved API] Error saving/removing item:", error)
    return NextResponse.json({ error: "Failed to update saved items" }, { status: 500 })
  }
}
