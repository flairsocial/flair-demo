"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import type { Product } from '@/lib/types'

// SavedItem extends Product with additional metadata from database
export interface SavedItem extends Product {
  savedAt: string
  userId: string
  collectionIds?: string[] // Optional for now, can be loaded separately
}

interface SavedItemsContextType {
  savedItems: Product[]
  savedItemsWithMetadata: SavedItem[]
  savedItemIds: Set<string>
  isLoading: boolean
  hasLoaded: boolean
  isSaved: (itemId: string) => boolean
  toggleSaved: (item: Product) => Promise<boolean>
  loadSavedItems: () => Promise<void>
}

const SavedItemsContext = createContext<SavedItemsContextType | undefined>(undefined)

export function SavedItemsProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth()
  const [savedItems, setSavedItems] = useState<Product[]>([])
  const [savedItemsWithMetadata, setSavedItemsWithMetadata] = useState<SavedItem[]>([])
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Load saved items - ONLY call this explicitly, never in render
  const loadSavedItems = useCallback(async () => {
    if (!userId || !isLoaded) {
      console.log('[SavedItemsContext] ⏭️ Cannot load - user not ready')
      return
    }

    if (hasLoaded) {
      console.log('[SavedItemsContext] ✅ Already loaded - skipping')
      return
    }

    if (isLoading) {
      console.log('[SavedItemsContext] ⏳ Already loading - skipping')
      return
    }

    console.log('[SavedItemsContext] 🚀 Loading saved items for user:', userId)
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/saved', {
        cache: 'no-cache'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch saved items: ${response.status}`)
      }
      
      const dbItems = await response.json()
      
      // Convert to Product array for backward compatibility
      const items: Product[] = dbItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        price: item.price,
        brand: item.brand || '',
        category: item.category || undefined,
        image: item.image || '',
        width: undefined,
        height: undefined,
        photographer: undefined,
        photographer_url: undefined,
        hasAiInsights: false,
        saved: true,
        link: item.url || undefined
      }))

      // Convert to SavedItem array with metadata
      const itemsWithMetadata: SavedItem[] = dbItems.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        price: item.price,
        brand: item.brand || '',
        category: item.category || undefined,
        image: item.image || '',
        width: undefined,
        height: undefined,
        photographer: undefined,
        photographer_url: undefined,
        hasAiInsights: false,
        saved: true,
        link: item.url || undefined,
        savedAt: item.savedAt,
        userId: item.userId,
        collectionIds: []
      }))

      setSavedItems(items)
      setSavedItemsWithMetadata(itemsWithMetadata)
      setSavedItemIds(new Set(items.map(item => item.id)))
      setHasLoaded(true)
      
      console.log(`[SavedItemsContext] ✅ Loaded ${items.length} saved items`)
    } catch (error) {
      console.error('[SavedItemsContext] ❌ Error loading saved items:', error)
      // Don't clear data on error - keep existing state
    } finally {
      setIsLoading(false)
    }
  }, [userId, isLoaded, hasLoaded, isLoading])

  // Reset when user changes or logs out
  useEffect(() => {
    if (!isLoaded) return // Wait for auth to load
    
    if (!userId) {
      // User logged out - clear everything
      console.log('[SavedItemsContext] 🧹 User logged out - clearing data')
      setSavedItems([])
      setSavedItemsWithMetadata([])
      setSavedItemIds(new Set())
      setIsLoading(false)
      setHasLoaded(false)
      return
    }
    
    // New user - reset hasLoaded flag so they can load their data
    if (hasLoaded) {
      console.log('[SavedItemsContext] 👤 User changed - resetting load state')
      setHasLoaded(false)
    }
  }, [userId, isLoaded, hasLoaded])

  // CRITICAL FIX: isSaved should NEVER trigger loading during render
  const isSaved = useCallback((itemId: string) => {
    return savedItemIds.has(itemId)
  }, [savedItemIds])

  const toggleSaved = useCallback(async (item: Product): Promise<boolean> => {
    if (!userId || !isLoaded) return false

    const wasAlreadySaved = savedItemIds.has(item.id)
    console.log(`[SavedItemsContext] ${wasAlreadySaved ? 'Removing' : 'Adding'} item:`, item.title)
    
    try {
      const response = await fetch('/api/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: wasAlreadySaved ? 'remove' : 'add',
          item: item
        })
      })

      const result = await response.json()
      const success = response.ok && result.success

      if (success) {
        if (wasAlreadySaved) {
          // Remove from local state immediately for instant UI feedback
          setSavedItems(prev => prev.filter(savedItem => savedItem.id !== item.id))
          setSavedItemsWithMetadata(prev => prev.filter(savedItem => savedItem.id !== item.id))
          setSavedItemIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(item.id)
            return newSet
          })
        } else {
          // Add to local state immediately for instant UI feedback
          const newSavedItem: SavedItem = {
            ...item,
            savedAt: new Date().toISOString(),
            userId: userId,
            collectionIds: []
          }
          setSavedItems(prev => [...prev, item])
          setSavedItemsWithMetadata(prev => [...prev, newSavedItem])
          setSavedItemIds(prev => new Set([...prev, item.id]))
        }
        console.log(`[SavedItemsContext] ✅ ${wasAlreadySaved ? 'Removed' : 'Added'} item successfully`)
      }

      return success
    } catch (error) {
      console.error('[SavedItemsContext] ❌ Error toggling saved item:', error)
      return false
    }
  }, [userId, isLoaded, savedItemIds])

  const contextValue: SavedItemsContextType = {
    savedItems,
    savedItemsWithMetadata,
    savedItemIds,
    isLoading,
    hasLoaded,
    isSaved,
    toggleSaved,
    loadSavedItems,
  }

  return (
    <SavedItemsContext.Provider value={contextValue}>
      {children}
    </SavedItemsContext.Provider>
  )
}

export function useSavedItems() {
  const context = useContext(SavedItemsContext)
  if (context === undefined) {
    throw new Error('useSavedItems must be used within a SavedItemsProvider')
  }
  return context
}
