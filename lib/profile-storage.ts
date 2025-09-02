// Shared profile storage for all APIs
// In production, this would be replaced with a database
import type { Product } from './types'

export const profileStorage = new Map<string, any>()
export const savedItemsStorage = new Map<string, Product[]>()

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
