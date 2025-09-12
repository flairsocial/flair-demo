// Database service for Supabase integration
// Replaces file-based profile storage with database persistence
import { createClient } from '@supabase/supabase-js'
import type { Product } from './types'

// Re-export types from profile-storage for compatibility
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

// Database types (internal)
interface DbProfile {
  id: string
  clerk_id: string
  email?: string
  full_name?: string
  avatar_url?: string
  data: any
  created_at: string
  updated_at: string
}

interface DbSavedItem {
  id: string
  profile_id: string
  product: Product
  saved_at: string
}

interface DbCollection {
  id: string
  profile_id: string
  name: string
  color: string
  description?: string
  item_ids: string[]
  metadata: any
  created_at: string
  updated_at: string
}

interface DbChatHistory {
  id: string
  profile_id: string
  title: string
  created_at: string
  updated_at: string
}

interface DbChatMessage {
  id: string
  chat_history_id: string
  sender: string
  content: string
  attached_files?: any[]
  products?: Product[]
  created_at: string
}

interface DbChatMemory {
  id: string
  profile_id: string
  memory: ChatContext
  updated_at: string
}

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Environment variables:', {
      SUPABASE_URL: process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    })
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Helper function to get or create profile by clerk_id
async function getOrCreateProfile(clerkId: string): Promise<string> {
  if (!clerkId) {
    throw new Error('ClerkId is required')
  }

  const supabase = getSupabaseClient()
  
  // Try to get existing profile
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_id', clerkId)
    .single()
  
  if (existingProfile) {
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
    // Return a fallback profile ID based on clerk ID
    return `profile_${clerkId}`
  }
  
  // Create new profile with basic data
  // Note: Profile sync with Clerk data happens in API routes
  const profileId = `profile_${clerkId}`
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: profileId,
      clerk_id: clerkId,
      username: `user_${clerkId.slice(-8)}`,
      display_name: 'User',
      profile_picture_url: null,
      is_public: true,
      data: {}
    })
    .select('id')
    .single()
  
  if (insertError || !newProfile) {
    console.error(`Failed to create profile: ${insertError?.message}`)
    return profileId // Return fallback ID
  }
  
  return newProfile.id
}

// Profile functions
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

// Saved items functions
export async function getSavedItems(clerkId: string): Promise<Product[]> {
  if (!clerkId) return []
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('saved_items')
      .select('product, saved_at')
      .eq('profile_id', profileId)
      .order('saved_at', { ascending: false })
    
    if (error) {
      console.error('[Database] Error getting saved items:', error)
      return []
    }
    
    return (data || []).map((item: any) => ({
      ...item.product,
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
    
    // Delete existing items
    await supabase
      .from('saved_items')
      .delete()
      .eq('profile_id', profileId)
    
    // Insert new items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        profile_id: profileId,
        product: item
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
    
    // Check if item already exists
    const { data: existing } = await supabase
      .from('saved_items')
      .select('id')
      .eq('profile_id', profileId)
      .eq('product->>id', item.id)
      .single()
    
    if (!existing) {
      const { error } = await supabase
        .from('saved_items')
        .insert({
          profile_id: profileId,
          product: { ...item, saved: true }
        })
      
      if (error) {
        console.error('[Database] Error adding saved item:', error)
      } else {
        console.log(`[Database] Successfully added saved item: ${item.title}`)
      }
    } else {
      console.log(`[Database] Item already exists in saved items: ${item.title}`)
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
    
    // Remove from saved items
    await supabase
      .from('saved_items')
      .delete()
      .eq('profile_id', profileId)
      .eq('product->>id', itemId)
    
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
            .update({ item_ids: updatedItemIds })
            .eq('id', collection.id)
        }
      }
    }
  } catch (error) {
    console.error('[Database] Error removing saved item:', error)
  }
}

// Collections functions
export async function getCollections(clerkId: string): Promise<Collection[]> {
  if (!clerkId) return getDefaultCollections()
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('[Database] Error getting collections:', error)
      return getDefaultCollections()
    }
    
    if (!data || data.length === 0) {
      // Create default collections
      const defaultCollections = getDefaultCollections()
      await setCollections(clerkId, defaultCollections)
      return defaultCollections
    }
    
    return data.map((col: any) => ({
      id: col.id,
      name: col.name,
      color: col.color,
      createdAt: col.created_at,
      itemIds: col.item_ids || [],
      description: col.description,
      customBanner: col.metadata?.customBanner,
      isPublic: col.is_public ?? true
    }))
  } catch (error) {
    console.error('[Database] Error getting collections:', error)
    return getDefaultCollections()
  }
}

function getDefaultCollections(): Collection[] {
  return [
    {
      id: 'col-1',
      name: 'Summer Essentials',
      color: 'bg-amber-500',
      createdAt: new Date().toISOString(),
      itemIds: [],
      isPublic: true
    },
    {
      id: 'col-2', 
      name: 'Work Outfits',
      color: 'bg-blue-500',
      createdAt: new Date().toISOString(),
      itemIds: [],
      isPublic: true
    },
    {
      id: 'col-3',
      name: 'Casual Weekend',
      color: 'bg-green-500',
      createdAt: new Date().toISOString(),
      itemIds: [],
      isPublic: true
    },
    {
      id: 'col-4',
      name: 'Evening Wear',
      color: 'bg-purple-500',
      createdAt: new Date().toISOString(),
      itemIds: [],
      isPublic: true
    },
    {
      id: 'col-5',
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
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    // Delete existing collections
    await supabase
      .from('collections')
      .delete()
      .eq('profile_id', profileId)
    
    // Insert new collections
    if (collections.length > 0) {
      const collectionsToInsert = collections.map(col => ({
        id: col.id,
        profile_id: profileId,
        name: col.name,
        color: col.color,
        description: col.description,
        item_ids: col.itemIds || [],
        is_public: col.isPublic ?? true, // Use collection's privacy setting, default to public
        metadata: {
          customBanner: col.customBanner
        }
      }))
      
      const { error } = await supabase
        .from('collections')
        .insert(collectionsToInsert)
      
      if (error) {
        console.error('[Database] Error setting collections:', error)
      } else {
        console.log(`[Database] Saved ${collections.length} collections for clerk_id: ${clerkId}`)
        
        // Auto-create community posts for collections with items
        for (const collection of collections) {
          if (collection.itemIds && collection.itemIds.length > 0) {
            await createPostForCollection(clerkId, collection)
          }
        }
      }
    }
  } catch (error) {
    console.error('[Database] Error setting collections:', error)
  }
}

export async function addCollection(clerkId: string, collection: Collection): Promise<void> {
  if (!clerkId) return
  
  try {
    const currentCollections = await getCollections(clerkId)
    await setCollections(clerkId, [...currentCollections, collection])
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
    if (updates.customBanner !== undefined) {
      updateData.metadata = { customBanner: updates.customBanner }
    }
    
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

export async function removeCollection(clerkId: string, collectionId: string): Promise<void> {
  if (!clerkId) return
  
  try {
    const currentCollections = await getCollections(clerkId)
    const filteredCollections = currentCollections.filter(col => col.id !== collectionId)
    await setCollections(clerkId, filteredCollections)
  } catch (error) {
    console.error('[Database] Error removing collection:', error)
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
        .update({ item_ids: updatedItemIds })
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
    
    const updatedItemIds = (collection.item_ids || []).filter((id: string) => id !== itemId)
    
    await supabase
      .from('collections')
      .update({ item_ids: updatedItemIds })
      .eq('profile_id', profileId)
      .eq('id', collectionId)
  } catch (error) {
    console.error('[Database] Error removing item from collection:', error)
  }
}

export async function getItemsInCollection(clerkId: string, collectionId: string): Promise<Product[]> {
  if (!clerkId) return []
  
  try {
    const collections = await getCollections(clerkId)
    const collection = collections.find(col => col.id === collectionId)
    if (!collection) return []
    
    const savedItems = await getSavedItems(clerkId)
    return savedItems.filter(item => collection.itemIds.includes(item.id))
  } catch (error) {
    console.error('[Database] Error getting items in collection:', error)
    return []
  }
}

// Chat system functions (clean implementation)
export async function getChatHistory(clerkId: string): Promise<ChatHistory[]> {
  if (!clerkId) return []
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    // Get conversations for this user
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .eq('profile_id', profileId)
      .order('updated_at', { ascending: false })
    
    if (conversationsError) {
      console.error('[Database] Error getting conversations:', conversationsError)
      return []
    }
    
    if (!conversations || conversations.length === 0) return []
    
    // Get messages for each conversation
    const chatHistories: ChatHistory[] = []
    
    for (const conversation of conversations) {
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('sequence_number', { ascending: true })
      
      if (messagesError) {
        console.error('[Database] Error getting messages for conversation:', conversation.id, messagesError)
        continue
      }
      
      chatHistories.push({
        id: conversation.id,
        title: conversation.title || 'New Chat',
        messages: (messages || []).map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.role as 'user' | 'assistant',
          timestamp: msg.created_at,
          attachedFiles: msg.attached_files || [],
          products: msg.products || []
        })),
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at
      })
    }
    
    return chatHistories
  } catch (error) {
    console.error('[Database] Error getting chat history:', error)
    return []
  }
}

export async function setChatHistory(clerkId: string, chatHistory: ChatHistory[]): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    // Delete existing conversations and messages (cascading)
    await supabase
      .from('conversations')
      .delete()
      .eq('profile_id', profileId)
    
    // Insert new conversations and messages
    for (const chat of chatHistory) {
      // Insert conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .insert({
          id: chat.id,
          profile_id: profileId,
          title: chat.title
        })
      
      if (conversationError) {
        console.error('[Database] Error inserting conversation:', conversationError)
        continue
      }
      
      // Insert messages
      if (chat.messages.length > 0) {
        const messagesToInsert = chat.messages.map((msg, index) => ({
          conversation_id: chat.id,
          role: msg.sender,
          content: msg.content,
          sequence_number: index + 1,
          attached_files: msg.attachedFiles || [],
          products: msg.products || []
        }))
        
        const { error: messagesError } = await supabase
          .from('messages')
          .insert(messagesToInsert)
        
        if (messagesError) {
          console.error('[Database] Error inserting messages:', messagesError)
        }
      }
    }
    
    console.log(`[Database] Saved ${chatHistory.length} chat histories for clerk_id: ${clerkId}`)
  } catch (error) {
    console.error('[Database] Error setting chat history:', error)
  }
}

export async function addChatHistory(clerkId: string, chatHistory: ChatHistory): Promise<void> {
  if (!clerkId) return
  
  try {
    const currentHistory = await getChatHistory(clerkId)
    await setChatHistory(clerkId, [chatHistory, ...currentHistory])
  } catch (error) {
    console.error('[Database] Error adding chat history:', error)
  }
}

export async function updateChatHistory(clerkId: string, chatId: string, messages: ChatMessage[], title?: string): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    // Update conversation title if provided
    if (title) {
      await supabase
        .from('conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('profile_id', profileId)
        .eq('id', chatId)
    }
    
    // Delete existing messages for this conversation
    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', chatId)
    
    // Insert new messages
    if (messages.length > 0) {
      const messagesToInsert = messages.map((msg, index) => ({
        conversation_id: chatId,
        role: msg.sender,
        content: msg.content,
        sequence_number: index + 1,
        attached_files: msg.attachedFiles || [],
        products: msg.products || []
      }))
      
      const { error } = await supabase
        .from('messages')
        .insert(messagesToInsert)
      
      if (error) {
        console.error('[Database] Error updating messages:', error)
      }
    }
  } catch (error) {
    console.error('[Database] Error updating chat history:', error)
  }
}

export async function renameChatHistory(clerkId: string, chatId: string, newTitle: string): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    await supabase
      .from('conversations')
      .update({ title: newTitle, updated_at: new Date().toISOString() })
      .eq('profile_id', profileId)
      .eq('id', chatId)
  } catch (error) {
    console.error('[Database] Error renaming chat history:', error)
  }
}

export async function deleteChatHistory(clerkId: string, chatId: string): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    await supabase
      .from('conversations')
      .delete()
      .eq('profile_id', profileId)
      .eq('id', chatId)
  } catch (error) {
    console.error('[Database] Error deleting chat history:', error)
  }
}

// Keep the generateChatTitle function as-is since it's a pure utility function
export function generateChatTitle(firstMessage: ChatMessage): string {
  // Use attached files for title if available
  if (firstMessage.attachedFiles && firstMessage.attachedFiles.length > 0) {
    const products = firstMessage.attachedFiles
      .filter(f => f.type === 'product' && f.metadata?.title)
      .map(f => f.metadata.title)
    
    if (products.length > 0) {
      const title = products.length === 1 ? 
        `${products[0]} styling` : 
        `${products[0]} + ${products.length - 1} more items`
      return title.slice(0, 50)
    }
  }
  
  // Use first message content and create a brief summary
  const content = firstMessage.content.trim().toLowerCase()
  
  // Look for common fashion patterns and create descriptive titles
  if (content.includes('show me') || content.includes('find me')) {
    const searchTerm = content.replace(/show me|find me|please|can you|help me/, '').trim()
    return `Looking for ${searchTerm}`.slice(0, 50)
  }
  
  if (content.includes('what') && (content.includes('wear') || content.includes('outfit'))) {
    return 'Outfit advice request'
  }
  
  if (content.includes('style') || content.includes('fashion')) {
    return 'Fashion styling discussion'
  }
  
  if (content.includes('dress') || content.includes('top') || content.includes('pants') || 
      content.includes('shoes') || content.includes('jacket') || content.includes('skirt')) {
    const item = content.match(/(dress|top|pants|shoes|jacket|skirt|jeans|shirt|blouse|sweater|coat|boots|sneakers|heels|bag|purse)/)?.[0]
    return item ? `${item.charAt(0).toUpperCase() + item.slice(1)} shopping` : 'Clothing search'
  }
  
  if (content.includes('budget') || content.includes('price') || content.includes('cheap') || content.includes('expensive')) {
    return 'Budget shopping advice'
  }
  
  if (content.includes('work') || content.includes('office') || content.includes('business')) {
    return 'Work wardrobe help'
  }
  
  if (content.includes('date') || content.includes('party') || content.includes('wedding') || content.includes('event')) {
    return 'Special occasion styling'
  }
  
  // Fallback to first few words
  const words = content.split(' ').slice(0, 6).join(' ')
  return words.length > 40 ? words.slice(0, 40) + '...' : words || 'Fashion chat'
}

// Chat memory functions
export async function getChatMemory(clerkId: string): Promise<ChatContext | null> {
  if (!clerkId) return null
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('chat_context')
      .select('context_data')
      .eq('profile_id', profileId)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      console.error('[Database] Error getting chat memory:', error)
    }
    
    return data?.context_data || null
  } catch (error) {
    console.error('[Database] Error getting chat memory:', error)
    return null
  }
}

export async function saveChatMemory(clerkId: string, context: Partial<ChatContext>): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const existing = await getChatMemory(clerkId) || {
      userId: clerkId,
      sessionId: Date.now().toString(),
      discussedProducts: [],
      searchQueries: [],
      userIntents: [],
      stylePreferences: [],
      lastSearchResults: [],
      conversationThemes: [],
      timestamp: new Date().toISOString()
    }

    const updated = {
      ...existing,
      ...context,
      timestamp: new Date().toISOString()
    }

    const { error } = await supabase
      .from('chat_context')
      .upsert({
        profile_id: profileId,
        context_data: updated
      })
    
    if (error) {
      console.error('[Database] Error saving chat memory:', error)
    }
  } catch (error) {
    console.error('[Database] Error saving chat memory:', error)
  }
}

export async function addDiscussedProduct(clerkId: string, product: Product, context: string): Promise<void> {
  if (!clerkId) return
  
  try {
    const memory = await getChatMemory(clerkId) || {
      userId: clerkId,
      sessionId: Date.now().toString(),
      discussedProducts: [],
      searchQueries: [],
      userIntents: [],
      stylePreferences: [],
      lastSearchResults: [],
      conversationThemes: [],
      timestamp: new Date().toISOString()
    }

    // Avoid duplicates
    const exists = memory.discussedProducts.find(p => p.id === product.id)
    if (!exists) {
      memory.discussedProducts.push(product)
      // Keep only last 20 products to prevent memory bloat
      if (memory.discussedProducts.length > 20) {
        memory.discussedProducts = memory.discussedProducts.slice(-20)
      }
    }

    await saveChatMemory(clerkId, memory)
  } catch (error) {
    console.error('[Database] Error adding discussed product:', error)
  }
}

export async function addSearchQuery(clerkId: string, query: string, intent: string, results: Product[]): Promise<void> {
  if (!clerkId) return
  
  try {
    const memory = await getChatMemory(clerkId) || {
      userId: clerkId,
      sessionId: Date.now().toString(),
      discussedProducts: [],
      searchQueries: [],
      userIntents: [],
      stylePreferences: [],
      lastSearchResults: [],
      conversationThemes: [],
      timestamp: new Date().toISOString()
    }

    memory.searchQueries.push(query)
    memory.userIntents.push(intent)
    memory.lastSearchResults = results

    // Keep only last 10 searches
    if (memory.searchQueries.length > 10) {
      memory.searchQueries = memory.searchQueries.slice(-10)
      memory.userIntents = memory.userIntents.slice(-10)
    }

    await saveChatMemory(clerkId, memory)
  } catch (error) {
    console.error('[Database] Error adding search query:', error)
  }
}

export async function generateContextualPrompt(clerkId: string): Promise<string> {
  if (!clerkId) return ""
  
  try {
    const memory = await getChatMemory(clerkId)
    if (!memory) return ""

    let context = ""

    // Add recently discussed products
    if (memory.discussedProducts.length > 0) {
      const recentProducts = memory.discussedProducts.slice(-5)
      context += `\n\nRECENTLY DISCUSSED PRODUCTS (Reference these when relevant):\n`
      context += recentProducts.map(p => 
        `• ${p.title} by ${p.brand} ($${p.price}) - ${p.category || 'Fashion item'}`
      ).join('\n')
    }

    // Add recent search queries
    if (memory.searchQueries.length > 0) {
      context += `\n\nRECENT SEARCH QUERIES:\n`
      context += memory.searchQueries.slice(-3).map(q => `• "${q}"`).join('\n')
    }

    // Add conversation themes
    if (memory.conversationThemes.length > 0) {
      context += `\n\nCONVERSATION THEMES:\n`
      context += memory.conversationThemes.slice(-3).join(', ')
    }

    return context
  } catch (error) {
    console.error('[Database] Error generating contextual prompt:', error)
    return ""
  }
}

// ===== COMMUNITY FEATURES =====

// Community profile functions
export async function getCommunityProfile(clerkId: string): Promise<any> {
  if (!clerkId) return null
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()
    
    if (error) {
      console.error('[Database] Error getting community profile:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('[Database] Error getting community profile:', error)
    return null
  }
}

export async function updateCommunityProfile(clerkId: string, updates: any): Promise<void> {
  if (!clerkId) return
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profileId)
    
    if (error) {
      console.error('[Database] Error updating community profile:', error)
    }
  } catch (error) {
    console.error('[Database] Error updating community profile:', error)
  }
}

// Community posts functions
export async function getCommunityFeed(clerkId: string, limit = 20, offset = 0): Promise<any[]> {
  if (!clerkId) return []
  
  try {
    const supabase = getSupabaseClient()
    
    // Get community posts with author info
    const { data: posts, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles(id, username, display_name, profile_picture_url)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('[Database] Error getting community feed:', error)
      return []
    }
    
    return posts || []
  } catch (error) {
    console.error('[Database] Error getting community feed:', error)
    return []
  }
}

export async function createCommunityPost(clerkId: string, post: any): Promise<string | null> {
  if (!clerkId) return null
  
  try {
    const profileId = await getOrCreateProfile(clerkId)
    const supabase = getSupabaseClient()
    
    const postId = `post-${Date.now()}`
    
    const { error } = await supabase
      .from('community_posts')
      .insert({
        id: postId,
        profile_id: profileId,
        ...post
      })
    
    if (error) {
      console.error('[Database] Error creating community post:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        postData: post
      })
      return null
    }
    
    return postId
  } catch (error) {
    console.error('[Database] Error creating community post:', error)
    return null
  }
}

// Auto-create community posts for public collections
export async function createPostForCollection(clerkId: string, collection: Collection): Promise<string | null> {
  if (!clerkId || !collection) return null
  
  try {
    // Use API route for creating community posts to ensure proper permissions
    const response = await fetch('/api/community', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `My ${collection.name} Collection`,
        description: collection.description || `Check out my curated ${collection.name} collection with ${collection.itemIds?.length || 0} amazing pieces!`,
        postType: 'collection',
        collectionId: collection.id,
      }),
    })

    if (!response.ok) {
      console.error('[Database] Error creating collection post via API:', await response.text())
      return null
    }

    const result = await response.json()
    console.log(`[Database] Created community post for collection: ${collection.name}`)
    return result.postId
  } catch (error) {
    console.error('[Database] Error creating collection post:', error)
    return null
  }
}

// Search for users in the community
export async function searchUsers(query: string, limit: number = 10): Promise<any[]> {
  if (!query) return []
  
  try {
    const supabase = getSupabaseClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, clerk_id, username, display_name, profile_picture_url, follower_count, post_count')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .eq('is_public', true)
      .order('follower_count', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('[Database] Error searching users:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('[Database] Error searching users:', error)
    return []
  }
}

// Direct Messaging Functions
export async function getConversations(clerkId: string): Promise<any[]> {
  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(clerkId)
    
    const { data, error } = await supabase
      .from('direct_conversations')
      .select(`
        id,
        last_message_at,
        created_at,
        participant_1:profiles!direct_conversations_participant_1_id_fkey(id, username, display_name, profile_picture_url),
        participant_2:profiles!direct_conversations_participant_2_id_fkey(id, username, display_name, profile_picture_url)
      `)
      .or(`participant_1_id.eq.${profileId},participant_2_id.eq.${profileId}`)
      .order('last_message_at', { ascending: false })
    
    if (error) {
      console.error('[Database] Error getting conversations:', {
        message: error.message || 'Unknown error',
        details: error.details || 'No details',
        hint: error.hint || 'No hint',
        code: error.code || 'No code',
        fullError: error
      })
      return []
    }
    
    // Get last message for each conversation
    const conversationsWithMessages = await Promise.all(
      (data || []).map(async (conv: any) => {
        const { data: lastMessage } = await supabase
          .from('direct_messages')
          .select('content, message_type, created_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        return {
          ...conv,
          other_participant: conv.participant_1.id === profileId ? conv.participant_2 : conv.participant_1,
          last_message: lastMessage
        }
      })
    )
    
    return conversationsWithMessages
  } catch (error) {
    console.error('[Database] Error getting conversations:', error)
    return []
  }
}

export async function getMessages(conversationId: string, clerkId: string): Promise<any[]> {
  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(clerkId)
    
    // First verify user is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from('direct_conversations')
      .select('participant_1_id, participant_2_id')
      .eq('id', conversationId)
      .single()
    
    if (convError || !conversation) {
      console.error('[Database] Conversation not found:', convError)
      return []
    }
    
    if (conversation.participant_1_id !== profileId && conversation.participant_2_id !== profileId) {
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
        sender_id,
        is_read,
        sender:profiles!direct_messages_sender_id_fkey(id, username, display_name, profile_picture_url)
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
  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(clerkId)
    
    // Insert message
    const { error: messageError } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: profileId,
        content: content.trim(),
        message_type: messageType
      })
    
    if (messageError) {
      console.error('[Database] Error sending message:', messageError)
      return false
    }
    
    // Conversation timestamp will be updated automatically by trigger
    return true
  } catch (error) {
    console.error('[Database] Error sending message:', error)
    return false
  }
}

export async function createConversation(clerkId: string, otherUserId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient()
    const profileId = await getOrCreateProfile(clerkId)
    
    // Normalize participant order (smaller ID first)
    const participant1 = profileId < otherUserId ? profileId : otherUserId
    const participant2 = profileId < otherUserId ? otherUserId : profileId
    
    // Check if conversation already exists
    const { data: existingConv, error: checkError } = await supabase
      .from('direct_conversations')
      .select('id')
      .eq('participant_1_id', participant1)
      .eq('participant_2_id', participant2)
      .single()
    
    if (existingConv) {
      return existingConv.id
    }
    
    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('direct_conversations')
      .insert({
        participant_1_id: participant1,
        participant_2_id: participant2
      })
      .select('id')
      .single()
    
    if (createError) {
      console.error('[Database] Error creating conversation:', createError)
      return null
    }
    
    return newConv.id
  } catch (error) {
    console.error('[Database] Error creating conversation:', error)
    return null
  }
}
