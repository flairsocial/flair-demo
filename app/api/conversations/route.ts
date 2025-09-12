import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createConversation } from '@/lib/database-service'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { otherUserId } = body

    if (!otherUserId) {
      return NextResponse.json({ error: 'Other user ID is required' }, { status: 400 })
    }

    // Create or get existing conversation
    const conversationId = await createConversation(userId, otherUserId)
    
    if (!conversationId) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    return NextResponse.json({ conversationId })
  } catch (error) {
    console.error('Conversation creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
