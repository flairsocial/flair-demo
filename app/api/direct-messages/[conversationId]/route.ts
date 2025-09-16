import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getMessages } from '@/lib/database-service-v2'

// GET /api/direct-messages/[conversationId] - Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = params
    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
    }

    const messages = await getMessages(conversationId, userId)
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error getting messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}