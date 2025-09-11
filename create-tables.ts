import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createTablesDirectly() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found');
    return;
  }

  console.log('🚀 Creating database tables...');

  try {
    const client = postgres(connectionString, {
      prepare: false,
    });

    // Create tables one by one
    const createStatements = [
      // Users table
      `CREATE TABLE IF NOT EXISTS "users" (
        "id" text PRIMARY KEY NOT NULL,
        "email" text NOT NULL UNIQUE,
        "first_name" text,
        "last_name" text,
        "image_url" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "profile_data" json
      );`,
      
      // Products table
      `CREATE TABLE IF NOT EXISTS "products" (
        "id" text PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "description" text,
        "price" integer NOT NULL,
        "original_price" integer,
        "brand" text,
        "category" text,
        "image" text NOT NULL,
        "url" text,
        "specifications" json,
        "reviews" json,
        "availability" json,
        "real_time_data" json,
        "search_vector" text,
        "tags" json,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );`,
      
      // Collections table
      `CREATE TABLE IF NOT EXISTS "collections" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" text NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "color" text DEFAULT '#3b82f6' NOT NULL,
        "custom_banner" text,
        "is_public" boolean DEFAULT false,
        "sort_order" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
      );`,
      
      // User saved items table
      `CREATE TABLE IF NOT EXISTS "user_saved_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" text NOT NULL,
        "product_id" text NOT NULL,
        "saved_at" timestamp DEFAULT now() NOT NULL,
        "notes" text,
        "priority" integer DEFAULT 0,
        "saved_price" integer,
        "saved_from_url" text,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
        FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade
      );`,
      
      // Collection items table
      `CREATE TABLE IF NOT EXISTS "collection_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "collection_id" uuid NOT NULL,
        "product_id" text NOT NULL,
        "added_at" timestamp DEFAULT now() NOT NULL,
        "sort_order" integer DEFAULT 0,
        FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE cascade,
        FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade
      );`,
      
      // Chat conversations table
      `CREATE TABLE IF NOT EXISTS "chat_conversations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" text NOT NULL,
        "title" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
      );`,
      
      // Chat messages table
      `CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "conversation_id" uuid NOT NULL,
        "content" text NOT NULL,
        "sender" text NOT NULL,
        "attached_files" json,
        "products" json,
        "metadata" json,
        "created_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE cascade
      );`,
      
      // User activity table
      `CREATE TABLE IF NOT EXISTS "user_activity" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" text NOT NULL,
        "action" text NOT NULL,
        "entity_type" text,
        "entity_id" text,
        "metadata" json,
        "created_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
      );`
    ];

    for (let i = 0; i < createStatements.length; i++) {
      const statement = createStatements[i];
      console.log(`🔄 Creating table ${i + 1}/${createStatements.length}...`);
      
      try {
        await client.unsafe(statement);
        console.log(`✅ Table ${i + 1} created successfully`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Table ${i + 1} already exists, skipping`);
        } else {
          console.error(`❌ Table ${i + 1} creation failed:`, error.message);
        }
      }
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");',
      'CREATE INDEX IF NOT EXISTS "products_title_idx" ON "products" ("title");',
      'CREATE INDEX IF NOT EXISTS "products_brand_idx" ON "products" ("brand");',
      'CREATE INDEX IF NOT EXISTS "products_category_idx" ON "products" ("category");',
      'CREATE INDEX IF NOT EXISTS "products_price_idx" ON "products" ("price");',
      'CREATE INDEX IF NOT EXISTS "collections_user_idx" ON "collections" ("user_id");',
      'CREATE INDEX IF NOT EXISTS "user_saved_items_user_idx" ON "user_saved_items" ("user_id");',
      'CREATE INDEX IF NOT EXISTS "user_saved_items_product_idx" ON "user_saved_items" ("product_id");',
      'CREATE INDEX IF NOT EXISTS "chat_conversations_user_idx" ON "chat_conversations" ("user_id");',
      'CREATE INDEX IF NOT EXISTS "chat_messages_conversation_idx" ON "chat_messages" ("conversation_id");',
      'CREATE INDEX IF NOT EXISTS "user_activity_user_idx" ON "user_activity" ("user_id");'
    ];

    console.log('🔍 Creating indexes...');
    for (const index of indexes) {
      try {
        await client.unsafe(index);
      } catch (error: any) {
        if (!error.message.includes('already exists')) {
          console.warn('Index creation warning:', error.message);
        }
      }
    }

    console.log('✅ All tables and indexes created successfully!');
    
    // Test the tables
    const result = await client`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'products', 'collections', 'user_saved_items')`;
    console.log('📊 Created tables:', result.map(r => r.table_name));
    
    await client.end();
    console.log('🔌 Connection closed');
    
  } catch (error) {
    console.error('❌ Table creation failed:', error);
  }
}

createTablesDirectly();
