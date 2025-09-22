// UPDATED DATABASE SERVICE for Multi-User Architecture
// This service works with the new optimized schema for thousands of users

import { createClient } from '@supabase/supabase-js'
import type { Product } from './types'
import { sendSMSNotification, shouldSendSMSNotification, getUserPhoneNumber } from './sms-notification-service'
import { checkSMSRateLimit } from './sms-utils'

// Re-export types for compatibility
export interface Collection {
  id: string
  name: string
  color: string
  createdAt: string
  itemIds: string[]
  description?: string
  customBanner?: string
  isPublic?: boolean
}

export interface SavedItemWithMetadata extends Product {
  savedAt: string
  userId: string
}

export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: string
  attachedFiles?: any[]
  products?: Product[]
}

export interface ChatHistory {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
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

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      nodeEnv: process.env.NODE_ENV
    })
    throw new Error('Missing required Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'apikey': supabaseServiceKey
      }
    }
  })
}

// Helper function to get or create profile by clerk_id
export async function getOrCreateProfile(clerkId: string): Promise<string> {
  if (!clerkId) {
    throw new Error('ClerkId is required')
  }

  const supabase = getSupabaseClient()
  
  console.log(`[Database] Getting profile for clerk_id: ${clerkId}`)
  
  // Try to get existing profile
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()
  
  if (existingProfile) {
    console.log(`[Database] Found existing profile: ${existingProfile.id}`)
    return existingProfile.id
  }
  
  if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Database error in getOrCreateProfile:', {
      message: selectError.message || 'Unknown error',
      details: selectError.details || 'No details',
      hint: selectError.hint || 'No hint',
      code: selectError.code || 'No code',
      clerkId: clerkId,
      fullError: selectError
    })
    throw new Error(`Failed to fetch profile: ${selectError.message}`)
  }
  
  console.log(`[Database] Creating new profile for clerk_id: ${clerkId}`)
  
  // Create new profile with basic data
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      clerk_id: clerkId,
      username: `user_${clerkId.slice(-8)}`,
      display_name: 'User',
      profile_picture_url: null,
      is_public: true,
      data: {}
    })
    .select('id')
    .single()
  
  if (insertError) {
    // If it's a duplicate key error, try to get the existing profile
    if (insertError.code === '23505') {
      console.log(`[Database] Profile already exists for clerk_id: ${clerkId}, fetching existing...`)
      const { data: existingProfile, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_id', clerkId)
        .single()
      
      if (existingError || !existingProfile) {
        console.error(`Failed to fetch existing profile: ${existingError?.message}`)
        throw new Error(`Failed to fetch existing profile: ${existingError?.message}`)
      }
      
      return existingProfile.id
    }
    
    console.error(`Failed to create profile: ${insertError?.message}`)
    throw new Error(`Failed to create profile: ${insertError?.message}`)
  }
  
  if (!newProfile) {
    throw new Error('Failed to create profile: No data returned')
  }
  
  console.log(`[Database] Created new profile: ${newProfile.id} for clerk_id: ${clerkId}`)
  return newProfile.id
}

// ============================================================================
// PROFILE FUNCTIONS
// ============================================================================

export async function getProfile(clerkId: string) {
  if (!clerkId) return null

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('data')
      .eq('clerk_id', clerkId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[Database] Error getting profile:', error)
      return null
    }

    return data?.data || null
  } catch (error) {
    console.error('[Database] Error getting profile:', error)
    return null
  }
}

export async function setProfile(clerkId: string, profile: any) {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('profiles')
      .update({ data: profile })
      .eq('id', profileId)
    
    if (error) {
      console.error('[Database] Error setting profile:', error)
    } else {
      console.log(`[Database] Saved profile for clerk_id: ${clerkId}`)
    }
  } catch (error) {
    console.error('[Database] Error setting profile:', error)
  }
}

export async function hasProfile(clerkId: string): Promise<boolean> {
  if (!clerkId) return false
  
  try {
    const profile = await getProfile(clerkId)
    return profile && Object.keys(profile).length > 0
  } catch (error) {
    console.error('[Database] Error checking profile:', error)
    return false
  }
}

// ============================================================================
// SAVED ITEMS FUNCTIONS (Updated for new schema)
// ============================================================================

export async function getSavedItems(clerkId: string): Promise<Product[]> {
  if (!clerkId) return []
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    console.log(`[Database] Getting saved items for profile: ${profileId}`)
    
    const { data, error } = await supabase
      .from('saved_items')
      .select('product_id, product_data, saved_at')
      .eq('profile_id', profileId)
      .order('saved_at', { ascending: false })
    
    if (error) {
      console.error('[Database] Error getting saved items:', error)
      return []
    }
    
    console.log(`[Database] Found ${data?.length || 0} saved items for clerk_id: ${clerkId}`)
    
    return (data || []).map((item: any) => ({
      ...item.product_data,
      saved: true
    }))
  } catch (error) {
    console.error('[Database] Error getting saved items:', error)
    return []
  }
}

export async function setSavedItems(clerkId: string, items: Product[]): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    console.log(`[Database] Setting ${items.length} saved items for clerk_id: ${clerkId}`)
    
    // Delete existing items
    await supabase
      .from('saved_items')
      .delete()
      .eq('profile_id', profileId)
    
    // Insert new items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        profile_id: profileId,
        product_id: item.id,
        product_data: item
      }))
      
      const { error } = await supabase
        .from('saved_items')
        .insert(itemsToInsert)
      
      if (error) {
        console.error('[Database] Error setting saved items:', error)
      } else {
        console.log(`[Database] Saved ${items.length} items for clerk_id: ${clerkId}`)
      }
    }
  } catch (error) {
    console.error('[Database] Error setting saved items:', error)
  }
}

export async function addSavedItem(clerkId: string, item: Product): Promise<void> {
  if (!clerkId) return
  
  try {
    console.log(`[Database] Adding saved item for clerk_id: ${clerkId}, item: ${item.title}`)
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('saved_items')
      .insert({
        profile_id: profileId,
        product_id: item.id,
        product_data: { ...item, saved: true }
      })
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        console.log(`[Database] Item already exists in saved items: ${item.title}`)
      } else {
        console.error('[Database] Error adding saved item:', error)
      }
    } else {
      console.log(`[Database] Successfully added saved item: ${item.title}`)
    }
  } catch (error) {
    console.error('[Database] Error adding saved item:', error)
  }
}

export async function removeSavedItem(clerkId: string, itemId: string): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    console.log(`[Database] Removing saved item ${itemId} for clerk_id: ${clerkId}`)
    
    // Remove from saved items
    await supabase
      .from('saved_items')
      .delete()
      .eq('profile_id', profileId)
      .eq('product_id', itemId)
    
    // Also remove from all collections
    const { data: collections } = await supabase
      .from('collections')
      .select('id, item_ids')
      .eq('profile_id', profileId)
    
    if (collections) {
      for (const collection of collections) {
        const updatedItemIds = collection.item_ids.filter((id: string) => id !== itemId)
        if (updatedItemIds.length !== collection.item_ids.length) {
          await supabase
            .from('collections')
            .update({ 
              item_ids: updatedItemIds,
              item_count: updatedItemIds.length
            })
            .eq('id', collection.id)
        }
      }
    }
    
    console.log(`[Database] Successfully removed saved item: ${itemId}`)
  } catch (error) {
    console.error('[Database] Error removing saved item:', error)
  }
}

// ============================================================================
// COLLECTIONS FUNCTIONS (Updated for new schema)
// ============================================================================

export async function getCollections(clerkId: string): Promise<Collection[]> {
  if (!clerkId) return getDefaultCollections()
  
  try {
    console.log(`[Database] getCollections called for clerk_id: ${clerkId}`)
    const profileId = await getOrCreateProfile(clerkId)
    console.log(`[Database] Profile ID for ${clerkId}: ${profileId}`)
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('[Database] Error getting collections:', error)
      return getDefaultCollections(clerkId)
    }
    
    console.log(`[Database] Found ${data?.length || 0} collections for clerk_id: ${clerkId}`)
    
    if (!data || data.length === 0) {
      // Create default collections
      console.log(`[Database] No collections found for ${clerkId}, creating default collections...`)
      const defaultCollections = getDefaultCollections(clerkId)
      console.log(`[Database] Default collections to create:`, defaultCollections.map(c => ({ id: c.id, name: c.name })))
      await setCollections(clerkId, defaultCollections)
      console.log(`[Database] Default collections created for ${clerkId}`)
      return defaultCollections
    }
    
    const mappedCollections = data.map((col: any) => ({
      id: col.id,
      name: col.name,
      color: col.color,
      createdAt: col.created_at,
      itemIds: col.item_ids || [],
      description: col.description,
      customBanner: col.custom_banner_url,
      isPublic: col.is_public ?? true
    }))
    
    console.log(`[Database] Returning ${mappedCollections.length} collections for clerk_id: ${clerkId}`)
    return mappedCollections
  } catch (error) {
    console.error('[Database] Error getting collections:', error)
    return getDefaultCollections(clerkId)
  }
}

function getDefaultCollections(userId?: string): Collection[] {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substr(2, 9)
  const userSuffix = userId ? `-${userId.slice(-8)}` : ''

  return [
    {
      id: `col-${timestamp}-${randomSuffix}-1${userSuffix}`,
      name: 'Summer Essentials',
      color: 'bg-amber-500',
      createdAt: new Date().toISOString(),
      itemIds: [],
      isPublic: true
    },
    {
      id: `col-${timestamp}-${randomSuffix}-2${userSuffix}`,
      name: 'Work Outfits',
      color: 'bg-blue-500',
      createdAt: new Date().toISOString(),
      itemIds: [],
      isPublic: true
    },
    {
      id: `col-${timestamp}-${randomSuffix}-3${userSuffix}`,
      name: 'Casual Weekend',
      color: 'bg-green-500',
      createdAt: new Date().toISOString(),
      itemIds: [],
      isPublic: true
    },
    {
      id: `col-${timestamp}-${randomSuffix}-4${userSuffix}`,
      name: 'Evening Wear',
      color: 'bg-purple-500',
      createdAt: new Date().toISOString(),
      itemIds: [],
      isPublic: true
    },
    {
      id: `col-${timestamp}-${randomSuffix}-5${userSuffix}`,
      name: 'Wishlist',
      color: 'bg-pink-500',
      createdAt: new Date().toISOString(),
      itemIds: [],
      isPublic: true
    }
  ]
}

export async function setCollections(clerkId: string, collections: Collection[]): Promise<void> {
  if (!clerkId) return

  try {
    console.log(`[Database] setCollections called for clerk_id: ${clerkId} with ${collections.length} collections`)
    const profileId = await getOrCreateProfile(clerkId)
    console.log(`[Database] Profile ID for setCollections: ${profileId}`)
    const supabase = getSupabaseClient()

    // Insert new collections one by one to handle duplicates gracefully
    const successfullyInsertedCollections: Collection[] = []

    for (const collection of collections) {
      try {
        const collectionToInsert = {
          id: collection.id,
          profile_id: profileId,
          name: collection.name,
          color: collection.color,
          description: collection.description,
          item_ids: collection.itemIds || [],
          item_count: collection.itemIds?.length || 0,
          is_public: collection.isPublic ?? true,
          custom_banner_url: collection.customBanner,
          metadata: {}
        }

        console.log(`[Database] Inserting collection: ${collection.id} - ${collection.name}`)

        const { error } = await supabase
          .from('collections')
          .insert(collectionToInsert)

        if (error) {
          if (error.code === '23505') {
            console.log(`[Database] Collection ${collection.id} already exists, skipping...`)
            // Check if it exists and update it instead
            const { error: updateError } = await supabase
              .from('collections')
              .update({
                name: collection.name,
                color: collection.color,
                description: collection.description,
                item_ids: collection.itemIds || [],
                item_count: collection.itemIds?.length || 0,
                is_public: collection.isPublic ?? true,
                custom_banner_url: collection.customBanner
              })
              .eq('id', collection.id)
              .eq('profile_id', profileId)

            if (!updateError) {
              console.log(`[Database] Updated existing collection: ${collection.id}`)
              successfullyInsertedCollections.push(collection)
            } else {
              console.error(`[Database] Error updating collection ${collection.id}:`, updateError)
            }
          } else {
            console.error(`[Database] Error inserting collection ${collection.id}:`, error)
          }
        } else {
          console.log(`[Database] Successfully inserted collection: ${collection.id}`)
          successfullyInsertedCollections.push(collection)
        }
      } catch (error) {
        console.error(`[Database] Unexpected error with collection ${collection.id}:`, error)
      }
    }

    console.log(`[Database] Successfully processed ${successfullyInsertedCollections.length} collections for clerk_id: ${clerkId}`)

    // Auto-create community posts for successfully inserted public collections with items
    for (const collection of successfullyInsertedCollections) {
      if (collection.itemIds && collection.itemIds.length > 0 && collection.isPublic !== false) {
        try {
          await createPostForCollection(clerkId, collection)
        } catch (error) {
          console.error(`[Database] Error creating community post for collection ${collection.id}:`, error)
        }
      }
    }
  } catch (error) {
    console.error('[Database] Error setting collections:', error)
    console.error('[Database] Full error details:', error)
  }
}

// Rest of the functions remain the same but with updated table names...
// (I'll continue with the key functions to keep this manageable)

export async function addCollection(clerkId: string, collection: Collection): Promise<void> {
  if (!clerkId) return
  
  try {
    const currentCollections = await getCollections(clerkId)
    await setCollections(clerkId, [...currentCollections, collection])
    
    // Auto-create community post if it's a public collection with items
    if (collection.itemIds && collection.itemIds.length > 0 && collection.isPublic !== false) {
      await createPostForCollection(clerkId, collection)
    }
  } catch (error) {
    console.error('[Database] Error adding collection:', error)
  }
}

export async function updateCollection(clerkId: string, collectionId: string, updates: Partial<Collection>): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic
    if (updates.customBanner !== undefined) updateData.custom_banner_url = updates.customBanner
    
    const { error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', collectionId)
      .eq('profile_id', profileId)
    
    if (error) {
      console.error('[Database] Error updating collection:', error)
    }
  } catch (error) {
    console.error('[Database] Error updating collection:', error)
  }
}

export async function addItemToCollection(clerkId: string, itemId: string, collectionId: string): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { data: collection, error } = await supabase
      .from('collections')
      .select('item_ids')
      .eq('profile_id', profileId)
      .eq('id', collectionId)
      .single()
    
    if (error || !collection) {
      console.error('[Database] Error getting collection:', error)
      return
    }
    
    const currentItemIds = collection.item_ids || []
    if (!currentItemIds.includes(itemId)) {
      const updatedItemIds = [...currentItemIds, itemId]
      
      await supabase
        .from('collections')
        .update({ 
          item_ids: updatedItemIds,
          item_count: updatedItemIds.length
        })
        .eq('profile_id', profileId)
        .eq('id', collectionId)
    }
  } catch (error) {
    console.error('[Database] Error adding item to collection:', error)
  }
}

export async function removeItemFromCollection(clerkId: string, itemId: string, collectionId: string): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { data: collection, error } = await supabase
      .from('collections')
      .select('item_ids')
      .eq('profile_id', profileId)
      .eq('id', collectionId)
      .single()
    
    if (error || !collection) {
      console.error('[Database] Error getting collection:', error)
      return
    }
    
    const currentItemIds = collection.item_ids || []
    const updatedItemIds = currentItemIds.filter((id: string) => id !== itemId)
    
    if (updatedItemIds.length !== currentItemIds.length) {
      await supabase
        .from('collections')
        .update({ 
          item_ids: updatedItemIds,
          item_count: updatedItemIds.length
        })
        .eq('profile_id', profileId)
        .eq('id', collectionId)
    }
  } catch (error) {
    console.error('[Database] Error removing item from collection:', error)
  }
}

export async function removeCollection(clerkId: string, collectionId: string): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    console.log(`[Database] Removing collection ${collectionId} for clerk_id: ${clerkId}`)
    
    // First remove any community posts for this collection
    await removePostForCollection(clerkId, collectionId)
    
    // Then delete the collection
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('profile_id', profileId)
      .eq('id', collectionId)
    
    if (error) {
      console.error('[Database] Error removing collection:', error)
    } else {
      console.log(`[Database] Successfully removed collection: ${collectionId}`)
    }
  } catch (error) {
    console.error('[Database] Error removing collection:', error)
  }
}

// ============================================================================
// AI CHAT FUNCTIONS (New for conversation storage)
// ============================================================================

export async function getChatHistory(clerkId: string): Promise<ChatHistory[]> {
  if (!clerkId) return []
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    console.log(`[Database] Getting chat history for profile: ${profileId}`)
    
    const { data: conversations, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('profile_id', profileId)
      .order('last_message_at', { ascending: false })
    
    if (error) {
      console.error('[Database] Error getting chat conversations:', error)
      return []
    }
    
    if (!conversations || conversations.length === 0) {
      console.log(`[Database] No chat conversations found for clerk_id: ${clerkId}`)
      return []
    }
    
    // Get messages for each conversation
    const chatHistories: ChatHistory[] = []
    
    for (const conversation of conversations) {
      const { data: messages, error: messagesError } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('sequence_number', { ascending: true })
      
      if (messagesError) {
        console.error(`[Database] Error getting messages for conversation ${conversation.id}:`, messagesError)
        continue
      }
      
      const chatMessages: ChatMessage[] = (messages || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.role as 'user' | 'assistant',
        timestamp: msg.created_at,
        attachedFiles: msg.attached_files || [],
        products: msg.product_references || []
      }))
      
      chatHistories.push({
        id: conversation.id,
        title: conversation.title,
        messages: chatMessages,
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      })
    }
    
    console.log(`[Database] Found ${chatHistories.length} chat histories for clerk_id: ${clerkId}`)
    return chatHistories
  } catch (error) {
    console.error('[Database] Error getting chat history:', error)
    return []
  }
}

export async function addChatHistory(clerkId: string, chatHistory: ChatHistory): Promise<void> {
  if (!clerkId || !chatHistory.messages.length) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    console.log(`[Database] Adding chat history for clerk_id: ${clerkId}, conversation: ${chatHistory.id}`)
    
    // Create conversation record
    const { error: conversationError } = await supabase
      .from('ai_conversations')
      .insert({
        id: chatHistory.id,
        profile_id: profileId,
        title: chatHistory.title,
        message_count: chatHistory.messages.length,
        created_at: chatHistory.createdAt,
        updated_at: chatHistory.updatedAt,
        last_message_at: chatHistory.messages[chatHistory.messages.length - 1]?.timestamp || chatHistory.updatedAt
      })
    
    if (conversationError) {
      console.error('[Database] Error creating conversation:', conversationError)
      return
    }
    
    // Insert messages
    if (chatHistory.messages.length > 0) {
      const messagesToInsert = chatHistory.messages.map((msg, index) => ({
        conversation_id: chatHistory.id,
        profile_id: profileId,
        role: msg.sender,
        content: msg.content,
        sequence_number: index + 1,
        attached_files: msg.attachedFiles || [],
        product_references: msg.products || [],
        created_at: msg.timestamp
      }))
      
      const { error: messagesError } = await supabase
        .from('ai_messages')
        .insert(messagesToInsert)
      
      if (messagesError) {
        console.error('[Database] Error inserting messages:', messagesError)
      } else {
        console.log(`[Database] Successfully added chat history with ${chatHistory.messages.length} messages`)
      }
    }
  } catch (error) {
    console.error('[Database] Error adding chat history:', error)
  }
}

export async function updateChatHistory(clerkId: string, chatId: string, messages: ChatMessage[]): Promise<void> {
  if (!clerkId || !chatId || !messages.length) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    console.log(`[Database] Updating chat history for clerk_id: ${clerkId}, conversation: ${chatId}`)
    
    // Clear existing messages
    await supabase
      .from('ai_messages')
      .delete()
      .eq('conversation_id', chatId)
      .eq('profile_id', profileId)
    
    // Insert updated messages
    const messagesToInsert = messages.map((msg, index) => ({
      conversation_id: chatId,
      profile_id: profileId,
      role: msg.sender,
      content: msg.content,
      sequence_number: index + 1,
      attached_files: msg.attachedFiles || [],
      product_references: msg.products || [],
      created_at: msg.timestamp
    }))
    
    const { error: messagesError } = await supabase
      .from('ai_messages')
      .insert(messagesToInsert)
    
    if (messagesError) {
      console.error('[Database] Error updating messages:', messagesError)
      return
    }
    
    // Update conversation metadata
    const lastMessage = messages[messages.length - 1]
    const { error: conversationError } = await supabase
      .from('ai_conversations')
      .update({
        message_count: messages.length,
        updated_at: new Date().toISOString(),
        last_message_at: lastMessage.timestamp
      })
      .eq('id', chatId)
      .eq('profile_id', profileId)
    
    if (conversationError) {
      console.error('[Database] Error updating conversation:', conversationError)
    } else {
      console.log(`[Database] Successfully updated chat history with ${messages.length} messages`)
    }
  } catch (error) {
    console.error('[Database] Error updating chat history:', error)
  }
}

export async function deleteChatHistory(clerkId: string, chatId: string): Promise<void> {
  if (!clerkId || !chatId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    console.log(`[Database] Deleting chat history for clerk_id: ${clerkId}, conversation: ${chatId}`)
    
    // Delete messages first (foreign key constraint)
    await supabase
      .from('ai_messages')
      .delete()
      .eq('conversation_id', chatId)
      .eq('profile_id', profileId)
    
    // Delete conversation
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', chatId)
      .eq('profile_id', profileId)
    
    if (error) {
      console.error('[Database] Error deleting chat history:', error)
    } else {
      console.log(`[Database] Successfully deleted chat history: ${chatId}`)
    }
  } catch (error) {
    console.error('[Database] Error deleting chat history:', error)
  }
}

export async function renameChatHistory(clerkId: string, chatId: string, newTitle: string): Promise<void> {
  if (!clerkId || !chatId || !newTitle) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    console.log(`[Database] Renaming chat history for clerk_id: ${clerkId}, conversation: ${chatId} to: "${newTitle}"`)
    
    const { error } = await supabase
      .from('ai_conversations')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('id', chatId)
      .eq('profile_id', profileId)
    
    if (error) {
      console.error('[Database] Error renaming chat history:', error)
    } else {
      console.log(`[Database] Successfully renamed chat history: ${chatId} to "${newTitle}"`)
    }
  } catch (error) {
    console.error('[Database] Error renaming chat history:', error)
  }
}

export function generateChatTitle(firstMessage: ChatMessage): string {
  const content = firstMessage.content.trim()
  
  // Extract first 3-4 meaningful words
  const words = content.split(' ').filter(word => 
    word.length > 2 && 
    !['the', 'and', 'but', 'for', 'are', 'can', 'you', 'how', 'what', 'when', 'where', 'why'].includes(word.toLowerCase())
  )
  
  if (words.length === 0) return 'New Chat'
  if (words.length <= 3) return words.join(' ')
  
  return words.slice(0, 3).join(' ') + '...'
}

// ============================================================================
// AI CHAT MEMORY FUNCTIONS
// ============================================================================

export async function getChatMemory(clerkId: string): Promise<ChatContext | null> {
  if (!clerkId) return null
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('ai_chat_memory')
      .select('memory_data')
      .eq('profile_id', profileId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('[Database] Error getting chat memory:', error)
      return null
    }
    
    return data?.memory_data || null
  } catch (error) {
    console.error('[Database] Error getting chat memory:', error)
    return null
  }
}

export async function setChatMemory(clerkId: string, memory: ChatContext): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('ai_chat_memory')
      .upsert({
        profile_id: profileId,
        memory_data: memory,
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('[Database] Error setting chat memory:', error)
    }
  } catch (error) {
    console.error('[Database] Error setting chat memory:', error)
  }
}

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

export async function updateUserProfile(clerkId: string, profileData: {
  username?: string
  display_name?: string
  full_name?: string
  bio?: string
  profile_picture_url?: string
}): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    console.log(`[Database] Updating user profile for clerk_id: ${clerkId}`)
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (profileData.username !== undefined) updateData.username = profileData.username
    if (profileData.display_name !== undefined) updateData.display_name = profileData.display_name
    if (profileData.full_name !== undefined) updateData.full_name = profileData.full_name
    if (profileData.bio !== undefined) updateData.bio = profileData.bio
    if (profileData.profile_picture_url !== undefined) updateData.profile_picture_url = profileData.profile_picture_url
    
    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profileId)
    
    if (error) {
      console.error('[Database] Error updating user profile:', error)
    } else {
      console.log(`[Database] Successfully updated user profile for clerk_id: ${clerkId}`)
    }
  } catch (error) {
    console.error('[Database] Error updating user profile:', error)
  }
}

export async function getUserProfile(clerkId: string): Promise<any> {
  if (!clerkId) return null
  
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', clerkId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('[Database] Error getting user profile:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('[Database] Error getting user profile:', error)
    return null
  }
}

// ============================================================================
// COMMUNITY FUNCTIONS
// ============================================================================

export async function createPostForCollection(clerkId: string, collection: Collection): Promise<string | null> {
  if (!clerkId || !collection) return null

  try {
    console.log(`[Database] Creating community post for collection: ${collection.name}`)

    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()

    // Check if there's already a community post for this collection by this user
    // Allow multiple users to post collections with the same name
    const { data: existingPost } = await supabase
      .from('community_posts')
      .select('id')
      .eq('collection_id', collection.id)
      .eq('profile_id', profileId)
      .single()

    if (existingPost) {
      console.log(`[Database] Community post already exists for collection: ${collection.id} by user: ${profileId}`)
      return existingPost.id
    }
    
    // Create a new community post for the collection
    const postData = {
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      profile_id: profileId,
      title: `✨ ${collection.name}`,
      description: collection.description || `Check out my curated collection of ${collection.itemIds?.length || 0} items!`,
      post_type: 'collection',
      collection_id: collection.id,
      is_public: true,
      like_count: 0,
      comment_count: 0,
      view_count: 0,
      share_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: newPost, error } = await supabase
      .from('community_posts')
      .insert(postData)
      .select('id')
      .single()
    
    if (error) {
      console.error('[Database] Error creating community post:', error)
      return null
    }
    
    console.log(`[Database] Successfully created community post: ${newPost.id} for collection: ${collection.name}`)
    return newPost.id
  } catch (error) {
    console.error('[Database] Error creating community post for collection:', error)
    return null
  }
}

export async function removePostForCollection(clerkId: string, collectionId: string): Promise<void> {
  if (!clerkId || !collectionId) return
  
  try {
    console.log(`[Database] Removing community post for collection: ${collectionId}`)
    
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    // Delete any community posts for this collection by this user
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('collection_id', collectionId)
      .eq('profile_id', profileId)
    
    if (error) {
      console.error('[Database] Error removing community post:', error)
    } else {
      console.log(`[Database] Successfully removed community post for collection: ${collectionId}`)
    }
  } catch (error) {
    console.error('[Database] Error removing community post for collection:', error)
  }
}



// ============================================================================
// FOLLOW/UNFOLLOW FUNCTIONS
// ============================================================================

export async function followUser(currentUserClerkId: string, targetUserClerkId: string): Promise<{ success: boolean; isFollowing: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // Get current user's profile ID
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', currentUserClerkId)
      .single()
    
    if (!currentProfile) {
      return { success: false, isFollowing: false, error: "Current user profile not found" }
    }
    
    // Get target user's profile ID
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, follower_count')
      .eq('clerk_id', targetUserClerkId)
      .single()
    
    if (!targetProfile) {
      return { success: false, isFollowing: false, error: "Target user profile not found" }
    }
    
    // Check if already following
    const { data: existingFollow } = await supabase
      .from('user_follows')
      .select('id, is_active')
      .eq('follower_id', currentProfile.id)
      .eq('following_id', targetProfile.id)
      .single()
    
    if (existingFollow?.is_active) {
      return { success: false, isFollowing: true, error: "Already following this user" }
    }
    
    if (existingFollow && !existingFollow.is_active) {
      // Reactivate existing follow
      await supabase
        .from('user_follows')
        .update({ is_active: true })
        .eq('id', existingFollow.id)
    } else {
      // Create new follow relationship
      await supabase
        .from('user_follows')
        .insert({
          follower_id: currentProfile.id,
          following_id: targetProfile.id,
          is_active: true
        })
    }
    
    // Update follower count for target user
    await supabase
      .from('profiles')
      .update({ 
        follower_count: (targetProfile.follower_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetProfile.id)
    
    // Update following count for current user
    const { data: currentFollowingCount } = await supabase
      .from('profiles')
      .select('following_count')
      .eq('id', currentProfile.id)
      .single()
    
    await supabase
      .from('profiles')
      .update({ 
        following_count: (currentFollowingCount?.following_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentProfile.id)
    
    return { success: true, isFollowing: true }
  } catch (error) {
    console.error('[Database] Error following user:', error)
    return { success: false, isFollowing: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function unfollowUser(currentUserClerkId: string, targetUserClerkId: string): Promise<{ success: boolean; isFollowing: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // Get current user's profile ID
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', currentUserClerkId)
      .single()
    
    if (!currentProfile) {
      return { success: false, isFollowing: true, error: "Current user profile not found" }
    }
    
    // Get target user's profile ID
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, follower_count')
      .eq('clerk_id', targetUserClerkId)
      .single()
    
    if (!targetProfile) {
      return { success: false, isFollowing: true, error: "Target user profile not found" }
    }
    
    // Check if currently following
    const { data: existingFollow } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', currentProfile.id)
      .eq('following_id', targetProfile.id)
      .eq('is_active', true)
      .single()
    
    if (!existingFollow) {
      return { success: false, isFollowing: false, error: "Not currently following this user" }
    }
    
    // Deactivate follow relationship
    await supabase
      .from('user_follows')
      .update({ is_active: false })
      .eq('id', existingFollow.id)
    
    // Update follower count for target user
    await supabase
      .from('profiles')
      .update({ 
        follower_count: Math.max(0, (targetProfile.follower_count || 0) - 1),
        updated_at: new Date().toISOString()
      })
      .eq('id', targetProfile.id)
    
    // Update following count for current user
    const { data: currentFollowingCount } = await supabase
      .from('profiles')
      .select('following_count')
      .eq('id', currentProfile.id)
      .single()
    
    await supabase
      .from('profiles')
      .update({ 
        following_count: Math.max(0, (currentFollowingCount?.following_count || 0) - 1),
        updated_at: new Date().toISOString()
      })
      .eq('id', currentProfile.id)
    
    return { success: true, isFollowing: false }
  } catch (error) {
    console.error('[Database] Error unfollowing user:', error)
    return { success: false, isFollowing: true, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getFollowStatus(currentUserClerkId: string, targetUserClerkId: string): Promise<{ isFollowing: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient()
    
    // Get current user's profile ID
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', currentUserClerkId)
      .single()
    
    if (!currentProfile) {
      return { isFollowing: false, error: "Current user profile not found" }
    }
    
    // Get target user's profile ID
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', targetUserClerkId)
      .single()
    
    if (!targetProfile) {
      return { isFollowing: false, error: "Target user profile not found" }
    }
    
    // Check if following
    const { data: followStatus } = await supabase
      .from('user_follows')
      .select('is_active')
      .eq('follower_id', currentProfile.id)
      .eq('following_id', targetProfile.id)
      .single()
    
    return { isFollowing: followStatus?.is_active || false }
  } catch (error) {
    console.error('[Database] Error checking follow status:', error)
    return { isFollowing: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getFollowingFeedPosts(userClerkId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
  try {
    const supabase = getSupabaseClient()
    
    // Get current user's profile ID
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userClerkId)
      .single()
    
    if (!currentProfile) {
      return []
    }
    
    // First get the IDs of users being followed
    const { data: following } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentProfile.id)
      .eq('is_active', true)
    
    if (!following || following.length === 0) {
      return []
    }
    
    const followingIds = following.map(f => f.following_id)
    
    // Get posts from users that the current user is following
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!community_posts_profile_id_fkey(
          id,
          clerk_id,
          username,
          display_name,
          profile_picture_url
        )
      `)
      .in('profile_id', followingIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('[Database] Error getting following feed posts:', error)
      return []
    }
    
    return posts || []
  } catch (error) {
    console.error('[Database] Error getting following feed posts:', error)
    return []
  }
}

export async function getUserProfileCounts(userClerkId: string): Promise<{
  savedItemsCount: number
  collectionsCount: number
  ordersCount: number
  postsCount: number
}> {
  try {
    const supabase = getSupabaseClient()

    // Get user's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_id', userClerkId)
      .single()

    if (!profile) {
      return {
        savedItemsCount: 0,
        collectionsCount: 0,
        ordersCount: 0,
        postsCount: 0
      }
    }

    // Get saved items count
    const { count: savedItemsCount } = await supabase
      .from('saved_items')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)

    // Get collections count
    const { count: collectionsCount } = await supabase
      .from('collections')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)

    // Get orders count (this would need to be implemented based on your orders schema)
    // For now, using a placeholder count
    const ordersCount = 0

    // Get posts count
    const { count: postsCount } = await supabase
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)

    return {
      savedItemsCount: savedItemsCount || 0,
      collectionsCount: collectionsCount || 0,
      ordersCount: ordersCount || 0,
      postsCount: postsCount || 0
    }
  } catch (error) {
    console.error('[Database] Error getting user profile counts:', error)
    return {
      savedItemsCount: 0,
      collectionsCount: 0,
      ordersCount: 0,
      postsCount: 0
    }
  }
}

// ============================================================================
// DIRECT MESSAGING FUNCTIONS
// ============================================================================

export interface DirectConversation {
  id: string
  participant_1_id: string
  participant_2_id: string
  is_active: boolean
  is_archived_by_1: boolean
  is_archived_by_2: boolean
  message_count: number
  created_at: string
  updated_at: string
  last_message_at: string
}

export interface DirectMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: string
  created_at: string
  is_read: boolean
}

export async function getConversations(clerkId: string): Promise<any[]> {
  if (!clerkId) return []

  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(clerkId)

    const { data, error } = await supabase
      .from('direct_conversations')
      .select(`
        id,
        last_message_at,
        created_at,
        message_count,
        participant_1:profiles!direct_conversations_participant_1_id_fkey(id, username, display_name, profile_picture_url, is_pro),
        participant_2:profiles!direct_conversations_participant_2_id_fkey(id, username, display_name, profile_picture_url, is_pro)
      `)
      .or(`participant_1_id.eq.${profileId},participant_2_id.eq.${profileId}`)
      .eq('is_active', true)
      .order('last_message_at', { ascending: false })

    if (error) {
      console.error('[Database] Error getting conversations:', error)
      return []
    }

    // Process conversations to add other_participant and last_message
    const conversationsWithDetails = await Promise.all(
      (data || []).map(async (conv: any) => {
        // Determine other participant
        const otherParticipant = conv.participant_1.id === profileId ? conv.participant_2 : conv.participant_1

        // Get last message
        const { data: lastMessage } = await supabase
          .from('direct_messages')
          .select('content, message_type, created_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return {
          id: conv.id,
          other_participant: otherParticipant,
          last_message_at: conv.last_message_at,
          created_at: conv.created_at,
          message_count: conv.message_count,
          last_message: lastMessage || null
        }
      })
    )

    return conversationsWithDetails
  } catch (error) {
    console.error('[Database] Error getting conversations:', error)
    return []
  }
}

export async function getMessages(conversationId: string, clerkId: string): Promise<any[]> {
  if (!conversationId || !clerkId) return []

  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(clerkId)

    // Verify user is participant in this conversation
    const { data: conversation } = await supabase
      .from('direct_conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single()

    if (!conversation || (conversation.participant_1_id !== profileId && conversation.participant_2_id !== profileId)) {
      console.error('[Database] User not authorized for this conversation')
      return []
    }

    const { data, error } = await supabase
      .from('direct_messages')
      .select(`
        id,
        content,
        message_type,
        created_at,
        is_read,
        sender_id,
        sender:profiles!direct_messages_sender_id_fkey(id, clerk_id, username, display_name, profile_picture_url, is_pro)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[Database] Error getting messages:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[Database] Error getting messages:', error)
    return []
  }
}

export async function sendMessage(conversationId: string, clerkId: string, content: string, messageType: string = 'text'): Promise<boolean> {
  if (!conversationId || !clerkId || !content?.trim()) return false

  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(clerkId)

    console.log('[Database] sendMessage called with:', {
      conversationId: typeof conversationId,
      conversationIdValue: conversationId,
      clerkId,
      profileId
    })

    // Verify user is participant in this conversation
    console.log('[Database] Fetching conversation with query:', {
      table: 'direct_conversations',
      select: 'participant_1_id, participant_2_id, message_count',
      where: `id = '${conversationId}'`
    })

    const { data: conversation, error: convError } = await supabase
      .from('direct_conversations')
      .select('participant_1_id, participant_2_id, message_count')
      .eq('id', conversationId)
      .single()

    if (convError) {
      console.error('[Database] Error fetching conversation:', {
        error: convError,
        conversationId,
        conversationIdType: typeof conversationId
      })
      return false
    }

    console.log('[Database] Conversation fetched successfully:', {
      conversation,
      participant1Type: typeof conversation.participant_1_id,
      participant2Type: typeof conversation.participant_2_id,
      profileIdType: typeof profileId
    })

    if (!conversation || (conversation.participant_1_id !== profileId && conversation.participant_2_id !== profileId)) {
      console.error('[Database] User not authorized for this conversation')
      console.error('[Database] Conversation participants:', conversation?.participant_1_id, conversation?.participant_2_id)
      console.error('[Database] User profile ID:', profileId)
      return false
    }

    // Insert the message
    const messageId = crypto.randomUUID()
    console.log('[Database] Inserting message with data:', {
      id: messageId,
      conversation_id: conversationId,
      sender_id: profileId,
      content: content.trim(),
      message_type: messageType,
      created_at: new Date().toISOString(),
      is_read: false
    })

    const { error: messageError } = await supabase
      .from('direct_messages')
      .insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: profileId,
        content: content.trim(),
        message_type: messageType,
        created_at: new Date().toISOString(),
        is_read: false
      })

    if (messageError) {
      console.error('[Database] Error sending message:', {
        error: messageError,
        messageId,
        conversationId,
        profileId,
        content: content.trim()
      })
      return false
    }

    console.log('[Database] Message inserted successfully')

    // Update conversation metadata manually (instead of relying on trigger)
    console.log('[Database] Updating conversation metadata...')
    const { error: updateError } = await supabase
      .from('direct_conversations')
      .update({
        message_count: conversation.message_count + 1,
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversationId)

    if (updateError) {
      console.error('[Database] Error updating conversation:', updateError)
      // Don't fail the message sending if conversation update fails
    } else {
      console.log('[Database] Conversation updated successfully')
    }

    if (updateError) {
      console.error('[Database] Error updating conversation:', updateError)
    }

    // Send SMS notification to the recipient (disabled for now to isolate the issue)
    /*
    try {
      const recipientId = conversation.participant_1_id === profileId ? conversation.participant_2_id : conversation.participant_1_id

      // Get recipient's clerk_id to fetch phone number
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('clerk_id, display_name, username')
        .eq('id', recipientId)
        .single()

      // Get sender's display name
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', profileId)
        .single()

      if (recipientProfile && senderProfile) {
        const recipientClerkId = recipientProfile.clerk_id
        const senderName = senderProfile.display_name || senderProfile.username || 'Someone'

        // Check if recipient wants SMS notifications
        const shouldSend = await shouldSendSMSNotification(recipientClerkId)
        if (shouldSend) {
          const recipientPhone = await getUserPhoneNumber(recipientClerkId)
          if (recipientPhone && checkSMSRateLimit(recipientPhone)) {
            // Determine if this is the first message in the conversation
            const isFirstMessage = conversation.message_count === 0

            // Send SMS notification asynchronously (don't block the response)
            sendSMSNotification({
              recipientPhone,
              senderName,
              messageType: isFirstMessage ? 'new_message' : 'reply',
              isFirstMessage
            }).catch(error => {
              console.error('[Database] Failed to send SMS notification:', error)
            })
          }
        }
      }
    } catch (smsError) {
      // Don't fail the message sending if SMS fails
      console.error('[Database] Error processing SMS notification:', smsError)
    }
    */

    return true
  } catch (error) {
    console.error('[Database] Error sending message:', error)
    return false
  }
}

export async function createConversation(clerkId: string, otherUserId: string): Promise<string | null> {
  if (!clerkId || !otherUserId) return null

  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(clerkId)
    const otherProfileId = await getOrCreateProfile(otherUserId)

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('direct_conversations')
      .select('id')
      .or(`and(participant_1_id.eq.${profileId},participant_2_id.eq.${otherProfileId}),and(participant_1_id.eq.${otherProfileId},participant_2_id.eq.${profileId})`)
      .eq('is_active', true)
      .single()

    if (existing) {
      return existing.id
    }

    // Create new conversation
    const conversationId = crypto.randomUUID()
    const { error } = await supabase
      .from('direct_conversations')
      .insert({
        id: conversationId,
        participant_1_id: profileId,
        participant_2_id: otherProfileId,
        is_active: true,
        is_archived_by_1: false,
        is_archived_by_2: false,
        message_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })

    if (error) {
      // If it's a duplicate conversation error, try to find the existing one
      if (error.code === '23505') {
        console.log('[Database] Conversation already exists, fetching existing...')
        const { data: existing } = await supabase
          .from('direct_conversations')
          .select('id')
          .or(`and(participant_1_id.eq.${profileId},participant_2_id.eq.${otherProfileId}),and(participant_1_id.eq.${otherProfileId},participant_2_id.eq.${profileId})`)
          .eq('is_active', true)
          .single()

        if (existing) {
          return existing.id
        }
      }

      console.error('[Database] Error creating conversation:', error)
      return null
    }

    return conversationId
  } catch (error) {
    console.error('[Database] Error creating conversation:', error)
    return null
  }
}

// Get unread message count for a user across all conversations
export async function getUnreadMessageCount(clerkId: string): Promise<number> {
  if (!clerkId) return 0

  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(clerkId)

    // Get all conversations for this user
    const { data: conversations } = await supabase
      .from('direct_conversations')
      .select('id')
      .or(`participant_1_id.eq.${profileId},participant_2_id.eq.${profileId}`)
      .eq('is_active', true)

    if (!conversations || conversations.length === 0) return 0

    const conversationIds = conversations.map(c => c.id)

    // Count unread messages in these conversations where user is NOT the sender
    const { count, error } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', profileId)
      .eq('is_read', false)

    if (error) {
      console.error('[Database] Error getting unread count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('[Database] Error getting unread count:', error)
    return 0
  }
}

// Mark all messages in a conversation as read for a user
export async function markMessagesAsRead(conversationId: string, clerkId: string): Promise<boolean> {
  if (!conversationId || !clerkId) return false

  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(clerkId)

    // Verify user is participant in this conversation
    const { data: conversation } = await supabase
      .from('direct_conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single()

    if (!conversation || (conversation.participant_1_id !== profileId && conversation.participant_2_id !== profileId)) {
      console.error('[Database] User not authorized for this conversation')
      return false
    }

    // Mark messages as read where user is NOT the sender
    const { error } = await supabase
      .from('direct_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', profileId)
      .eq('is_read', false)

    if (error) {
      console.error('[Database] Error marking messages as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Database] Error marking messages as read:', error)
    return false
  }
}
