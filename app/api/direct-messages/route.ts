import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getConversations, getMessages, sendMessage, createConversation, getOrCreateProfile } from '@/lib/database-service-v2'

// GET /api/direct-messages - Get user's conversations
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user has a profile before proceeding
    await getOrCreateProfile(userId)

    const conversations = await getConversations(userId)
    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error getting conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/direct-messages - Send a message or create conversation
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user has a profile before proceeding
    await getOrCreateProfile(userId)

    const body = await request.json()
    const { action, conversationId, content, otherUserId } = body

    if (action === 'send') {
      if (!conversationId || !content) {
        return NextResponse.json({ error: 'Missing conversationId or content' }, { status: 400 })
      }

      const success = await sendMessage(conversationId, userId, content)
      return NextResponse.json({ success })
    }

    if (action === 'create') {
      if (!otherUserId) {
        return NextResponse.json({ error: 'Missing otherUserId' }, { status: 400 })
      }

      // Ensure the other user also has a profile
      await getOrCreateProfile(otherUserId)

      const conversationId = await createConversation(userId, otherUserId)
      return NextResponse.json({ conversationId })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in direct messages API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
