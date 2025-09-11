import { db } from './db';
import { DatabaseMigrationService } from './db/migration-service';
import * as schema from './db/schema';
import { eq, and } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Database service to replace profile-storage.ts
export class DatabaseProfileService {
  private migrationService = new DatabaseMigrationService();
  private initialized = new Set<string>();

  // Ensure user is migrated before any operations
  private async ensureMigrated(userId: string) {
    if (this.initialized.has(userId)) return;
    
    try {
      await this.migrationService.migrateUserData(userId);
      this.initialized.add(userId);
    } catch (error) {
      console.warn('Migration warning for user', userId, error);
      // Continue anyway - might already be migrated
    }
  }

  // Get saved items for a user
  async getSavedItems(userId: string) {
    await this.ensureMigrated(userId);
    
    try {
      const items = await db.query.userSavedItems.findMany({
        where: (userSavedItems, { eq }) => eq(userSavedItems.userId, userId),
        with: {
          product: true
        },
        orderBy: (userSavedItems, { desc }) => [desc(userSavedItems.savedAt)]
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

  // Save an item for a user
  async saveItem(userId: string, product: any) {
    await this.ensureMigrated(userId);
    
    try {
      // First, ensure the product exists
      await db.insert(schema.products).values({
        id: product.id,
        title: product.title,
        description: product.description || null,
        price: Math.round((product.price || 0) * 100),
        originalPrice: product.originalPrice ? Math.round(product.originalPrice * 100) : null,
        brand: product.brand || null,
        category: product.category || null,
        image: product.image,
        url: product.url || null,
        specifications: product.specifications || null,
        reviews: product.reviews || null,
        availability: product.availability || null,
        realTimeData: product.realTimeData || null,
        tags: product.tags || null,
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

  // Remove a saved item
  async removeSavedItem(userId: string, productId: string) {
    await this.ensureMigrated(userId);
    
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

  // Get collections for a user
  async getCollections(userId: string) {
    await this.ensureMigrated(userId);
    
    try {
      const collections = await db.query.collections.findMany({
        where: (collections, { eq }) => eq(collections.userId, userId),
        with: {
          items: {
            with: {
              product: true
            }
          }
        },
        orderBy: (collections, { asc }) => [asc(collections.sortOrder)]
      });

      return collections.map(collection => ({
        id: collection.id,
        name: collection.name,
        color: collection.color,
        createdAt: collection.createdAt.toISOString(),
        description: collection.description,
        customBanner: collection.customBanner,
        itemIds: collection.items.map(item => item.productId),
        items: collection.items.map(item => ({
          ...item.product,
          price: item.product.price / 100,
          originalPrice: item.product.originalPrice ? item.product.originalPrice / 100 : undefined,
        }))
      }));
      
    } catch (error) {
      console.error('Error getting collections:', error);
      return [];
    }
  }

  // Create a new collection
  async createCollection(userId: string, collection: any) {
    await this.ensureMigrated(userId);
    
    try {
      const [newCollection] = await db.insert(schema.collections).values({
        userId,
        name: collection.name,
        description: collection.description || null,
        color: collection.color || '#3b82f6',
        customBanner: collection.customBanner || null,
        isPublic: false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return newCollection;
    } catch (error) {
      console.error('Error creating collection:', error);
      return null;
    }
  }
}

// Export singleton instance
export const databaseProfileService = new DatabaseProfileService();
