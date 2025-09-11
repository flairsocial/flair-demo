import { db } from './db';
import * as schema from './db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import type { Product } from './types';

// Comprehensive database service to replace all file-based storage
export class DatabaseService {
  // Initialize user in database
  async ensureUserExists(userId: string, userData?: { email?: string; firstName?: string; lastName?: string; imageUrl?: string }) {
    try {
      console.log(`[Database] Checking if user exists: ${userId}`)
      const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.id, userId)
      });
      
      if (!existingUser) {
        console.log(`[Database] User ${userId} does not exist, creating...`)
        if (userData) {
          await db.insert(schema.users).values({
            id: userId,
            email: userData.email || `${userId}@clerk.com`,
            firstName: userData.firstName || null,
            lastName: userData.lastName || null,
            imageUrl: userData.imageUrl || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).onConflictDoNothing();
          console.log(`[Database] User ${userId} created successfully`)
        } else {
          // Create user with minimal data if no userData provided
          await db.insert(schema.users).values({
            id: userId,
            email: `${userId}@clerk.com`,
            firstName: null,
            lastName: null,
            imageUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).onConflictDoNothing();
          console.log(`[Database] User ${userId} created with minimal data`)
        }
      } else {
        console.log(`[Database] User ${userId} already exists`)
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      // Don't throw - let the calling code handle the situation
    }
  }

  // SAVED ITEMS METHODS
  async getSavedItems(userId: string) {
    if (!userId) return [];
    
    await this.ensureUserExists(userId);
    
    try {
      const items = await db.query.userSavedItems.findMany({
        where: eq(schema.userSavedItems.userId, userId),
        with: {
          product: true
        },
        orderBy: desc(schema.userSavedItems.savedAt)
      });

      return items.map(item => ({
        ...item.product,
        price: item.product.price / 100, // Convert from cents
        originalPrice: item.product.originalPrice ? item.product.originalPrice / 100 : undefined,
        savedAt: item.savedAt.toISOString(),
        userId: item.userId,
      }));
      
    } catch (error) {
      console.error('Error getting saved items:', error);
      return [];
    }
  }

  async addSavedItem(product: Product, userId: string) {
    if (!userId) return false;
    
    await this.ensureUserExists(userId);
    
    try {
      // First, ensure the product exists
      await db.insert(schema.products).values({
        id: product.id,
        title: product.title,
        description: product.description || null,
        price: Math.round((product.price || 0) * 100),
        originalPrice: null, // Not in current Product type
        brand: product.brand || null,
        category: product.category || null,
        image: product.image,
        url: product.link || null, // Using link property from Product type
        specifications: product.specifications || null,
        reviews: product.reviews || null,
        availability: product.availability || null,
        realTimeData: null, // Not in current Product type
        tags: null, // Not in current Product type
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();

      // Then save it for the user
      await db.insert(schema.userSavedItems).values({
        userId,
        productId: product.id,
        savedAt: new Date(),
        savedPrice: Math.round((product.price || 0) * 100),
      }).onConflictDoNothing();

      return true;
    } catch (error) {
      console.error('Error saving item:', error);
      return false;
    }
  }

  async removeSavedItem(productId: string, userId: string) {
    if (!userId) return false;
    
    try {
      await db.delete(schema.userSavedItems)
        .where(
          and(
            eq(schema.userSavedItems.userId, userId),
            eq(schema.userSavedItems.productId, productId)
          )
        );
      return true;
    } catch (error) {
      console.error('Error removing saved item:', error);
      return false;
    }
  }

  // COLLECTIONS METHODS
  async getCollections(userId: string) {
    if (!userId) return [];
    
    await this.ensureUserExists(userId);
    
    try {
      const collections = await db.query.collections.findMany({
        where: eq(schema.collections.userId, userId),
        with: {
          items: {
            with: {
              product: true
            },
            orderBy: asc(schema.collectionItems.sortOrder)
          }
        },
        orderBy: asc(schema.collections.sortOrder)
      });

      return collections.map(collection => ({
        id: collection.id,
        name: collection.name,
        color: collection.color,
        createdAt: collection.createdAt.toISOString(),
        description: collection.description,
        customBanner: collection.customBanner,
        itemIds: collection.items.map(item => item.productId),
      }));
      
    } catch (error) {
      console.error('Error getting collections:', error);
      return [];
    }
  }

  async createCollection(name: string, userId: string, color: string = '#3b82f6', description?: string) {
    if (!userId) return null;
    
    await this.ensureUserExists(userId);
    
    try {
      const [newCollection] = await db.insert(schema.collections).values({
        userId,
        name,
        description: description || null,
        color,
        isPublic: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return {
        id: newCollection.id,
        name: newCollection.name,
        color: newCollection.color,
        createdAt: newCollection.createdAt.toISOString(),
        description: newCollection.description,
        customBanner: newCollection.customBanner,
        itemIds: [],
      };
    } catch (error) {
      console.error('Error creating collection:', error);
      return null;
    }
  }

  async addItemToCollection(collectionId: string, productId: string, userId: string) {
    if (!userId) return false;
    
    try {
      // Verify collection belongs to user
      const collection = await db.query.collections.findFirst({
        where: and(
          eq(schema.collections.id, collectionId),
          eq(schema.collections.userId, userId)
        )
      });
      
      if (!collection) return false;
      
      await db.insert(schema.collectionItems).values({
        collectionId,
        productId,
        addedAt: new Date(),
        sortOrder: 0,
      }).onConflictDoNothing();
      
      return true;
    } catch (error) {
      console.error('Error adding item to collection:', error);
      return false;
    }
  }

  async removeItemFromCollection(collectionId: string, productId: string, userId: string) {
    if (!userId) return false;
    
    try {
      // Verify collection belongs to user first
      const collection = await db.query.collections.findFirst({
        where: and(
          eq(schema.collections.id, collectionId),
          eq(schema.collections.userId, userId)
        )
      });
      
      if (!collection) return false;
      
      await db.delete(schema.collectionItems)
        .where(
          and(
            eq(schema.collectionItems.collectionId, collectionId),
            eq(schema.collectionItems.productId, productId)
          )
        );
      return true;
    } catch (error) {
      console.error('Error removing item from collection:', error);
      return false;
    }
  }

  // CHAT HISTORY METHODS
  async getChatHistory(userId: string) {
    if (!userId) return [];
    
    await this.ensureUserExists(userId);
    
    try {
      const conversations = await db.query.chatConversations.findMany({
        where: eq(schema.chatConversations.userId, userId),
        with: {
          messages: {
            orderBy: asc(schema.chatMessages.createdAt)
          }
        },
        orderBy: desc(schema.chatConversations.updatedAt)
      });

      return conversations.map(conversation => ({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: conversation.messages.map(message => ({
          id: message.id,
          content: message.content,
          sender: message.sender as 'user' | 'assistant',
          timestamp: message.createdAt.toISOString(),
          attachedFiles: message.attachedFiles as any[] || [],
          products: message.products as Product[] || [],
        }))
      }));
      
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  async createChatConversation(userId: string, title: string) {
    if (!userId) return null;
    
    await this.ensureUserExists(userId);
    
    try {
      const [conversation] = await db.insert(schema.chatConversations).values({
        userId,
        title,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: []
      };
    } catch (error) {
      console.error('Error creating chat conversation:', error);
      return null;
    }
  }

  async addChatMessage(conversationId: string, content: string, sender: 'user' | 'assistant', attachedFiles?: any[], products?: Product[]) {
    try {
      const [message] = await db.insert(schema.chatMessages).values({
        conversationId,
        content,
        sender,
        attachedFiles: attachedFiles || null,
        products: products || null,
        createdAt: new Date(),
      }).returning();

      // Update conversation's updatedAt timestamp
      await db.update(schema.chatConversations)
        .set({ updatedAt: new Date() })
        .where(eq(schema.chatConversations.id, conversationId));

      return {
        id: message.id,
        content: message.content,
        sender: message.sender as 'user' | 'assistant',
        timestamp: message.createdAt.toISOString(),
        attachedFiles: message.attachedFiles as any[] || [],
        products: message.products as Product[] || [],
      };
    } catch (error) {
      console.error('Error adding chat message:', error);
      return null;
    }
  }

  async updateChatHistory(history: any[], userId: string) {
    // For backward compatibility - this will create a new conversation
    if (!userId || !history.length) return false;
    
    try {
      const conversation = await this.createChatConversation(userId, 'Chat Session');
      if (!conversation) return false;
      
      for (const message of history) {
        await this.addChatMessage(
          conversation.id,
          message.content,
          message.sender,
          message.attachedFiles,
          message.products
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error updating chat history:', error);
      return false;
    }
  }

  // USER ACTIVITY TRACKING
  async logActivity(userId: string, action: string, entityType?: string, entityId?: string, metadata?: any) {
    if (!userId) return;
    
    try {
      await db.insert(schema.userActivity).values({
        userId,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        metadata: metadata || null,
        createdAt: new Date(),
      });
    } catch (error) {
      console.warn('Error logging activity:', error);
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
