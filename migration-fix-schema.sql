-- Migration script to fix schema inconsistencies
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns to chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS attached_files JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

-- 2. Fix the chat_messages foreign key reference
-- First, check if the constraint exists and drop it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_messages_chat_id_fkey'
    ) THEN
        ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_chat_id_fkey;
    END IF;
END $$;

-- 3. Rename chat_id column to chat_history_id if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'chat_id'
    ) THEN
        ALTER TABLE chat_messages RENAME COLUMN chat_id TO chat_history_id;
    END IF;
END $$;

-- 4. Add the correct foreign key constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_messages_chat_history_id_fkey'
    ) THEN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT chat_messages_chat_history_id_fkey 
        FOREIGN KEY (chat_history_id) REFERENCES chat_histories(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Update the index name if it exists
DROP INDEX IF EXISTS idx_chat_messages_chat_id;
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_history_id ON chat_messages(chat_history_id);

-- 6. Ensure all tables have the correct structure
-- Verify profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'clerk_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN clerk_id TEXT NOT NULL UNIQUE;
    END IF;
END $$;

-- 7. Verify collections table has TEXT id (not UUID)
DO $$ 
BEGIN
    -- Check if collections.id is UUID type and convert if needed
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'collections' 
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
        -- This requires dropping and recreating the table if there's data
        -- For now, just ensure new schema is correct
        RAISE NOTICE 'Collections table id column is UUID - may need manual conversion';
    END IF;
END $$;

-- 8. Verify chat_histories table has TEXT id (not UUID)
DO $$ 
BEGIN
    -- Check if chat_histories.id is UUID type and convert if needed
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chat_histories' 
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
        -- This requires dropping and recreating the table if there's data
        -- For now, just ensure new schema is correct
        RAISE NOTICE 'Chat_histories table id column is UUID - may need manual conversion';
    END IF;
END $$;

-- 9. Show current schema for verification
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
