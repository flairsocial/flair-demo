import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getFollowingFeedPosts } from "@/lib/database-service-v2"

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    console.log(`[Following Feed API] GET request - User: ${userId}, limit: ${limit}, offset: ${offset}`)
    
    const posts = await getFollowingFeedPosts(userId, limit, offset)
    
    if (posts.length === 0) {
      console.log(`[Following Feed API] No posts found for user ${userId}`)
      return NextResponse.json([])
    }
    
    console.log(`[Following Feed API] Found ${posts.length} posts for user ${userId}`)
    return NextResponse.json(posts)
    
  } catch (error) {
    console.error("[Following Feed API] Error:", error)
    return NextResponse.json({ 
      error: "Failed to get following feed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}