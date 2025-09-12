-- Clean Chat System Schema (Industry Standard)
-- This replaces the confusing chat_histories/chat_messages/chat_memory design

-- Drop existing problematic tables (if they exist)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_memory CASCADE;
DROP TABLE IF EXISTS chat_histories CASCADE;

-- 1. Conversations table (replaces chat_histories)
CREATE TABLE conversations (
    id TEXT PRIMARY KEY, -- Support frontend-generated IDs like "chat-123"
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Messages table (stores individual messages)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sequence_number INTEGER NOT NULL, -- For ordering messages
    attached_files JSONB DEFAULT '[]'::jsonb,
    products JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX idx_conversations_profile_id ON conversations(profile_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sequence ON messages(conversation_id, sequence_number);

-- 4. Add triggers for automatic timestamp updates
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Optional: Chat memory for AI context (separate from chat history)
CREATE TABLE chat_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    context_data JSONB DEFAULT '{}'::jsonb, -- AI memory, preferences, etc.
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_context_profile_id ON chat_context(profile_id);

CREATE TRIGGER update_chat_context_updated_at 
    BEFORE UPDATE ON chat_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Show the clean schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'chat_context')
ORDER BY table_name, ordinal_position;
