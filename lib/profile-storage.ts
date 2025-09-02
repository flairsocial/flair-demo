// Shared profile storage for all APIs
// In production, this would be replaced with a database
import type { Product } from './types'

export interface Collection {
  id: string
  name: string
  color: string
  createdAt: string
  itemIds: string[]
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

export const profileStorage = new Map<string, any>()
export const savedItemsStorage = new Map<string, Product[]>()
export const collectionsStorage = new Map<string, Collection[]>()
export const chatHistoryStorage = new Map<string, ChatHistory[]>()

export function getProfile(userId?: string) {
  const profileKey = userId || 'anonymous'
  return profileStorage.get(profileKey) || null
}

export function setProfile(profile: any, userId?: string) {
  const profileKey = userId || 'anonymous'
  profileStorage.set(profileKey, profile)
  console.log(`[ProfileStorage] Saved profile for key: ${profileKey}`)
}

export function hasProfile(userId?: string): boolean {
  const profileKey = userId || 'anonymous'
  const profile = profileStorage.get(profileKey)
  return profile && Object.keys(profile).length > 0
}

export function getSavedItems(userId?: string): Product[] {
  const profileKey = userId || 'anonymous'
  return savedItemsStorage.get(profileKey) || []
}

export function setSavedItems(items: Product[], userId?: string): void {
  const profileKey = userId || 'anonymous'
  savedItemsStorage.set(profileKey, items)
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
}

// Collections functions
export function getCollections(userId?: string): Collection[] {
  const profileKey = userId || 'anonymous'
  const existingCollections = collectionsStorage.get(profileKey)
  
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
  collectionsStorage.set(profileKey, collections)
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

// Chat history functions
export function getChatHistory(userId?: string): ChatHistory[] {
  const profileKey = userId || 'anonymous'
  return chatHistoryStorage.get(profileKey) || []
}

export function setChatHistory(chatHistory: ChatHistory[], userId?: string): void {
  const profileKey = userId || 'anonymous'
  chatHistoryStorage.set(profileKey, chatHistory)
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
