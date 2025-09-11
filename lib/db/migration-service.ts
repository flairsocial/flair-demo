import { db } from './index';
import dotenv from 'dotenv';
import * as profileStorage from '../profile-storage';
import * as schema from './schema';

// Load environment variables
dotenv.config({ path: '.env.local' });

export class DatabaseMigrationService {
  async migrateUserData(userId: string) {
    console.log(`🔄 Migrating data for user: ${userId}`);
    
    try {
      // 1. Ensure user exists in database
      await this.ensureUserExists(userId);
      
      // 2. Migrate saved items
      await this.migrateSavedItems(userId);
      
      // 3. Migrate collections
      await this.migrateCollections(userId);
      
      console.log(`✅ Successfully migrated data for user: ${userId}`);
      
    } catch (error) {
      console.error(`❌ Migration failed for user ${userId}:`, error);
      throw error;
    }
  }
  
  private async ensureUserExists(userId: string) {
    try {
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, userId)
      });
      
      if (!existingUser) {
        // Create user record (basic data - will be populated from Clerk)
        await db.insert(schema.users).values({
          id: userId,
          email: `${userId}@placeholder.com`, // Placeholder - will be updated from Clerk
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`👤 Created user record for: ${userId}`);
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      // Continue - might already exist
    }
  }
  
  private async migrateSavedItems(userId: string) {
    try {
      const savedItems = await profileStorage.getSavedItems(userId);
      
      if (!savedItems?.length) {
        console.log('📂 No saved items to migrate');
        return;
      }
      
      console.log(`📂 Migrating ${savedItems.length} saved items...`);
      
      for (const item of savedItems) {
        // Create product if it doesn't exist
        await this.ensureProductExists(item);
        
        // Create saved item record
        await db.insert(schema.userSavedItems).values({
          userId: userId,
          productId: item.id,
          savedAt: new Date(item.savedAt || Date.now()),
          notes: null, // Notes not in current schema
          priority: 0,
          savedPrice: item.price ? Math.round(item.price * 100) : null, // Convert to cents
          savedFromUrl: null, // URL is in the product record
        }).onConflictDoNothing(); // Skip if already exists
      }
      
      console.log(`✅ Migrated ${savedItems.length} saved items`);
      
    } catch (error) {
      console.error('Error migrating saved items:', error);
      throw error;
    }
  }
  
  private async migrateCollections(userId: string) {
    try {
      const collections = await profileStorage.getCollections(userId);
      
      if (!collections?.length) {
        console.log('📚 No collections to migrate');
        return;
      }
      
      console.log(`📚 Migrating ${collections.length} collections...`);
      
      for (const collection of collections) {
        // Create collection
        const [dbCollection] = await db.insert(schema.collections).values({
          userId: userId,
          name: collection.name,
          description: collection.description || null,
          color: collection.color || '#3b82f6',
          customBanner: collection.customBanner || null,
          isPublic: false, // Default to private
          sortOrder: 0, // Default sort order
          createdAt: new Date(collection.createdAt || Date.now()),
          updatedAt: new Date(),
        }).returning().onConflictDoNothing();
        
        if (dbCollection && collection.itemIds?.length) {
          // Get saved items to find the products for these IDs
          const savedItems = await profileStorage.getSavedItems(userId);
          const itemsMap = new Map(savedItems.map(item => [item.id, item]));
          
          // Add collection items
          for (let i = 0; i < collection.itemIds.length; i++) {
            const itemId = collection.itemIds[i];
            const item = itemsMap.get(itemId);
            
            if (item) {
              // Ensure product exists
              await this.ensureProductExists(item);
              
              // Add to collection
              await db.insert(schema.collectionItems).values({
                collectionId: dbCollection.id,
                productId: item.id,
                addedAt: new Date(),
                sortOrder: i,
              }).onConflictDoNothing();
            }
          }
        }
      }
      
      console.log(`✅ Migrated ${collections.length} collections`);
      
    } catch (error) {
      console.error('Error migrating collections:', error);
      throw error;
    }
  }
  
  private async ensureProductExists(product: any) {
    try {
      // Check if product already exists
      const existing = await db.query.products.findFirst({
        where: (products, { eq }) => eq(products.id, product.id)
      });
      
      if (!existing) {
        await db.insert(schema.products).values({
          id: product.id,
          title: product.title,
          description: product.description || null,
          price: Math.round((product.price || 0) * 100), // Convert to cents
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
        });
      }
    } catch (error) {
      console.error(`Error ensuring product exists (${product.id}):`, error);
      // Continue - might already exist
    }
  }
}
