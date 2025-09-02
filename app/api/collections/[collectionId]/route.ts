import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getItemsInCollection } from "@/lib/profile-storage"

export async function GET(
  request: Request,
  { params }: { params: { collectionId: string } }
) {
  try {
    const { userId } = await auth()
    const { collectionId } = params
    
    console.log(`[Collection Items API] GET request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Collection Items API] Collection ID: ${collectionId}`)

    const items = getItemsInCollection(collectionId, userId || undefined)
    
    console.log(`[Collection Items API] Found ${items.length} items in collection`)

    return NextResponse.json(items)
  } catch (error) {
    console.error("[Collection Items API] Error fetching collection items:", error)
    return NextResponse.json({ error: "Failed to fetch collection items" }, { status: 500 })
  }
}
