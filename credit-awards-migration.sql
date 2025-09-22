-- Migration to create credit_awards table for invite system
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS credit_awards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_clerk_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'invite_click',
  awarded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_at TIMESTAMP WITH TIME ZONE NULL
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_credit_awards_recipient ON credit_awards(recipient_clerk_id);
CREATE INDEX IF NOT EXISTS idx_credit_awards_applied ON credit_awards(applied_at) WHERE applied_at IS NULL;

-- Add RLS policies
ALTER TABLE credit_awards ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own credit awards
CREATE POLICY "Users can view their own credit awards" ON credit_awards
  FOR SELECT USING (recipient_clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow service role to manage all credit awards
CREATE POLICY "Service role can manage credit awards" ON credit_awards
  FOR ALL USING (auth.role() = 'service_role');
