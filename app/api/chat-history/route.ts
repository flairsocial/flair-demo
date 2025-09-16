import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { 
  getChatHistory, 
  addChatHistory, 
  updateChatHistory, 
  deleteChatHistory,
  renameChatHistory,
  generateChatTitle
} from "@/lib/database-service-v2"
import type { ChatHistory, ChatMessage } from "@/lib/database-service-v2"

export async function GET() {
  try {
    const { userId } = await auth()
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    // Get user's chat history from database
    const chatHistory = await getChatHistory(userId)
    
    console.log(`[Chat History API] GET request - User ID: ${userId}`)
    console.log(`[Chat History API] Found ${chatHistory.length} chat histories`)

    return NextResponse.json(chatHistory)
  } catch (error) {
    console.error("[Chat History API] Error fetching chat history:", error)
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    // Require authentication for database access
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    
    const { action, chatId, messages, title } = await request.json()
    
    console.log(`[Chat History API] POST request - User ID: ${userId}`)
    console.log(`[Chat History API] Action: ${action}`)

    switch (action) {
      case 'create':
        if (messages && Array.isArray(messages) && messages.length > 0) {
          // Generate descriptive title from first user message
          const firstUserMessage = messages.find(m => m.sender === 'user')
          const chatTitle = firstUserMessage ? generateChatTitle(firstUserMessage) : 'New Chat'
          
          const newChat: ChatHistory = {
            id: `chat-${Date.now()}`,
            title: chatTitle,
            messages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          await addChatHistory(userId, newChat)
          return NextResponse.json({ success: true, chat: newChat })
        }
        break

      case 'update':
        if (chatId && messages && Array.isArray(messages)) {
          await updateChatHistory(userId, chatId, messages)
          return NextResponse.json({ success: true, message: 'Chat updated successfully' })
        }
        break

      case 'rename':
        if (chatId && title) {
          await renameChatHistory(userId, chatId, title.trim())
          console.log(`[Chat History API] Renamed chat ${chatId} to: "${title}"`)
          return NextResponse.json({ success: true, message: 'Chat renamed successfully' })
        }
        break

      case 'delete':
        if (chatId) {
          await deleteChatHistory(userId, chatId)
          console.log(`[Chat History API] Deleted chat: ${chatId}`)
          return NextResponse.json({ success: true, message: 'Chat deleted successfully' })
        }
        break

      case 'share':
        if (chatId) {
          // For now, just return success - sharing functionality can be implemented later
          console.log(`[Chat History API] Share request for chat: ${chatId}`)
          return NextResponse.json({ 
            success: true, 
            message: 'Share link generated',
            shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/chat/shared/${chatId}`
          })
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  } catch (error) {
    console.error("[Chat History API] Error:", error)
    return NextResponse.json({ error: "Failed to update chat history" }, { status: 500 })
  }
}
