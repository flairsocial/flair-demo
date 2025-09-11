# Database Setup Guide

## Prerequisites

1. **Database Choice**: We recommend PostgreSQL with Supabase for the best experience
2. **Authentication**: Integration with your existing Clerk setup
3. **ORM**: Drizzle ORM for type-safety and performance

## Quick Setup Options

### Option 1: Supabase (Recommended for MVP)
```bash
# 1. Install dependencies
npm install drizzle-orm @supabase/supabase-js
npm install -D drizzle-kit

# 2. Create Supabase project at supabase.com
# 3. Get your connection details from project settings
```

### Option 2: Local PostgreSQL
```bash
# 1. Install PostgreSQL locally
# 2. Create database
createdb flair_social

# 3. Install dependencies
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
```

### Option 3: PlanetScale (Alternative)
```bash
# 1. Create PlanetScale account and database
# 2. Install dependencies
npm install drizzle-orm @planetscale/database
npm install -D drizzle-kit
```

## Environment Variables

Add to your `.env.local`:

```env
# For Supabase
DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/[database]?schema=public"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"

# For local PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/flair_social"

# For PlanetScale
DATABASE_URL="mysql://username:password@host/database?ssl={"rejectUnauthorized":true}"
```

## Migration Commands

```bash
# Generate migrations
npx drizzle-kit generate:pg

# Apply migrations
npx drizzle-kit push:pg

# Studio (database GUI)
npx drizzle-kit studio
```

## Performance Optimization

1. **Indexes**: Already included in schema for common queries
2. **Connection Pooling**: Use PgBouncer for production
3. **Caching**: Implement Redis for frequently accessed data
4. **CDN**: Use Cloudflare/Vercel for static assets

## Migration from Current System

The new database service will:
- ✅ Handle user-specific data with proper isolation
- ✅ Scale to thousands of users and millions of items
- ✅ Enable real-time features (chat, notifications)
- ✅ Support advanced queries (search, recommendations)
- ✅ Maintain data integrity with relationships
- ✅ Provide analytics and insights

## Next Steps

1. Choose your database provider
2. Install dependencies
3. Set up environment variables
4. Run migrations
5. Update API routes to use new database service
