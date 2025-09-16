-- FLAIR SOCIAL - CLEAN DATABASE RESET
-- Drop everything and start fresh with optimal multi-user schema

-- ============================================================================
-- STEP 1: DROP ALL EXISTING TABLES (Clean Slate)
-- ============================================================================

-- Drop tables in reverse dependency order to avoid foreign key conflicts
DROP TABLE IF EXISTS post_comments CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS direct_conversations CASCADE;
DROP TABLE IF EXISTS ai_chat_memory CASCADE;
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_conversations CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS saved_items CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop any existing views
DROP VIEW IF EXISTS user_profiles_with_stats CASCADE;
DROP VIEW IF EXISTS public_collections_with_owner CASCADE;
DROP VIEW IF EXISTS active_direct_conversations CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_activity() CASCADE;
DROP FUNCTION IF EXISTS update_collection_item_count() CASCADE;
DROP FUNCTION IF EXISTS normalize_conversation_participants() CASCADE;

-- ============================================================================
-- STEP 2: APPLY OPTIMAL SCHEMA (Fresh Start)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. PROFILES - Central user identity table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    full_name TEXT,
    bio TEXT,
    profile_picture_url TEXT,
    avatar_url TEXT,
    
    -- Social stats
    is_public BOOLEAN DEFAULT true,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    collection_count INTEGER DEFAULT 0,
    
    -- Legacy compatibility
    data JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SAVED_ITEMS - User's saved products
CREATE TABLE saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Product data
    product_id TEXT NOT NULL,
    product_data JSONB NOT NULL,
    
    -- Metadata
    notes TEXT,
    tags TEXT[],
    
    -- Timestamps
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate saves
    UNIQUE(profile_id, product_id)
);

-- 3. COLLECTIONS - User's organized product collections
CREATE TABLE collections (
    id TEXT PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Collection details
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'bg-blue-500',
    custom_banner_url TEXT,
    
    -- Product references
    item_ids TEXT[] DEFAULT '{}',
    item_count INTEGER DEFAULT 0,
    
    -- Privacy & social
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AI_CONVERSATIONS - User's AI chat sessions
CREATE TABLE ai_conversations (
    id TEXT PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Conversation details
    title TEXT DEFAULT 'New Chat',
    summary TEXT,
    
    -- Stats
    message_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. AI_MESSAGES - Messages within AI conversations
CREATE TABLE ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    
    -- Attachments and context
    attached_files JSONB DEFAULT '[]',
    product_references JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure message order integrity
    UNIQUE(conversation_id, sequence_number)
);

-- 6. AI_CHAT_MEMORY - Contextual memory for AI conversations
CREATE TABLE ai_chat_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Memory data
    memory_data JSONB NOT NULL,
    
    -- Timestamps
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One memory record per user
    UNIQUE(profile_id)
);

-- 7. DIRECT_CONVERSATIONS - Private conversations between users
CREATE TABLE direct_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Conversation state
    is_active BOOLEAN DEFAULT true,
    is_archived_by_1 BOOLEAN DEFAULT false,
    is_archived_by_2 BOOLEAN DEFAULT false,
    
    -- Stats
    message_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_conversation UNIQUE (participant_1_id, participant_2_id),
    CONSTRAINT different_participants CHECK (participant_1_id != participant_2_id)
);

-- 8. DIRECT_MESSAGES - Messages in direct conversations
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'product')),
    
    -- Attachments
    image_url TEXT,
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    product_reference JSONB,
    
    -- Message state
    is_read BOOLEAN DEFAULT false,
    is_deleted_by_sender BOOLEAN DEFAULT false,
    is_deleted_by_recipient BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. USER_FOLLOWS - Following relationships
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Follow state
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(follower_id, following_id),
    CHECK(follower_id != following_id)
);

-- 10. COMMUNITY_POSTS - Public posts/collections shared to community
CREATE TABLE community_posts (
    id TEXT PRIMARY KEY,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Post content
    title TEXT,
    description TEXT,
    post_type TEXT CHECK (post_type IN ('collection', 'image', 'text', 'product', 'link')) DEFAULT 'text',
    
    -- References
    collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
    image_url TEXT,
    link_url TEXT,
    product_reference JSONB,
    
    -- Social stats
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Post state
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. POST_LIKES - Likes on community posts
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(post_id, profile_id)
);

-- 12. POST_COMMENTS - Comments on community posts
CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Profile indexes
CREATE INDEX idx_profiles_clerk_id ON profiles(clerk_id);
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_public ON profiles(is_public) WHERE is_public = true;

-- Saved items indexes
CREATE INDEX idx_saved_items_profile_id ON saved_items(profile_id);
CREATE INDEX idx_saved_items_product_id ON saved_items(product_id);
CREATE INDEX idx_saved_items_saved_at ON saved_items(profile_id, saved_at DESC);
CREATE INDEX idx_saved_items_tags ON saved_items USING GIN(tags);

-- Collections indexes
CREATE INDEX idx_collections_profile_id ON collections(profile_id);
CREATE INDEX idx_collections_public ON collections(is_public) WHERE is_public = true;
CREATE INDEX idx_collections_featured ON collections(is_featured) WHERE is_featured = true;
CREATE INDEX idx_collections_created ON collections(profile_id, created_at DESC);

-- AI conversation indexes
CREATE INDEX idx_ai_conversations_profile_id ON ai_conversations(profile_id);
CREATE INDEX idx_ai_conversations_updated ON ai_conversations(profile_id, updated_at DESC);

-- AI messages indexes
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, sequence_number);
CREATE INDEX idx_ai_messages_profile ON ai_messages(profile_id);

-- Direct messaging indexes
CREATE INDEX idx_direct_conv_participants ON direct_conversations(participant_1_id, participant_2_id);
CREATE INDEX idx_direct_conv_participant_1 ON direct_conversations(participant_1_id, last_message_at DESC);
CREATE INDEX idx_direct_conv_participant_2 ON direct_conversations(participant_2_id, last_message_at DESC);

CREATE INDEX idx_direct_messages_conversation ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX idx_direct_messages_unread ON direct_messages(conversation_id) WHERE is_read = false;

-- Social features indexes
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id) WHERE is_active = true;
CREATE INDEX idx_user_follows_following ON user_follows(following_id) WHERE is_active = true;

CREATE INDEX idx_community_posts_public ON community_posts(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX idx_community_posts_profile ON community_posts(profile_id, created_at DESC);
CREATE INDEX idx_community_posts_featured ON community_posts(is_featured, created_at DESC) WHERE is_featured = true;

CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_profile ON post_likes(profile_id);

CREATE INDEX idx_post_comments_post ON post_comments(post_id, created_at DESC);
CREATE INDEX idx_post_comments_profile ON post_comments(profile_id);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversation timestamps
CREATE OR REPLACE FUNCTION update_conversation_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'ai_messages' THEN
        UPDATE ai_conversations 
        SET last_message_at = NEW.created_at, updated_at = NEW.created_at, message_count = message_count + 1
        WHERE id = NEW.conversation_id;
    ELSIF TG_TABLE_NAME = 'direct_messages' THEN
        UPDATE direct_conversations 
        SET last_message_at = NEW.created_at, updated_at = NEW.created_at, message_count = message_count + 1
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update collection item count
CREATE OR REPLACE FUNCTION update_collection_item_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE collections 
    SET item_count = array_length(item_ids, 1), updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_saved_items_updated_at BEFORE UPDATE ON saved_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_direct_conversations_updated_at BEFORE UPDATE ON direct_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_direct_messages_updated_at BEFORE UPDATE ON direct_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_community_posts_updated_at BEFORE UPDATE ON community_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Conversation management triggers
CREATE TRIGGER trigger_ai_messages_conversation AFTER INSERT ON ai_messages FOR EACH ROW EXECUTE FUNCTION update_conversation_activity();
CREATE TRIGGER trigger_direct_messages_conversation AFTER INSERT ON direct_messages FOR EACH ROW EXECUTE FUNCTION update_conversation_activity();

-- Collection management triggers
CREATE TRIGGER trigger_collections_item_count AFTER UPDATE OF item_ids ON collections FOR EACH ROW EXECUTE FUNCTION update_collection_item_count();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '🎉 FLAIR SOCIAL DATABASE RESET COMPLETE!';
    RAISE NOTICE '✅ All tables created with optimal multi-user structure';
    RAISE NOTICE '✅ Performance indexes applied';
    RAISE NOTICE '✅ Triggers and functions configured';
    RAISE NOTICE '🚀 Database ready for thousands of users!';
END $$;