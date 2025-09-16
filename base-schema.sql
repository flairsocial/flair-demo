-- FLAIR SOCIAL - OPTIMAL MULTI-USER DATABASE SCHEMA
-- Designed for thousands of users with proper data isolation and performance
-- Version 2.0 - Complete redesign for scalability

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search performance

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

-- 1. PROFILES - Central user identity table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT UNIQUE NOT NULL, -- Clerk authentication ID
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
    
    -- Simple timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PRODUCT & COLLECTION MANAGEMENT
-- ============================================================================

-- 2. SAVED_ITEMS - User's saved products (properly isolated)
CREATE TABLE IF NOT EXISTS saved_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Product data (stored as JSONB for flexibility)
    product_id TEXT NOT NULL, -- External product ID
    product_data JSONB NOT NULL, -- Full product object
    
    -- Metadata
    notes TEXT, -- User's personal notes about this item
    tags TEXT[], -- User-defined tags
    
    -- Timestamps
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate saves
    UNIQUE(profile_id, product_id)
);

-- 3. COLLECTIONS - User's organized product collections
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY, -- Format: "col-{uuid}" for compatibility
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Collection details
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'bg-blue-500',
    custom_banner_url TEXT,
    
    -- Product references
    item_ids TEXT[] DEFAULT '{}', -- Array of product_id values
    item_count INTEGER DEFAULT 0, -- Denormalized count for performance
    
    -- Privacy & social
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false, -- Highlight on profile
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AI CHAT SYSTEM (Clean separation from direct messaging)
-- ============================================================================

-- 4. AI_CONVERSATIONS - User's AI chat sessions
CREATE TABLE IF NOT EXISTS ai_conversations (
    id TEXT PRIMARY KEY, -- Format: "chat-{uuid}"
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Conversation details
    title TEXT DEFAULT 'New Chat',
    summary TEXT, -- AI-generated conversation summary
    
    -- Stats
    message_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. AI_MESSAGES - Messages within AI conversations
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- Redundant but useful for queries
    
    -- Message content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sequence_number INTEGER NOT NULL, -- Order within conversation
    
    -- Attachments and context
    attached_files JSONB DEFAULT '[]',
    product_references JSONB DEFAULT '[]', -- Products mentioned in this message
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure message order integrity
    UNIQUE(conversation_id, sequence_number)
);

-- 6. AI_CHAT_MEMORY - Contextual memory for AI conversations
CREATE TABLE IF NOT EXISTS ai_chat_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Memory data
    memory_data JSONB NOT NULL, -- Stores ChatContext object
    
    -- Timestamps
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One memory record per user
    UNIQUE(profile_id)
);

-- ============================================================================
-- DIRECT MESSAGING SYSTEM (User-to-User)
-- ============================================================================

-- 7. DIRECT_CONVERSATIONS - Private conversations between users
CREATE TABLE IF NOT EXISTS direct_conversations (
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
CREATE TABLE IF NOT EXISTS direct_messages (
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
    product_reference JSONB, -- Shared product data
    
    -- Message state
    is_read BOOLEAN DEFAULT false,
    is_deleted_by_sender BOOLEAN DEFAULT false,
    is_deleted_by_recipient BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SOCIAL FEATURES
-- ============================================================================

-- 9. USER_FOLLOWS - Following relationships
CREATE TABLE IF NOT EXISTS user_follows (
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
CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY, -- Format: "post-{uuid}"
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Post content
    title TEXT,
    description TEXT,
    post_type TEXT CHECK (post_type IN ('collection', 'image', 'text', 'product')) DEFAULT 'text',
    
    -- References
    collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
    image_url TEXT,
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
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(post_id, profile_id)
);

-- 12. POST_COMMENTS - Comments on community posts
CREATE TABLE IF NOT EXISTS post_comments (
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
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id ON profiles(clerk_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(is_public) WHERE is_public = true;

-- Saved items indexes
CREATE INDEX IF NOT EXISTS idx_saved_items_profile_id ON saved_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_product_id ON saved_items(product_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_saved_at ON saved_items(profile_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_items_tags ON saved_items USING GIN(tags);

-- Collections indexes
CREATE INDEX IF NOT EXISTS idx_collections_profile_id ON collections(profile_id);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_collections_featured ON collections(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_collections_created ON collections(profile_id, created_at DESC);

-- AI conversation indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_profile_id ON ai_conversations(profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated ON ai_conversations(profile_id, updated_at DESC);

-- AI messages indexes
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_ai_messages_profile ON ai_messages(profile_id);

-- Direct messaging indexes
CREATE INDEX IF NOT EXISTS idx_direct_conv_participants ON direct_conversations(participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_direct_conv_participant_1 ON direct_conversations(participant_1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_conv_participant_2 ON direct_conversations(participant_2_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON direct_messages(conversation_id) WHERE is_read = false;

-- Social features indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_community_posts_public ON community_posts(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_community_posts_profile ON community_posts(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_featured ON community_posts(is_featured, created_at DESC) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_profile ON post_likes(profile_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_profile ON post_comments(profile_id);

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

-- Function to normalize conversation participants (ensure consistent ordering)
CREATE OR REPLACE FUNCTION normalize_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure participant_1_id is always the smaller UUID for consistent lookups
    IF NEW.participant_1_id > NEW.participant_2_id THEN
        -- Swap participants
        NEW.participant_1_id := OLD.participant_2_id;
        NEW.participant_2_id := OLD.participant_1_id;
    END IF;
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

-- Direct conversation normalization
CREATE TRIGGER trigger_normalize_direct_participants BEFORE INSERT OR UPDATE ON direct_conversations FOR EACH ROW EXECUTE FUNCTION normalize_conversation_participants();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- User profile with stats
CREATE OR REPLACE VIEW user_profiles_with_stats AS
SELECT 
    p.*,
    COUNT(DISTINCT c.id) as actual_collection_count,
    COUNT(DISTINCT si.id) as saved_items_count,
    COUNT(DISTINCT ac.id) as ai_conversation_count,
    COUNT(DISTINCT cp.id) as community_post_count
FROM profiles p
LEFT JOIN collections c ON p.id = c.profile_id
LEFT JOIN saved_items si ON p.id = si.profile_id  
LEFT JOIN ai_conversations ac ON p.id = ac.profile_id
LEFT JOIN community_posts cp ON p.id = cp.profile_id
GROUP BY p.id;

-- Public collections with owner info
CREATE OR REPLACE VIEW public_collections_with_owner AS
SELECT 
    c.*,
    p.username,
    p.display_name,
    p.profile_picture_url
FROM collections c
JOIN profiles p ON c.profile_id = p.id
WHERE c.is_public = true AND p.is_public = true;

-- Active direct conversations with participant info
CREATE OR REPLACE VIEW active_direct_conversations AS
SELECT 
    dc.*,
    p1.username as participant_1_username,
    p1.display_name as participant_1_display_name,
    p1.profile_picture_url as participant_1_avatar,
    p2.username as participant_2_username,
    p2.display_name as participant_2_display_name,
    p2.profile_picture_url as participant_2_avatar
FROM direct_conversations dc
JOIN profiles p1 ON dc.participant_1_id = p1.id
JOIN profiles p2 ON dc.participant_2_id = p2.id
WHERE dc.is_active = true;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show final table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN (
    'profiles', 'saved_items', 'collections', 
    'ai_conversations', 'ai_messages', 'ai_chat_memory',
    'direct_conversations', 'direct_messages',
    'user_follows', 'community_posts', 'post_likes', 'post_comments'
)
ORDER BY table_name, ordinal_position;