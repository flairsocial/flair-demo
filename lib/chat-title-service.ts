// Chat Title Generation Service using AI
import { generateText } from "ai"
import { model } from "./ai-model"
import type { ChatMessage } from "./database-service-v2"

export class ChatTitleService {
  // Generate a concise title for a chat based on its messages
  static async generateTitle(messages: ChatMessage[]): Promise<string> {
    try {
      // Filter out system messages and get the first few user messages
      const userMessages = messages
        .filter(msg => msg.sender === 'user')
        .slice(0, 3) // Use first 3 user messages for context
        .map(msg => msg.content)
      
      if (userMessages.length === 0) {
        return "New Chat"
      }

      // If only one message, create a title from it
      if (userMessages.length === 1) {
        const message = userMessages[0]
        
        // Extract key fashion terms for a concise title
        const title = this.extractFashionTitle(message)
        if (title) return title
      }

      // For multiple messages, use AI to generate a summary title
      const conversationSample = userMessages.join('. ')
      
      const { text } = await generateText({
        model: model,
        messages: [
          {
            role: "system",
            content: `You are a title generator for fashion conversations. Create a short, descriptive title (2-4 words max) that captures the main topic of the conversation. Focus on fashion items, styling questions, or shopping themes. Examples: "Black Dress Search", "Work Outfit Help", "Vintage Style Tips", "Sneaker Recommendations"`
          },
          {
            role: "user", 
            content: `Generate a short title for this fashion conversation: "${conversationSample}"`
          }
        ]
      })

      // Clean and validate the generated title
      let title = text.trim()
        .replace(/['"]/g, '') // Remove quotes
        .replace(/^(Title|Chat|Conversation):\s*/i, '') // Remove common prefixes
        .substring(0, 30) // Max 30 characters
        .trim()

      return title || this.extractFashionTitle(userMessages[0]) || "Fashion Chat"

    } catch (error) {
      console.error('[ChatTitleService] Error generating title:', error)
      
      // Fallback to extracting title from first message
      const firstUserMessage = messages.find(msg => msg.sender === 'user')
      if (firstUserMessage) {
        return this.extractFashionTitle(firstUserMessage.content) || "Fashion Chat"
      }
      
      return "New Chat"
    }
  }

  // Extract fashion-focused title from a single message
  private static extractFashionTitle(message: string): string {
    const messageLower = message.toLowerCase()
    
    // Fashion item patterns
    const fashionItems = {
      'dress': 'Dress',
      'dresses': 'Dresses', 
      'jeans': 'Jeans',
      'pants': 'Pants',
      'shirt': 'Shirts',
      'shoes': 'Shoes',
      'sneakers': 'Sneakers',
      'boots': 'Boots',
      'jacket': 'Jackets',
      'coat': 'Coats',
      'sweater': 'Sweaters',
      'hoodie': 'Hoodies',
      'bag': 'Bags',
      'purse': 'Bags',
      'accessories': 'Accessories',
      'jewelry': 'Jewelry',
      'watch': 'Watches',
      'scarf': 'Scarves'
    }

    // Style/occasion patterns
    const occasions = {
      'work': 'Work Outfits',
      'office': 'Office Wear',
      'formal': 'Formal Wear',
      'casual': 'Casual Style',
      'party': 'Party Outfits',
      'wedding': 'Wedding Attire',
      'date': 'Date Night',
      'interview': 'Interview Outfit',
      'business': 'Business Attire',
      'vacation': 'Vacation Style',
      'winter': 'Winter Fashion',
      'summer': 'Summer Style',
      'spring': 'Spring Fashion',
      'fall': 'Fall Style',
      'autumn': 'Fall Style'
    }

    // Action patterns
    const actions = {
      'show me': 'Show',
      'find me': 'Find',
      'looking for': 'Search',
      'need': 'Need',
      'want': 'Want',
      'recommend': 'Recommendations',
      'suggest': 'Suggestions',
      'help': 'Help',
      'style': 'Styling',
      'outfit': 'Outfit Help'
    }

    // Color patterns
    const colors = ['black', 'white', 'red', 'blue', 'green', 'pink', 'navy', 'gray', 'brown']
    const foundColor = colors.find(color => messageLower.includes(color))

    // Try to extract key components
    let foundItem = ''
    let foundOccasion = ''
    let foundAction = ''

    // Find fashion items
    for (const [key, value] of Object.entries(fashionItems)) {
      if (messageLower.includes(key)) {
        foundItem = value
        break
      }
    }

    // Find occasions
    for (const [key, value] of Object.entries(occasions)) {
      if (messageLower.includes(key)) {
        foundOccasion = value
        break
      }
    }

    // Find actions
    for (const [key, value] of Object.entries(actions)) {
      if (messageLower.includes(key)) {
        foundAction = value
        break
      }
    }

    // Construct title based on found elements
    if (foundOccasion && foundItem) {
      return `${foundOccasion} - ${foundItem}`
    } else if (foundColor && foundItem) {
      return `${foundColor.charAt(0).toUpperCase() + foundColor.slice(1)} ${foundItem}`
    } else if (foundAction && foundItem) {
      return `${foundAction} ${foundItem}`
    } else if (foundItem) {
      return foundItem
    } else if (foundOccasion) {
      return foundOccasion
    } else if (foundAction) {
      return `${foundAction} Help`
    }

    // Fallback: use first few words
    const words = message.split(' ').slice(0, 3).join(' ')
    return words.length > 30 ? words.substring(0, 27) + '...' : words
  }

  // Update existing chat titles in bulk (useful for migration)
  static async updateExistingTitles(chatHistories: any[]): Promise<any[]> {
    console.log(`[ChatTitleService] Updating ${chatHistories.length} chat titles...`)
    
    const updatedChats = []
    
    for (const chat of chatHistories) {
      try {
        // Skip if already has a good title (not default "New Chat" or truncated message)
        if (chat.title && 
            chat.title !== 'New Chat' && 
            chat.title.length < 50 && 
            !chat.title.includes('...') &&
            chat.messages.length > 0 && 
            chat.title !== chat.messages[0]?.content?.slice(0, 50)) {
          updatedChats.push(chat)
          continue
        }

        // Generate new title
        const newTitle = await this.generateTitle(chat.messages)
        console.log(`[ChatTitleService] Updated "${chat.title}" → "${newTitle}"`)
        
        updatedChats.push({
          ...chat,
          title: newTitle,
          updatedAt: new Date().toISOString() // Update timestamp
        })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`[ChatTitleService] Error updating title for chat ${chat.id}:`, error)
        updatedChats.push(chat) // Keep original if error
      }
    }
    
    console.log(`[ChatTitleService] Successfully updated ${updatedChats.length} chat titles`)
    return updatedChats
  }
}

export const chatTitleService = ChatTitleService
