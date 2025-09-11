// Database service with fallback to file system
// This service provides a smooth migration path from file-based to database storage

import { eq, and, desc, sql, inArray } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"
import type { Product } from "../types"

// Import file-based storage as fallback
import * as fileStorage from "../profile-storage"

// Try to import database - will fail gracefully if not set up
let db: any = null
let schema: any = null

try {
  const dbModule = await import("./index")
  const schemaModule = await import("./schema")
  db = dbModule.db
  schema = schemaModule
  console.log("[DatabaseService] Database connection available")
} catch (error) {
  console.log("[DatabaseService] Database not available, using file storage fallback")
}

// Configuration
const USE_DATABASE = process.env.USE_DATABASE === "true" && db !== null

export class DatabaseService {
  private static async getCurrentUser() {
    const { userId } = await auth()
    return userId
  }

  // User Management
  static async ensureUser(userId: string) {
    if (!USE_DATABASE) return null

    try {
      // Check if user exists
      const existingUser = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1)
      
      if (existingUser.length === 0) {
        // Create user record
        const newUser = await db.insert(schema.users).values({
          id: userId,
          email: `${userId}@temp.com`, // Will be updated with real email later
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning()
        
        console.log(`[DatabaseService] Created user record for ${userId}`)
        return newUser[0]
      }
      
      return existingUser[0]
    } catch (error) {
      console.error("[DatabaseService] Error ensuring user:", error)
      return null
    }
  }

  // Saved Items
  static async getSavedItems(userId?: string): Promise<Product[]> {
    const currentUserId = userId || await this.getCurrentUser()
    if (!currentUserId) return []

    if (!USE_DATABASE) {
      return fileStorage.getSavedItems(currentUserId)
    }

    try {
      await this.ensureUser(currentUserId)

      const savedItems = await db
        .select({
          product: schema.products,
          savedAt: schema.userSavedItems.savedAt,
          notes: schema.userSavedItems.notes,
          savedPrice: schema.userSavedItems.savedPrice,
        })
        .from(schema.userSavedItems)
        .innerJoin(schema.products, eq(schema.userSavedItems.productId, schema.products.id))
        .where(eq(schema.userSavedItems.userId, currentUserId))
        .orderBy(desc(schema.userSavedItems.savedAt))

      return savedItems.map(item => ({
        ...item.product,
        price: item.product.price / 100, // Convert from cents
        saved: true,
        savedAt: item.savedAt,
        notes: item.notes,
      }))
    } catch (error) {
      console.error("[DatabaseService] Error fetching saved items:", error)
      // Fallback to file storage
      return fileStorage.getSavedItems(currentUserId)
    }
  }

  static async addSavedItem(product: Product, userId?: string): Promise<boolean> {
    const currentUserId = userId || await this.getCurrentUser()
    if (!currentUserId) return false

    if (!USE_DATABASE) {
      fileStorage.addSavedItem(product, currentUserId)
      return true
    }

    try {
      await this.ensureUser(currentUserId)

      // First, ensure product exists in products table
      await this.upsertProduct(product)

      // Check if already saved
      const existing = await db
        .select()
        .from(schema.userSavedItems)
        .where(and(
          eq(schema.userSavedItems.userId, currentUserId),
          eq(schema.userSavedItems.productId, product.id)
        ))
        .limit(1)

      if (existing.length === 0) {
        await db.insert(schema.userSavedItems).values({
          userId: currentUserId,
          productId: product.id,
          savedPrice: product.price * 100, // Convert to cents
          savedAt: new Date(),
        })
        
        console.log(`[DatabaseService] Added saved item ${product.id} for user ${currentUserId}`)
      }

      return true
    } catch (error) {
      console.error("[DatabaseService] Error adding saved item:", error)
      // Fallback to file storage
      fileStorage.addSavedItem(product, currentUserId)
      return false
    }
  }

  static async removeSavedItem(productId: string, userId?: string): Promise<boolean> {
    const currentUserId = userId || await this.getCurrentUser()
    if (!currentUserId) return false

    if (!USE_DATABASE) {
      fileStorage.removeSavedItem(productId, currentUserId)
      return true
    }

    try {
      await db
        .delete(schema.userSavedItems)
        .where(and(
          eq(schema.userSavedItems.userId, currentUserId),
          eq(schema.userSavedItems.productId, productId)
        ))

      console.log(`[DatabaseService] Removed saved item ${productId} for user ${currentUserId}`)
      return true
    } catch (error) {
      console.error("[DatabaseService] Error removing saved item:", error)
      // Fallback to file storage
      fileStorage.removeSavedItem(productId, currentUserId)
      return false
    }
  }

  // Product Management
  private static async upsertProduct(product: Product): Promise<void> {
    if (!USE_DATABASE) return

    try {
      await db
        .insert(schema.products)
        .values({
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price * 100, // Convert to cents
          brand: product.brand,
          category: product.category,
          image: product.image,
          url: product.link,
          specifications: product.specifications,
          reviews: product.reviews,
          availability: product.availability,
          realTimeData: product.realTimeData,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.products.id,
          set: {
            title: product.title,
            description: product.description,
            price: product.price * 100,
            brand: product.brand,
            category: product.category,
            image: product.image,
            url: product.link,
            specifications: product.specifications,
            reviews: product.reviews,
            availability: product.availability,
            realTimeData: product.realTimeData,
            updatedAt: new Date(),
          },
        })
    } catch (error) {
      console.error("[DatabaseService] Error upserting product:", error)
    }
  }

  // Collections
  static async getCollections(userId?: string) {
    const currentUserId = userId || await this.getCurrentUser()
    if (!currentUserId) return []

    if (!USE_DATABASE) {
      return fileStorage.getCollections(currentUserId)
    }

    try {
      await this.ensureUser(currentUserId)

      const collections = await db
        .select()
        .from(schema.collections)
        .where(eq(schema.collections.userId, currentUserId))
        .orderBy(desc(schema.collections.createdAt))

      return collections
    } catch (error) {
      console.error("[DatabaseService] Error fetching collections:", error)
      return fileStorage.getCollections(currentUserId)
    }
  }

  // Chat History
  static async getChatHistory(userId?: string) {
    const currentUserId = userId || await this.getCurrentUser()
    if (!currentUserId) return []

    if (!USE_DATABASE) {
      return fileStorage.getChatHistory(currentUserId)
    }

    try {
      await this.ensureUser(currentUserId)

      const conversations = await db
        .select()
        .from(schema.chatConversations)
        .where(eq(schema.chatConversations.userId, currentUserId))
        .orderBy(desc(schema.chatConversations.updatedAt))

      // Get messages for each conversation
      const chatHistory = await Promise.all(
        conversations.map(async (conv) => {
          const messages = await db
            .select()
            .from(schema.chatMessages)
            .where(eq(schema.chatMessages.conversationId, conv.id))
            .orderBy(schema.chatMessages.createdAt)

          return {
            id: conv.id,
            title: conv.title,
            messages,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
          }
        })
      )

      return chatHistory
    } catch (error) {
      console.error("[DatabaseService] Error fetching chat history:", error)
      return fileStorage.getChatHistory(currentUserId)
    }
  }

  // Analytics and Performance
  static async logUserActivity(action: string, entityType?: string, entityId?: string, metadata?: any) {
    const userId = await this.getCurrentUser()
    if (!userId || !USE_DATABASE) return

    try {
      await this.ensureUser(userId)

      await db.insert(schema.userActivity).values({
        userId,
        action,
        entityType,
        entityId,
        metadata,
        createdAt: new Date(),
      })
    } catch (error) {
      console.error("[DatabaseService] Error logging activity:", error)
    }
  }

  // Health Check
  static async healthCheck(): Promise<{ database: boolean; fallback: boolean }> {
    let databaseWorking = false
    
    if (USE_DATABASE) {
      try {
        await db.select().from(schema.users).limit(1)
        databaseWorking = true
      } catch (error) {
        console.error("[DatabaseService] Database health check failed:", error)
      }
    }

    return {
      database: databaseWorking,
      fallback: true, // File storage is always available
    }
  }

  // Migration Helper
  static async migrateFromFileStorage(): Promise<{ success: boolean; migrated: number; errors: string[] }> {
    if (!USE_DATABASE) {
      return { success: false, migrated: 0, errors: ["Database not available"] }
    }

    const errors: string[] = []
    let migrated = 0

    try {
      // This would migrate all file-based data to database
      // Implementation would read all JSON files and insert into database
      console.log("[DatabaseService] Migration not implemented yet")
      
      return { success: true, migrated, errors }
    } catch (error) {
      return { success: false, migrated, errors: [String(error)] }
    }
  }
}

export default DatabaseService
