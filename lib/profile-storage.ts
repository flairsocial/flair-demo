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

export function updateChatHistory(chatId: string, messages: ChatMessage[], userId?: string): void {
  const profileKey = userId || 'anonymous'
  const currentHistory = getChatHistory(userId)
  const updatedHistory = currentHistory.map(chat => {
    if (chat.id === chatId) {
      return { 
        ...chat, 
        messages, 
        updatedAt: new Date().toISOString(),
        title: messages.length > 0 ? generateChatTitle(messages[0].content) : chat.title
      }
    }
    return chat
  })
  setChatHistory(updatedHistory, userId)
}

export function deleteChatHistory(chatId: string, userId?: string): void {
  const profileKey = userId || 'anonymous'
  const currentHistory = getChatHistory(userId)
  const filteredHistory = currentHistory.filter(chat => chat.id !== chatId)
  setChatHistory(filteredHistory, userId)
}

function generateChatTitle(firstMessage: string): string {
  // Generate a title from the first message (first 50 characters)
  const title = firstMessage.trim().slice(0, 50)
  return title.length === 50 ? title + '...' : title
}
