import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUnreadMessageCount } from '@/lib/database-service-v2'

// GET /api/direct-messages/unread-count - Get unread message count
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const unreadCount = await getUnreadMessageCount(userId)
    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error('Error getting unread count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}