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
  aiResponses: string[]  // Track AI responses for context
  recentTopics: string[] // Track topics mentioned
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
        const memory = JSON.parse(data)
        
        // Ensure all required fields exist (for backward compatibility)
        return {
          userId: memory.userId || userId || 'anonymous',
          sessionId: memory.sessionId || Date.now().toString(),
          discussedProducts: memory.discussedProducts || [],
          searchQueries: memory.searchQueries || [],
          userIntents: memory.userIntents || [],
          stylePreferences: memory.stylePreferences || [],
          lastSearchResults: memory.lastSearchResults || [],
          conversationThemes: memory.conversationThemes || [],
          aiResponses: memory.aiResponses || [], // NEW: Ensure this exists
          recentTopics: memory.recentTopics || [], // NEW: Ensure this exists
          timestamp: memory.timestamp || new Date().toISOString()
        }
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
      aiResponses: [],
      recentTopics: [],
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
      aiResponses: [],
      recentTopics: [],
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

  // Add AI response to memory for context
  addAIResponse(userId: string | undefined, aiResponse: string, userQuery: string): void {
    const memory = this.loadUserMemory(userId) || {
      userId: userId || 'anonymous',
      sessionId: Date.now().toString(),
      discussedProducts: [],
      searchQueries: [],
      userIntents: [],
      stylePreferences: [],
      lastSearchResults: [],
      conversationThemes: [],
      aiResponses: [],
      recentTopics: [],
      timestamp: new Date().toISOString()
    }

    // Safety check: Ensure arrays exist (backward compatibility)
    if (!memory.aiResponses) memory.aiResponses = []
    if (!memory.recentTopics) memory.recentTopics = []

    // Store the AI response for future context
    memory.aiResponses.push(`User: "${userQuery}" | AI: "${aiResponse}"`)
    
    // Extract topics/brands/products mentioned in AI response for better context
    const extractedTopics = this.extractTopicsFromText(aiResponse)
    memory.recentTopics.push(...extractedTopics)
    
    // Keep only last 5 AI responses and 10 topics to prevent memory bloat
    if (memory.aiResponses.length > 5) {
      memory.aiResponses = memory.aiResponses.slice(-5)
    }
    if (memory.recentTopics.length > 10) {
      memory.recentTopics = memory.recentTopics.slice(-10)
    }

    this.saveUserMemory(userId, memory)
  }

  // Extract meaningful topics from AI responses
  private extractTopicsFromText(text: string): string[] {
    const topics: string[] = []
    
    // Extract brand names (capitalized words)
    const brandMatches = text.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]*)*\b/g) || []
    const commonWords = ['The', 'These', 'This', 'That', 'When', 'Where', 'What', 'How', 'Why', 'You', 'Your', 'They', 'Their', 'Some', 'Many', 'Most', 'Here', 'There', 'From', 'With', 'For', 'And', 'But', 'Also', 'Can', 'Will', 'Should', 'Would']
    
    const potentialBrands = brandMatches
      .filter(match => !commonWords.includes(match) && match.length > 2)
      .slice(0, 3)
    
    topics.push(...potentialBrands)
    
    // Extract product categories
    const productTerms = ['bag', 'handbag', 'purse', 'wallet', 'jacket', 'dress', 'shoes', 'sneakers', 'boots', 'watch', 'jewelry', 'sunglasses', 'scarf', 'belt', 'phone', 'laptop', 'headphones']
    const foundProducts = productTerms.filter(term => 
      text.toLowerCase().includes(term)
    ).slice(0, 2)
    
    topics.push(...foundProducts)
    
    return [...new Set(topics)] // Remove duplicates
  }

  // Add conversation theme to memory
  addConversationTheme(userId: string | undefined, theme: string): void {
    const memory = this.loadUserMemory(userId) || {
      userId: userId || 'anonymous',
      sessionId: Date.now().toString(),
      discussedProducts: [],
      searchQueries: [],
      userIntents: [],
      stylePreferences: [],
      lastSearchResults: [],
      conversationThemes: [],
      aiResponses: [],
      recentTopics: [],
      timestamp: new Date().toISOString()
    }

    // Safety check: Ensure arrays exist (backward compatibility)
    if (!memory.conversationThemes) memory.conversationThemes = []

    memory.conversationThemes.push(theme)
    
    // Keep only last 10 themes
    if (memory.conversationThemes.length > 10) {
      memory.conversationThemes = memory.conversationThemes.slice(-10)
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

    // Add recent AI responses for context continuity
    if (memory.aiResponses && memory.aiResponses.length > 0) {
      context += `\n\nRECENT CONVERSATION CONTEXT (last 3 exchanges):\n`
      context += memory.aiResponses.slice(-3).join('\n')
    }

    // Add recent topics mentioned for context
    if (memory.recentTopics && memory.recentTopics.length > 0) {
      context += `\n\nRECENTLY MENTIONED TOPICS/BRANDS:\n`
      context += memory.recentTopics.slice(-5).map(topic => `• ${topic}`).join('\n')
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
