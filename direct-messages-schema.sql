-- Direct Messages Schema for User-to-User Communication
-- Separate from AI conversation system

-- Table for direct message conversations between users
CREATE TABLE IF NOT EXISTS direct_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    participant_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique conversation pairs (no duplicates)
    CONSTRAINT unique_conversation UNIQUE (participant_1_id, participant_2_id),
    -- Ensure users can't message themselves
    CONSTRAINT different_participants CHECK (participant_1_id != participant_2_id)
);

-- Table for individual direct messages
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    image_url TEXT,
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_direct_conversations_participant_1 ON direct_conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_participant_2 ON direct_conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_updated ON direct_conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_read ON direct_messages(is_read);

-- Function to update conversation timestamp when new message is added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE direct_conversations 
    SET 
        last_message_at = NEW.created_at,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update conversation timestamp
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON direct_messages;
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Function to ensure conversation participant order (smaller ID first)
CREATE OR REPLACE FUNCTION normalize_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure participant_1_id is always the smaller UUID
    IF NEW.participant_1_id > NEW.participant_2_id THEN
        NEW.participant_1_id := OLD.participant_2_id;
        NEW.participant_2_id := OLD.participant_1_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to normalize participant order
DROP TRIGGER IF EXISTS trigger_normalize_participants ON direct_conversations;
CREATE TRIGGER trigger_normalize_participants
    BEFORE INSERT OR UPDATE ON direct_conversations
    FOR EACH ROW
    EXECUTE FUNCTION normalize_conversation_participants();
