-- Simplified Migration Script
-- Run this in your Supabase SQL Editor to fix the immediate issues

-- 1. Add missing columns to chat_messages table (safe - won't fail if columns exist)
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS attached_files JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

-- 2. Show current schema for verification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'saved_items', 'collections', 'chat_histories', 'chat_messages', 'chat_memory')
ORDER BY table_name, ordinal_position;

-- 3. Test that the problematic queries now work
SELECT 'Testing chat_messages queries...' as status;

-- Test query 1: Select with chat_history_id (should work)
SELECT COUNT(*) as chat_messages_count FROM chat_messages;

-- Test query 2: Check if attached_files column works
SELECT COUNT(*) as messages_with_files FROM chat_messages WHERE attached_files IS NOT NULL;

-- Test query 3: Check if products column works  
SELECT COUNT(*) as messages_with_products FROM chat_messages WHERE products IS NOT NULL;
