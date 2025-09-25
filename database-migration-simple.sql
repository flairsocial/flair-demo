-- SIMPLE PERFORMANCE MIGRATION - RUN EACH COMMAND INDIVIDUALLY IN SUPABASE SQL EDITOR
-- Copy and paste these commands ONE AT A TIME into Supabase SQL Editor

-- 1. CRITICAL INDEXES (Run these first - one at a time)

-- Collections performance index
CREATE INDEX IF NOT EXISTS idx_collections_profile_id_created 
ON collections(profile_id, created_at DESC);

-- Community posts performance index  
CREATE INDEX IF NOT EXISTS idx_community_posts_public_created 
ON community_posts(is_public, created_at DESC) 
WHERE is_public = true;

-- Profile lookups index (most critical)
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id_unique 
ON profiles(clerk_id);

-- Saved items performance index
CREATE INDEX IF NOT EXISTS idx_saved_items_profile_created 
ON saved_items(profile_id, created_at DESC);

-- 2. ADD PERFORMANCE COLUMNS (Run as separate commands)

-- Add updated_at to collections
ALTER TABLE collections 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill updated_at for existing collections
UPDATE collections 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Add cache column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cache_expires_at TIMESTAMP WITH TIME ZONE;

-- 3. PERFORMANCE FUNCTIONS (Run individually)

-- Optimized collections function
CREATE OR REPLACE FUNCTION get_user_collections_fast(p_clerk_id VARCHAR)
RETURNS TABLE (
    id VARCHAR,
    name VARCHAR,
    color VARCHAR,
    description TEXT,
    item_count INTEGER,
    is_public BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    profile_uuid UUID;
BEGIN
    SELECT p.id INTO profile_uuid 
    FROM profiles p 
    WHERE p.clerk_id = p_clerk_id;
    
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.color,
        c.description,
        array_length(c.item_ids, 1) as item_count,
        c.is_public,
        c.created_at
    FROM collections c
    WHERE c.profile_id = profile_uuid
    ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 4. UPDATE TABLE STATISTICS (Run last)

ANALYZE collections;
ANALYZE community_posts;
ANALYZE profiles;
ANALYZE saved_items;

-- 5. VERIFICATION QUERY (Run to confirm everything worked)

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('collections', 'community_posts', 'profiles', 'saved_items')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;