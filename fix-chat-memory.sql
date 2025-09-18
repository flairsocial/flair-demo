-- Fix Chat Memory Database Issues
-- This script fixes the unique constraint violation on ai_chat_memory table

-- First, let's see what duplicate records exist
SELECT profile_id, COUNT(*) as count 
FROM ai_chat_memory 
GROUP BY profile_id 
HAVING COUNT(*) > 1;

-- Remove all duplicate records, keeping only the most recent one
WITH ranked_memory AS (
  SELECT id, profile_id, 
         ROW_NUMBER() OVER (PARTITION BY profile_id ORDER BY updated_at DESC) as rn
  FROM ai_chat_memory
)
DELETE FROM ai_chat_memory 
WHERE id IN (
  SELECT id FROM ranked_memory WHERE rn > 1
);

-- Verify the unique constraint is satisfied
SELECT COUNT(*) as total_records, COUNT(DISTINCT profile_id) as unique_profiles
FROM ai_chat_memory;

-- If the counts don't match, there are still duplicates that need manual review