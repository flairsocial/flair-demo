// Shared profile storage for all APIs
// Uses file-based storage to persist data across server restarts
import fs from 'fs'
import path from 'path'
import type { Product } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const SAVED_ITEMS_FILE = path.join(DATA_DIR, 'saved-items.json')
const COLLECTIONS_FILE = path.join(DATA_DIR, 'collections.json')
const CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat-history.json')
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

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

// Helper functions for file operations
function readJSONFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error)
  }
  return defaultValue
}

function writeJSONFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error)
  }
}

// Storage objects
interface SavedItemsStorage {
  [userId: string]: SavedItemWithMetadata[]
}

interface CollectionsStorage {
  [userId: string]: Collection[]
}

interface ChatHistoryStorage {
  [userId: string]: ChatHistory[]
}

interface ProfilesStorage {
  [userId: string]: any
}

export function getProfile(userId?: string) {
  const profileKey = userId || 'anonymous'
  const profiles = readJSONFile<ProfilesStorage>(PROFILES_FILE, {})
  return profiles[profileKey] || null
}

export function setProfile(profile: any, userId?: string) {
  const profileKey = userId || 'anonymous'
  const profiles = readJSONFile<ProfilesStorage>(PROFILES_FILE, {})
  profiles[profileKey] = profile
  writeJSONFile(PROFILES_FILE, profiles)
  console.log(`[ProfileStorage] Saved profile for key: ${profileKey}`)
}

export function hasProfile(userId?: string): boolean {
  const profileKey = userId || 'anonymous'
  const profile = getProfile(userId)
  return profile && Object.keys(profile).length > 0
}

export function getSavedItems(userId?: string): Product[] {
  const profileKey = userId || 'anonymous'
  const savedItems = readJSONFile<SavedItemsStorage>(SAVED_ITEMS_FILE, {})
  const userItems = savedItems[profileKey] || []
  // Convert SavedItemWithMetadata back to Product for compatibility
  return userItems.map(item => ({
    id: item.id,
    title: item.title,
    price: item.price,
    brand: item.brand,
    category: item.category,
    image: item.image,
    link: item.link,
    description: item.description,
    hasAiInsights: item.hasAiInsights,
    saved: true
  }))
}

export function setSavedItems(items: Product[], userId?: string): void {
  const profileKey = userId || 'anonymous'
  const savedItems = readJSONFile<SavedItemsStorage>(SAVED_ITEMS_FILE, {})
  // Convert Product to SavedItemWithMetadata
  savedItems[profileKey] = items.map(item => ({
    ...item,
    savedAt: new Date().toISOString(),
    userId: profileKey
  }))
  writeJSONFile(SAVED_ITEMS_FILE, savedItems)
  console.log(`[ProfileStorage] Saved ${items.length} items for key: ${profileKey}`)
}

export function addSavedItem(item: Product, userId?: string): void {
  const profileKey = userId || 'anonymous'
  const currentItems = getSavedItems(userId)
  const existingIndex = currentItems.findIndex(existingItem => existingItem.id === item.id)
  
  if (existingIndex === -1) {
    setSavedItems([...currentItems, { ...item, saved: true }], userId)
  }
}

export function removeSavedItem(itemId: string, userId?: string): void {
  const profileKey = userId || 'anonymous'
  const currentItems = getSavedItems(userId)
  const filteredItems = currentItems.filter(item => item.id !== itemId)
  setSavedItems(filteredItems, userId)
  
  // Also remove from all collections
  const collections = getCollections(userId)
  const updatedCollections = collections.map(col => ({
    ...col,
    itemIds: col.itemIds.filter(id => id !== itemId)
  }))
  setCollections(updatedCollections, userId)
}

// Collections functions
export function getCollections(userId?: string): Collection[] {
  const profileKey = userId || 'anonymous'
  const collectionsData = readJSONFile<CollectionsStorage>(COLLECTIONS_FILE, {})
  const existingCollections = collectionsData[profileKey]
  
  // If no collections exist, create default ones
  if (!existingCollections || existingCollections.length === 0) {
    const defaultCollections: Collection[] = [
      {
        id: 'col-1',
        name: 'Summer Essentials',
        color: 'bg-amber-500',
        createdAt: new Date().toISOString(),
        itemIds: []
      },
      {
        id: 'col-2', 
        name: 'Work Outfits',
        color: 'bg-blue-500',
        createdAt: new Date().toISOString(),
        itemIds: []
      },
      {
        id: 'col-3',
        name: 'Casual Weekend',
        color: 'bg-green-500',
        createdAt: new Date().toISOString(),
        itemIds: []
      },
      {
        id: 'col-4',
        name: 'Evening Wear',
        color: 'bg-purple-500',
        createdAt: new Date().toISOString(),
        itemIds: []
      },
      {
        id: 'col-5',
        name: 'Wishlist',
        color: 'bg-pink-500',
        createdAt: new Date().toISOString(),
        itemIds: []
      }
    ]
    setCollections(defaultCollections, userId)
    return defaultCollections
  }
  
  return existingCollections
}

export function setCollections(collections: Collection[], userId?: string): void {
  const profileKey = userId || 'anonymous'
  const collectionsData = readJSONFile<CollectionsStorage>(COLLECTIONS_FILE, {})
  collectionsData[profileKey] = collections
  writeJSONFile(COLLECTIONS_FILE, collectionsData)
  console.log(`[ProfileStorage] Saved ${collections.length} collections for key: ${profileKey}`)
}

export function addCollection(collection: Collection, userId?: string): void {
  const profileKey = userId || 'anonymous'
  const currentCollections = getCollections(userId)
  setCollections([...currentCollections, collection], userId)
}

export function removeCollection(collectionId: string, userId?: string): void {
  const profileKey = userId || 'anonymous'
  const currentCollections = getCollections(userId)
  const filteredCollections = currentCollections.filter(col => col.id !== collectionId)
  setCollections(filteredCollections, userId)
}

export function addItemToCollection(itemId: string, collectionId: string, userId?: string): void {
  const profileKey = userId || 'anonymous'
  const currentCollections = getCollections(userId)
  const updatedCollections = currentCollections.map(col => {
    if (col.id === collectionId && !col.itemIds.includes(itemId)) {
      return { ...col, itemIds: [...col.itemIds, itemId] }
    }
    return col
  })
  setCollections(updatedCollections, userId)
}

export function removeItemFromCollection(itemId: string, collectionId: string, userId?: string): void {
  const profileKey = userId || 'anonymous'
  const currentCollections = getCollections(userId)
  const updatedCollections = currentCollections.map(col => {
    if (col.id === collectionId) {
      return { ...col, itemIds: col.itemIds.filter(id => id !== itemId) }
    }
    return col
  })
  setCollections(updatedCollections, userId)
}

export function getItemsInCollection(collectionId: string, userId?: string): Product[] {
  const collection = getCollections(userId).find(col => col.id === collectionId)
  if (!collection) return []
  
  const savedItems = getSavedItems(userId)
  return savedItems.filter(item => collection.itemIds.includes(item.id))
}

// Chat history functions
export function getChatHistory(userId?: string): ChatHistory[] {
  const profileKey = userId || 'anonymous'
  const chatHistoryData = readJSONFile<ChatHistoryStorage>(CHAT_HISTORY_FILE, {})
  return chatHistoryData[profileKey] || []
}

export function setChatHistory(chatHistory: ChatHistory[], userId?: string): void {
  const profileKey = userId || 'anonymous'
  const chatHistoryData = readJSONFile<ChatHistoryStorage>(CHAT_HISTORY_FILE, {})
  chatHistoryData[profileKey] = chatHistory
  writeJSONFile(CHAT_HISTORY_FILE, chatHistoryData)
  console.log(`[ProfileStorage] Saved ${chatHistory.length} chat histories for key: ${profileKey}`)
}

export function addChatHistory(chatHistory: ChatHistory, userId?: string): void {
  const profileKey = userId || 'anonymous'
  const currentHistory = getChatHistory(userId)
  setChatHistory([chatHistory, ...currentHistory], userId)
}

export function updateChatHistory(chatId: string, messages: ChatMessage[], userId?: string, title?: string): void {
  const currentHistory = getChatHistory(userId)
  const updatedHistory = currentHistory.map(chat => {
    if (chat.id === chatId) {
      return { 
        ...chat, 
        messages, 
        updatedAt: new Date().toISOString(),
        ...(title && { title })
      }
    }
    return chat
  })
  setChatHistory(updatedHistory, userId)
}

export function renameChatHistory(chatId: string, newTitle: string, userId?: string): void {
  const currentHistory = getChatHistory(userId)
  const updatedHistory = currentHistory.map(chat => {
    if (chat.id === chatId) {
      return { 
        ...chat, 
        title: newTitle,
        updatedAt: new Date().toISOString()
      }
    }
    return chat
  })
  setChatHistory(updatedHistory, userId)
}

export function deleteChatHistory(chatId: string, userId?: string): void {
  const currentHistory = getChatHistory(userId)
  const filteredHistory = currentHistory.filter(chat => chat.id !== chatId)
  setChatHistory(filteredHistory, userId)
}

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
