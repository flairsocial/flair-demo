import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { databaseService } from "@/lib/database-service"

export async function GET() {
  try {
    const { userId } = await auth()
    
    console.log(`[Chat History API] GET request - User ID: ${userId || 'anonymous'}`)
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const startTime = Date.now()
    const chatHistory = await databaseService.getChatHistory(userId)
    const duration = Date.now() - startTime
    
    console.log(`[Chat History API] Found ${chatHistory.length} chat conversations in ${duration}ms`)

    return NextResponse.json(chatHistory, {
      headers: {
        'X-Response-Time': `${duration}ms`,
        'X-Source': 'database'
      }
    })
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

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const startTime = Date.now()

    switch (action) {
      case 'create':
        if (messages && Array.isArray(messages) && messages.length > 0) {
          // Generate descriptive title from first user message
          const firstUserMessage = messages.find((m: any) => m.sender === 'user')
          const chatTitle = firstUserMessage ? 
            firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '') :
            'New Chat'
          
          const newConversation = await databaseService.createChatConversation(userId, chatTitle)
          
          if (newConversation) {
            // Add all messages to the conversation
            for (const message of messages) {
              await databaseService.addChatMessage(
                newConversation.id,
                message.content,
                message.sender,
                message.attachedFiles,
                message.products
              )
            }
            
            await databaseService.logActivity(userId, 'create_chat', 'conversation', newConversation.id)
            
            const duration = Date.now() - startTime
            return NextResponse.json({ 
              success: true, 
              chat: newConversation,
              responseTime: `${duration}ms`,
              source: 'database'
            })
          }
        }
        break

      case 'update':
        if (chatId && messages && Array.isArray(messages)) {
          // For database, we don't update entire conversations, but this can be used
          // to add new messages to existing conversations
          const success = await databaseService.updateChatHistory(messages, userId)
          if (success) {
            const duration = Date.now() - startTime
            return NextResponse.json({ 
              success: true, 
              message: 'Chat updated successfully',
              responseTime: `${duration}ms`,
              source: 'database'
            })
          }
        }
        break

      case 'delete':
        if (chatId) {
          const success = await databaseService.deleteChatConversation(userId, chatId)
          if (success) {
            await databaseService.logActivity(userId, 'delete_chat', 'conversation', chatId)
            const duration = Date.now() - startTime
            return NextResponse.json({ 
              success: true, 
              message: 'Chat deleted successfully',
              responseTime: `${duration}ms`,
              source: 'database'
            })
          }
        }
        break

      case 'rename':
        if (chatId && title) {
          const success = await databaseService.renameChatConversation(userId, chatId, title)
          if (success) {
            const duration = Date.now() - startTime
            return NextResponse.json({ 
              success: true, 
              message: 'Chat renamed successfully',
              responseTime: `${duration}ms`,
              source: 'database'
            })
          }
        }
        break

      case 'share':
        if (chatId) {
          // For now, just return a success response for share functionality
          // This can be expanded to implement actual sharing features later
          const duration = Date.now() - startTime
          return NextResponse.json({ 
            success: true, 
            message: 'Chat sharing link generated',
            shareUrl: `${process.env.AUTH0_BASE_URL || 'http://localhost:3000'}/chat/shared/${chatId}`,
            responseTime: `${duration}ms`,
            source: 'database'
          })
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action or action not supported' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Missing required parameters or operation failed' }, { status: 400 })
  } catch (error) {
    console.error("[Chat History API] Error:", error)
    return NextResponse.json({ error: "Failed to update chat history" }, { status: 500 })
  }
}
