import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { 
  getChatHistory, 
  addChatHistory, 
  updateChatHistory, 
  deleteChatHistory 
} from "@/lib/profile-storage"
import type { ChatHistory, ChatMessage } from "@/lib/profile-storage"

export async function GET() {
  try {
    const { userId } = await auth()
    
    // Get user's chat history from storage
    const chatHistory = getChatHistory(userId || undefined)
    
    console.log(`[Chat History API] GET request - User ID: ${userId || 'anonymous'}`)
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
    const { action, chatId, messages, title } = await request.json()
    
    console.log(`[Chat History API] POST request - User ID: ${userId || 'anonymous'}`)
    console.log(`[Chat History API] Action: ${action}`)

    switch (action) {
      case 'create':
        if (messages && Array.isArray(messages)) {
          const newChat: ChatHistory = {
            id: `chat-${Date.now()}`,
            title: title || (messages.length > 0 ? messages[0].content.slice(0, 50) : 'New Chat'),
            messages,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          addChatHistory(newChat, userId || undefined)
          return NextResponse.json({ success: true, chat: newChat })
        }
        break

      case 'update':
        if (chatId && messages && Array.isArray(messages)) {
          updateChatHistory(chatId, messages, userId || undefined)
          return NextResponse.json({ success: true, message: 'Chat updated successfully' })
        }
        break

      case 'delete':
        if (chatId) {
          deleteChatHistory(chatId, userId || undefined)
          return NextResponse.json({ success: true, message: 'Chat deleted successfully' })
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
