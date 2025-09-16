// Enhanced Chat Memory & Context Service - Database Version
import type { Product } from "./types"
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export interface ChatContext {
  userId: string
  sessionId: string
  discussedProducts: Product[]
  searchQueries: string[]
  userIntents: string[]
  stylePreferences: string[]
  lastSearchResults: Product[]
  conversationThemes: string[]
  timestamp: string
}

export interface ProductMention {
  product: Product
  context: string
  timestamp: string
  discussionPoints: string[]
}

export interface ConversationSummary {
  totalMessages: number
  productsMentioned: Product[]
  keyTopics: string[]
  lastActivity: string
}

// Get or create user profile in database
async function getOrCreateProfile(clerkId: string): Promise<string> {
  const supabase = getSupabaseClient()
  
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()
  
  if (existingProfile) {
    return existingProfile.id
  }

  // Create new profile
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      clerk_id: clerkId,
      username: `user_${clerkId.slice(-8)}`,
      display_name: 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (insertError) {
    throw new Error(`Failed to create profile: ${insertError.message}`)
  }

  return newProfile.id
}

// Store chat context in database
export async function storeChatContext(context: ChatContext): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(context.userId)

    const { error } = await supabase
      .from('ai_chat_memory')
      .upsert({
        profile_id: profileId,
        memory_data: {
          discussedProducts: context.discussedProducts,
          searchQueries: context.searchQueries,
          userIntents: context.userIntents,
          stylePreferences: context.stylePreferences,
          lastSearchResults: context.lastSearchResults,
          conversationThemes: context.conversationThemes,
          timestamp: context.timestamp
        },
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error storing chat context:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in storeChatContext:', error)
    return false
  }
}

// Retrieve chat context from database
export async function getChatContext(userId: string): Promise<ChatContext | null> {
  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(userId)

    const { data, error } = await supabase
      .from('ai_chat_memory')
      .select('memory_data')
      .eq('profile_id', profileId)
      .single()

    if (error || !data) {
      // Return default context if none exists
      return {
        userId,
        sessionId: Date.now().toString(),
        discussedProducts: [],
        searchQueries: [],
        userIntents: [],
        stylePreferences: [],
        lastSearchResults: [],
        conversationThemes: [],
        timestamp: new Date().toISOString()
      }
    }

    return {
      userId,
      sessionId: Date.now().toString(),
      ...data.memory_data,
      timestamp: data.memory_data.timestamp || new Date().toISOString()
    }
  } catch (error) {
    console.error('Error retrieving chat context:', error)
    return null
  }
}

// Save conversation to database
export async function saveConversation(
  userId: string,
  conversationId: string,
  title: string,
  messages: any[]
): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(userId)

    // Upsert conversation
    const { error: convError } = await supabase
      .from('ai_conversations')
      .upsert({
        id: conversationId,
        profile_id: profileId,
        title,
        message_count: messages.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })

    if (convError) {
      console.error('Error saving conversation:', convError)
      return false
    }

    // Save messages
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      await supabase
        .from('ai_messages')
        .upsert({
          conversation_id: conversationId,
          profile_id: profileId,
          role: message.sender === 'user' ? 'user' : 'assistant',
          content: message.content,
          sequence_number: i + 1,
          attached_files: message.attachedFiles || [],
          product_references: message.products || [],
          created_at: message.timestamp || new Date().toISOString()
        })
    }

    return true
  } catch (error) {
    console.error('Error in saveConversation:', error)
    return false
  }
}

// Load conversation from database
export async function loadConversation(userId: string, conversationId: string): Promise<any | null> {
  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(userId)

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('profile_id', profileId)
      .single()

    if (convError || !conversation) {
      return null
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: true })

    if (msgError) {
      console.error('Error loading messages:', msgError)
      return null
    }

    return {
      id: conversation.id,
      title: conversation.title,
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.role,
        timestamp: msg.created_at,
        attachedFiles: msg.attached_files || [],
        products: msg.product_references || []
      })),
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    }
  } catch (error) {
    console.error('Error in loadConversation:', error)
    return null
  }
}

// Get all conversations for a user
export async function getUserConversations(userId: string): Promise<any[]> {
  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(userId)

    const { data: conversations, error } = await supabase
      .from('ai_conversations')
      .select('id, title, message_count, created_at, updated_at, last_message_at')
      .eq('profile_id', profileId)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('Error getting user conversations:', error)
      return []
    }

    return conversations || []
  } catch (error) {
    console.error('Error in getUserConversations:', error)
    return []
  }
}

// Test the chat memory service
export async function testChatMemory(userId: string): Promise<void> {
  console.log('🧪 Testing chat memory service...')
  
  // Test storing context
  const testContext: ChatContext = {
    userId,
    sessionId: 'test-session',
    discussedProducts: [],
    searchQueries: ['summer dress', 'casual shoes'],
    userIntents: ['shopping', 'browsing'],
    stylePreferences: ['casual', 'modern'],
    lastSearchResults: [],
    conversationThemes: ['fashion', 'summer'],
    timestamp: new Date().toISOString()
  }
  
  const stored = await storeChatContext(testContext)
  console.log('✅ Context stored:', stored)
  
  // Test retrieving context
  const retrieved = await getChatContext(userId)
  console.log('✅ Context retrieved:', !!retrieved)
  
  // Test saving conversation
  const conversationId = 'test-conv-' + Date.now()
  const saved = await saveConversation(userId, conversationId, 'Test Chat', [
    { content: 'Hello', sender: 'user', timestamp: new Date().toISOString() },
    { content: 'Hi there!', sender: 'assistant', timestamp: new Date().toISOString() }
  ])
  console.log('✅ Conversation saved:', saved)
  
  // Test loading conversation
  const loaded = await loadConversation(userId, conversationId)
  console.log('✅ Conversation loaded:', !!loaded)
  
  // Test getting all conversations
  const conversations = await getUserConversations(userId)
  console.log('✅ User conversations:', conversations.length)
}

// Compatible interface for legacy code
export const chatMemoryService = {
  addDiscussedProduct: async (userId: string | undefined, product: Product, context: string) => {
    if (!userId) return
    
    try {
      let contextData = await getChatContext(userId)
      if (!contextData) {
        contextData = {
          userId,
          sessionId: Date.now().toString(),
          discussedProducts: [],
          searchQueries: [],
          userIntents: [],
          stylePreferences: [],
          lastSearchResults: [],
          conversationThemes: [],
          timestamp: new Date().toISOString()
        }
      }
      
      contextData.discussedProducts.push(product)
      contextData.conversationThemes.push('product discussion')
      contextData.timestamp = new Date().toISOString()
      await storeChatContext(contextData)
    } catch (error) {
      console.error('Error adding discussed product:', error)
    }
  },
  
  addSearchQuery: async (userId: string | undefined, query: string, searchType: string, results: Product[]) => {
    if (!userId) return
    
    try {
      let contextData = await getChatContext(userId)
      if (!contextData) {
        contextData = {
          userId,
          sessionId: Date.now().toString(),
          discussedProducts: [],
          searchQueries: [],
          userIntents: [],
          stylePreferences: [],
          lastSearchResults: [],
          conversationThemes: [],
          timestamp: new Date().toISOString()
        }
      }
      
      contextData.searchQueries.push(query)
      contextData.lastSearchResults = results.slice(0, 5) // Keep last 5 results
      contextData.userIntents.push(searchType)
      contextData.timestamp = new Date().toISOString()
      await storeChatContext(contextData)
    } catch (error) {
      console.error('Error adding search query:', error)
    }
  }
}