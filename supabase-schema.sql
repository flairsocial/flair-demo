-- Supabase Database Schema for Flair Demo
-- Run this SQL in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (maps to Clerk users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  data JSONB DEFAULT '{}'::jsonb, -- profile attributes (height, style, etc)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create saved_items table
CREATE TABLE saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product JSONB NOT NULL, -- original product object
  saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collections table
CREATE TABLE collections (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT to support frontend-generated IDs like "col-1"
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  description TEXT,
  item_ids TEXT[] DEFAULT '{}', -- array of product IDs or saved_items IDs
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_histories table (conversations)
CREATE TABLE chat_histories (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT to support frontend-generated IDs like "chat-123"
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_history_id TEXT REFERENCES chat_histories(id) ON DELETE CASCADE, -- Changed reference to TEXT
  content TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  sequence_number INTEGER NOT NULL,
  attached_files JSONB DEFAULT '[]'::jsonb, -- Add attached_files column
  products JSONB DEFAULT '[]'::jsonb -- Add products column
);

-- Create chat_memory table (one record per user)
CREATE TABLE chat_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  memory JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_clerk_id ON profiles(clerk_id);
CREATE INDEX idx_saved_items_profile_id ON saved_items(profile_id);
CREATE INDEX idx_collections_profile_id ON collections(profile_id);
CREATE INDEX idx_chat_histories_profile_id ON chat_histories(profile_id);
CREATE INDEX idx_chat_messages_chat_history_id ON chat_messages(chat_history_id);
CREATE INDEX idx_chat_memory_profile_id ON chat_memory(profile_id);

-- Add function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_histories_updated_at BEFORE UPDATE ON chat_histories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_memory_updated_at BEFORE UPDATE ON chat_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
