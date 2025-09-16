import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getConversations } from "@/lib/database-service-v2"

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log('Debug: Getting conversations for user:', userId)
    
    const conversations = await getConversations(userId)
    
    return NextResponse.json({
      userId,
      conversations,
      conversationCount: conversations.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Conversations debug error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
