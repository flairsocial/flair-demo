/**
 * Enhanced Database-Ready Profile Storage Service
 * 
 * This service provides a smooth upgrade path from file-based to database storage.
 * It maintains the same interface while adding performance optimizations and
 * database preparation.
 */

import fs from 'fs'
import path from 'path'
import { auth } from "@clerk/nextjs/server"
import type { Product } from './types'
import * as fileStorage from './profile-storage'

// Cache to reduce file I/O
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Performance monitoring
const performanceMetrics = {
  reads: 0,
  writes: 0,
  cacheHits: 0,
  averageReadTime: 0,
  averageWriteTime: 0
}

export class EnhancedProfileService {
  private static getFromCache<T>(key: string): T | null {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      performanceMetrics.cacheHits++
      return cached.data
    }
    cache.delete(key)
    return null
  }

  private static setCache<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() })
  }

  private static async getCurrentUserId(): Promise<string | null> {
    try {
      const { userId } = await auth()
      return userId
    } catch {
      return null
    }
  }

  // Enhanced Saved Items with caching and performance monitoring
  static async getSavedItems(userId?: string): Promise<Product[]> {
    const startTime = Date.now()
    performanceMetrics.reads++

    try {
      const currentUserId = userId || await this.getCurrentUserId()
      if (!currentUserId) return []

      const cacheKey = `saved-items-${currentUserId}`
      const cached = this.getFromCache<Product[]>(cacheKey)
      if (cached) return cached

      const items = fileStorage.getSavedItems(currentUserId)
      this.setCache(cacheKey, items)

      const duration = Date.now() - startTime
      performanceMetrics.averageReadTime = (performanceMetrics.averageReadTime + duration) / 2

      console.log(`[EnhancedProfileService] Loaded ${items.length} saved items for user ${currentUserId} in ${duration}ms`)
      return items
    } catch (error) {
      console.error("[EnhancedProfileService] Error fetching saved items:", error)
      return []
    }
  }

  static async addSavedItem(product: Product, userId?: string): Promise<boolean> {
    const startTime = Date.now()
    performanceMetrics.writes++

    try {
      const currentUserId = userId || await this.getCurrentUserId()
      if (!currentUserId) return false

      fileStorage.addSavedItem(product, currentUserId)
      
      // Invalidate cache
      const cacheKey = `saved-items-${currentUserId}`
      cache.delete(cacheKey)

      // Log activity for future analytics
      this.logActivity('save_item', 'product', product.id, { productTitle: product.title })

      const duration = Date.now() - startTime
      performanceMetrics.averageWriteTime = (performanceMetrics.averageWriteTime + duration) / 2

      console.log(`[EnhancedProfileService] Added item ${product.id} for user ${currentUserId} in ${duration}ms`)
      return true
    } catch (error) {
      console.error("[EnhancedProfileService] Error adding saved item:", error)
      return false
    }
  }

  static async removeSavedItem(productId: string, userId?: string): Promise<boolean> {
    const startTime = Date.now()
    performanceMetrics.writes++

    try {
      const currentUserId = userId || await this.getCurrentUserId()
      if (!currentUserId) return false

      fileStorage.removeSavedItem(productId, currentUserId)
      
      // Invalidate cache
      const cacheKey = `saved-items-${currentUserId}`
      cache.delete(cacheKey)

      // Log activity
      this.logActivity('remove_item', 'product', productId)

      const duration = Date.now() - startTime
      performanceMetrics.averageWriteTime = (performanceMetrics.averageWriteTime + duration) / 2

      console.log(`[EnhancedProfileService] Removed item ${productId} for user ${currentUserId} in ${duration}ms`)
      return true
    } catch (error) {
      console.error("[EnhancedProfileService] Error removing saved item:", error)
      return false
    }
  }

  // Enhanced Collections with caching
  static async getCollections(userId?: string) {
    const startTime = Date.now()
    performanceMetrics.reads++

    try {
      const currentUserId = userId || await this.getCurrentUserId()
      if (!currentUserId) return []

      const cacheKey = `collections-${currentUserId}`
      const cached = this.getFromCache(cacheKey)
      if (cached) return cached

      const collections = fileStorage.getCollections(currentUserId)
      this.setCache(cacheKey, collections)

      const duration = Date.now() - startTime
      console.log(`[EnhancedProfileService] Loaded ${collections.length} collections for user ${currentUserId} in ${duration}ms`)
      
      return collections
    } catch (error) {
      console.error("[EnhancedProfileService] Error fetching collections:", error)
      return []
    }
  }

  static async addCollection(collection: any, userId?: string): Promise<boolean> {
    try {
      const currentUserId = userId || await this.getCurrentUserId()
      if (!currentUserId) return false

      fileStorage.addCollection(collection, currentUserId)
      
      // Invalidate cache
      cache.delete(`collections-${currentUserId}`)
      
      this.logActivity('create_collection', 'collection', collection.id, { collectionName: collection.name })
      return true
    } catch (error) {
      console.error("[EnhancedProfileService] Error adding collection:", error)
      return false
    }
  }

  // Enhanced Chat History
  static async getChatHistory(userId?: string) {
    const startTime = Date.now()
    
    try {
      const currentUserId = userId || await this.getCurrentUserId()
      if (!currentUserId) return []

      const cacheKey = `chat-history-${currentUserId}`
      const cached = this.getFromCache(cacheKey)
      if (cached) return cached

      const chatHistory = fileStorage.getChatHistory(currentUserId)
      this.setCache(cacheKey, chatHistory)

      const duration = Date.now() - startTime
      console.log(`[EnhancedProfileService] Loaded ${chatHistory.length} chats for user ${currentUserId} in ${duration}ms`)
      
      return chatHistory
    } catch (error) {
      console.error("[EnhancedProfileService] Error fetching chat history:", error)
      return []
    }
  }

  static async addChatHistory(chatHistory: any, userId?: string): Promise<boolean> {
    try {
      const currentUserId = userId || await this.getCurrentUserId()
      if (!currentUserId) return false

      fileStorage.addChatHistory(chatHistory, currentUserId)
      
      // Invalidate cache
      cache.delete(`chat-history-${currentUserId}`)
      
      this.logActivity('create_chat', 'chat', chatHistory.id, { chatTitle: chatHistory.title })
      return true
    } catch (error) {
      console.error("[EnhancedProfileService] Error adding chat history:", error)
      return false
    }
  }

  // Activity Logging (prepares for database analytics)
  private static activityLog: Array<{
    userId: string
    action: string
    entityType: string
    entityId: string
    metadata?: any
    timestamp: string
  }> = []

  static logActivity(action: string, entityType: string, entityId: string, metadata?: any): void {
    this.getCurrentUserId().then(userId => {
      if (userId) {
        this.activityLog.push({
          userId,
          action,
          entityType,
          entityId,
          metadata,
          timestamp: new Date().toISOString()
        })

        // Keep only last 1000 activities to prevent memory bloat
        if (this.activityLog.length > 1000) {
          this.activityLog.splice(0, 500)
        }
      }
    })
  }

  // Performance Monitoring
  static getPerformanceMetrics() {
    return {
      ...performanceMetrics,
      cacheSize: cache.size,
      activityLogSize: this.activityLog.length,
      cacheHitRate: performanceMetrics.cacheHits / performanceMetrics.reads
    }
  }

  // Health Check
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    fileSystem: boolean
    cache: boolean
    metrics: any
  }> {
    try {
      // Test file system access
      const testUserId = 'health-check'
      const items = fileStorage.getSavedItems(testUserId)
      
      return {
        status: 'healthy',
        fileSystem: true,
        cache: cache.size >= 0,
        metrics: this.getPerformanceMetrics()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        fileSystem: false,
        cache: false,
        metrics: this.getPerformanceMetrics()
      }
    }
  }

  // Cache Management
  static clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of cache.keys()) {
        if (key.includes(pattern)) {
          cache.delete(key)
        }
      }
    } else {
      cache.clear()
    }
    console.log(`[EnhancedProfileService] Cache cleared${pattern ? ` for pattern: ${pattern}` : ''}`)
  }

  // Data Export (for database migration)
  static async exportAllData(): Promise<{
    users: Record<string, any>
    savedItems: Record<string, any>
    collections: Record<string, any>
    chatHistory: Record<string, any>
    activityLog: typeof EnhancedProfileService.activityLog
  }> {
    const DATA_DIR = path.join(process.cwd(), 'data')
    
    const readJSON = (filename: string) => {
      try {
        const filePath = path.join(DATA_DIR, filename)
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, 'utf8'))
        }
      } catch (error) {
        console.error(`Error reading ${filename}:`, error)
      }
      return {}
    }

    return {
      users: readJSON('profiles.json'),
      savedItems: readJSON('saved-items.json'),
      collections: readJSON('collections.json'),
      chatHistory: readJSON('chat-history.json'),
      activityLog: this.activityLog
    }
  }
}

export default EnhancedProfileService
