import { pgTable, text, timestamp, json, integer, boolean, uuid, index, varchar, unique } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Flair Users table (extends Clerk user data) - using existing table name
export const users = pgTable("flair_users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Profile data
  profileData: json("profile_data"), // Store profile preferences, settings, etc.
}, (table) => ({
  emailIdx: index("flair_users_email_idx").on(table.email),
}))

// Flair Products table (normalized product data)
export const products = pgTable("flair_products", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // Store as cents to avoid floating point issues
  originalPrice: integer("original_price"),
  brand: text("brand"),
  category: text("category"),
  image: text("image").notNull(),
  url: text("url"), // External product URL
  
  // Product metadata
  specifications: json("specifications"), // dimensions, materials, etc.
  reviews: json("reviews"), // rating, count, top reviews
  availability: json("availability"), // in stock, shipping, delivery info
  realTimeData: json("real_time_data"), // last updated, source URL, confidence
  
  // SEO and search
  searchVector: text("search_vector"), // For full-text search
  tags: json("tags").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  titleIdx: index("flair_products_title_idx").on(table.title),
  brandIdx: index("flair_products_brand_idx").on(table.brand),
  categoryIdx: index("flair_products_category_idx").on(table.category),
  priceIdx: index("flair_products_price_idx").on(table.price),
}))

// Flair User saved items (many-to-many with additional metadata)
export const userSavedItems = pgTable("flair_user_saved_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  
  savedAt: timestamp("saved_at").defaultNow().notNull(),
  notes: text("notes"), // User's personal notes about the item
  priority: integer("priority").default(0), // For sorting/prioritizing saved items
  
  // Metadata from when item was saved
  savedPrice: integer("saved_price"), // Price when saved (for price tracking)
  savedFromUrl: text("saved_from_url"), // Where they found this item
  
}, (table) => ({
  userIdx: index("flair_user_saved_items_user_idx").on(table.userId),
  productIdx: index("flair_user_saved_items_product_idx").on(table.productId),
  userProductIdx: index("flair_user_saved_items_user_product_idx").on(table.userId, table.productId),
  savedAtIdx: index("flair_user_saved_items_saved_at_idx").on(table.savedAt),
  // CRITICAL: Add unique constraint to prevent duplicates
  userProductUnique: unique("flair_user_saved_items_user_product_unique").on(table.userId, table.productId),
}))

// Flair Collections
export const collections = pgTable("flair_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#3b82f6"), // Default blue
  customBanner: text("custom_banner"), // URL to custom banner image
  
  isPublic: boolean("is_public").default(false),
  sortOrder: integer("sort_order").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("flair_collections_user_idx").on(table.userId),
  nameIdx: index("flair_collections_name_idx").on(table.name),
}))

// Flair Collection items (many-to-many)
export const collectionItems = pgTable("flair_collection_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  
  addedAt: timestamp("added_at").defaultNow().notNull(),
  sortOrder: integer("sort_order").default(0), // For custom ordering within collection
  
}, (table) => ({
  collectionIdx: index("flair_collection_items_collection_idx").on(table.collectionId),
  productIdx: index("flair_collection_items_product_idx").on(table.productId),
  collectionProductIdx: index("flair_collection_items_collection_product_idx").on(table.collectionId, table.productId),
  // CRITICAL: Add unique constraint to prevent duplicates
  collectionProductUnique: unique("flair_collection_items_collection_product_unique").on(table.collectionId, table.productId),
}))

// Flair Chat conversations
export const chatConversations = pgTable("flair_chat_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  title: text("title").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("flair_chat_conversations_user_idx").on(table.userId),
  updatedAtIdx: index("flair_chat_conversations_updated_at_idx").on(table.updatedAt),
}))

// Flair Chat messages
export const chatMessages = pgTable("flair_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  
  content: text("content").notNull(),
  sender: text("sender").notNull(), // 'user' | 'assistant'
  
  // Attachments and metadata
  attachedFiles: json("attached_files"), // File attachments
  products: json("products"), // Product recommendations/mentions
  metadata: json("metadata"), // AI analysis results, etc.
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index("flair_chat_messages_conversation_idx").on(table.conversationId),
  senderIdx: index("flair_chat_messages_sender_idx").on(table.sender),
  createdAtIdx: index("flair_chat_messages_created_at_idx").on(table.createdAt),
}))

// Flair User activity log (for analytics and personalization)
export const userActivity = pgTable("flair_user_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  action: text("action").notNull(), // 'view_product', 'save_item', 'search', 'chat', etc.
  entityType: text("entity_type"), // 'product', 'collection', 'chat', etc.
  entityId: text("entity_id"), // ID of the entity
  
  metadata: json("metadata"), // Additional context data
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("flair_user_activity_user_idx").on(table.userId),
  actionIdx: index("flair_user_activity_action_idx").on(table.action),
  createdAtIdx: index("flair_user_activity_created_at_idx").on(table.createdAt),
}))

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  savedItems: many(userSavedItems),
  collections: many(collections),
  chatConversations: many(chatConversations),
  activities: many(userActivity),
}))

export const productsRelations = relations(products, ({ many }) => ({
  savedByUsers: many(userSavedItems),
  collectionItems: many(collectionItems),
}))

export const userSavedItemsRelations = relations(userSavedItems, ({ one }) => ({
  user: one(users, {
    fields: [userSavedItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [userSavedItems.productId],
    references: [products.id],
  }),
}))

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  items: many(collectionItems),
}))

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionItems.collectionId],
    references: [collections.id],
  }),
  product: one(products, {
    fields: [collectionItems.productId],
    references: [products.id],
  }),
}))

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}))

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}))

export const userActivityRelations = relations(userActivity, ({ one }) => ({
  user: one(users, {
    fields: [userActivity.userId],
    references: [users.id],
  }),
}))

// Types for easier use
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type UserSavedItem = typeof userSavedItems.$inferSelect
export type NewUserSavedItem = typeof userSavedItems.$inferInsert
export type Collection = typeof collections.$inferSelect
export type NewCollection = typeof collections.$inferInsert
export type CollectionItem = typeof collectionItems.$inferSelect
export type NewCollectionItem = typeof collectionItems.$inferInsert
export type ChatConversation = typeof chatConversations.$inferSelect
export type NewChatConversation = typeof chatConversations.$inferInsert
export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert
export type UserActivity = typeof userActivity.$inferSelect
export type NewUserActivity = typeof userActivity.$inferInsert
