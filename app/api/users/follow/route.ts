import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { followUser, unfollowUser, getFollowStatus } from "@/lib/database-service-v2"

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const { targetUserId, action } = await request.json()
    
    if (!targetUserId || !action) {
      return NextResponse.json({ 
        error: "Missing required fields", 
        details: "targetUserId and action are required" 
      }, { status: 400 })
    }
    
    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json({ 
        error: "Invalid action", 
        details: "Action must be 'follow' or 'unfollow'" 
      }, { status: 400 })
    }
    
    if (userId === targetUserId) {
      return NextResponse.json({ 
        error: "Cannot follow yourself", 
        details: "You cannot follow your own account" 
      }, { status: 400 })
    }
    
    console.log(`[Follow API] ${action} request - User: ${userId}, Target: ${targetUserId}`)
    
    let result
    if (action === 'follow') {
      result = await followUser(userId, targetUserId)
    } else {
      result = await unfollowUser(userId, targetUserId)
    }
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || "Failed to process request",
        details: result.error
      }, { status: 400 })
    }
    
    console.log(`[Follow API] Successfully ${action}ed user ${targetUserId}`)
    return NextResponse.json({ 
      success: true, 
      message: `Successfully ${action}ed user`,
      isFollowing: result.isFollowing
    })
    
  } catch (error) {
    console.error("[Follow API] Error:", error)
    return NextResponse.json({ 
      error: "Failed to process follow/unfollow request",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to check follow status
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('targetUserId')
    
    if (!targetUserId) {
      return NextResponse.json({ 
        error: "Missing targetUserId parameter" 
      }, { status: 400 })
    }
    
    const result = await getFollowStatus(userId, targetUserId)
    
    if (result.error) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 404 })
    }
    
    return NextResponse.json({ 
      isFollowing: result.isFollowing
    })
    
  } catch (error) {
    console.error("[Follow API] Error checking follow status:", error)
    return NextResponse.json({ 
      error: "Failed to check follow status",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}