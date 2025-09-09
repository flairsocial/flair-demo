// Enhanced Chat Memory & Context Service
import type { Product } from "./types"
import { getSavedItems, getProfile } from "./profile-storage"
import fs from 'fs'
import path from 'path'

const MEMORY_DIR = path.join(process.cwd(), 'data', 'chat-memory')

// Ensure memory directory exists
if (!fs.existsSync(MEMORY_DIR)) {
  fs.mkdirSync(MEMORY_DIR, { recursive: true })
}

export interface ChatContext {
  userId: string
  sessionId: string
  discussedProducts: Product[]
  searchQueries: string[]
  userIntents: string[]
  stylePreferences: string[]
  lastSearchResults: Product[]
  conversationThemes: string[]
  timestamp: string
}

export interface ProductMention {
  product: Product
  context: string
  timestamp: string
  discussionPoints: string[]
}

export interface SearchMemory {
  query: string
  intent: string
  results: Product[]
  timestamp: string
  successful: boolean
}

export class ChatMemoryService {
  private getUserMemoryPath(userId: string): string {
    return path.join(MEMORY_DIR, `${userId || 'anonymous'}-memory.json`)
  }

  // Load existing memory for user
  loadUserMemory(userId?: string): ChatContext | null {
    try {
      const memoryPath = this.getUserMemoryPath(userId || 'anonymous')
      if (fs.existsSync(memoryPath)) {
        const data = fs.readFileSync(memoryPath, 'utf-8')
        return JSON.parse(data)
      }
    } catch (error) {
      console.error('[Memory] Error loading user memory:', error)
    }
    return null
  }

  // Save memory for user
  saveUserMemory(userId: string | undefined, context: Partial<ChatContext>): void {
    try {
      const memoryPath = this.getUserMemoryPath(userId || 'anonymous')
      const existing = this.loadUserMemory(userId) || {
        userId: userId || 'anonymous',
        sessionId: Date.now().toString(),
        discussedProducts: [],
        searchQueries: [],
        userIntents: [],
        stylePreferences: [],
        lastSearchResults: [],
        conversationThemes: [],
        timestamp: new Date().toISOString()
      }

      const updated = {
        ...existing,
        ...context,
        timestamp: new Date().toISOString()
      }

      fs.writeFileSync(memoryPath, JSON.stringify(updated, null, 2))
    } catch (error) {
      console.error('[Memory] Error saving user memory:', error)
    }
  }

  // Add discussed product to memory
  addDiscussedProduct(userId: string | undefined, product: Product, context: string): void {
    const memory = this.loadUserMemory(userId) || {
      userId: userId || 'anonymous',
      sessionId: Date.now().toString(),
      discussedProducts: [],
      searchQueries: [],
      userIntents: [],
      stylePreferences: [],
      lastSearchResults: [],
      conversationThemes: [],
      timestamp: new Date().toISOString()
    }

    // Avoid duplicates
    const exists = memory.discussedProducts.find(p => p.id === product.id)
    if (!exists) {
      memory.discussedProducts.push(product)
      // Keep only last 20 products to prevent memory bloat
      if (memory.discussedProducts.length > 20) {
        memory.discussedProducts = memory.discussedProducts.slice(-20)
      }
    }

    this.saveUserMemory(userId, memory)
  }

  // Add search query to memory
  addSearchQuery(userId: string | undefined, query: string, intent: string, results: Product[]): void {
    const memory = this.loadUserMemory(userId) || {
      userId: userId || 'anonymous',
      sessionId: Date.now().toString(),
      discussedProducts: [],
      searchQueries: [],
      userIntents: [],
      stylePreferences: [],
      lastSearchResults: [],
      conversationThemes: [],
      timestamp: new Date().toISOString()
    }

    memory.searchQueries.push(query)
    memory.userIntents.push(intent)
    memory.lastSearchResults = results

    // Keep only last 10 searches
    if (memory.searchQueries.length > 10) {
      memory.searchQueries = memory.searchQueries.slice(-10)
      memory.userIntents = memory.userIntents.slice(-10)
    }

    this.saveUserMemory(userId, memory)
  }

  // Generate contextual prompt based on memory
  generateContextualPrompt(userId: string | undefined): string {
    const memory = this.loadUserMemory(userId)
    if (!memory) return ""

    let context = ""

    // Add recently discussed products
    if (memory.discussedProducts.length > 0) {
      const recentProducts = memory.discussedProducts.slice(-5)
      context += `\n\nRECENTLY DISCUSSED PRODUCTS (Reference these when relevant):\n`
      context += recentProducts.map(p => 
        `• ${p.title} by ${p.brand} ($${p.price}) - ${p.category || 'Fashion item'}`
      ).join('\n')
    }

    // Add recent search queries
    if (memory.searchQueries.length > 0) {
      context += `\n\nRECENT SEARCH QUERIES:\n`
      context += memory.searchQueries.slice(-3).map(q => `• "${q}"`).join('\n')
    }

    // Add conversation themes
    if (memory.conversationThemes.length > 0) {
      context += `\n\nCONVERSATION THEMES:\n`
      context += memory.conversationThemes.slice(-3).join(', ')
    }

    return context
  }

  // Clear old memory (run periodically)
  cleanupOldMemory(daysToKeep: number = 30): void {
    try {
      const files = fs.readdirSync(MEMORY_DIR)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      files.forEach(file => {
        const filePath = path.join(MEMORY_DIR, file)
        const stats = fs.statSync(filePath)
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath)
          console.log(`[Memory] Cleaned up old memory file: ${file}`)
        }
      })
    } catch (error) {
      console.error('[Memory] Error cleaning up old memory:', error)
    }
  }
}

export const chatMemoryService = new ChatMemoryService()
