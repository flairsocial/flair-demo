"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import type { Product } from '@/lib/types'

interface SavedItemsContextType {
  savedItems: Product[]
  isLoading: boolean
  addSavedItem: (item: Product) => Promise<void>
  removeSavedItem: (itemId: string) => Promise<void>
  checkIfSaved: (itemId: string) => boolean
  refreshSavedItems: () => Promise<void>
}

const SavedItemsContext = createContext<SavedItemsContextType | undefined>(undefined)

export function SavedItemsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()
  const [savedItems, setSavedItems] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Load saved items ONLY ONCE when user is authenticated
  useEffect(() => {
    if (isLoaded && user && !hasLoadedOnce) {
      loadSavedItems()
      setHasLoadedOnce(true)
    } else if (isLoaded && !user) {
      // User logged out - clear data
      setSavedItems([])
      setHasLoadedOnce(false)
      setIsLoading(false)
    }
  }, [isLoaded, user, hasLoadedOnce])

  const loadSavedItems = async () => {
    try {
      setIsLoading(true)
      console.log('[SavedItemsContext] Loading saved items from API...')
      
      const response = await fetch('/api/saved')
      if (response.ok) {
        const items = await response.json()
        setSavedItems(items)
        console.log(`[SavedItemsContext] Loaded ${items.length} saved items`)
      }
    } catch (error) {
      console.error('[SavedItemsContext] Error loading saved items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addSavedItem = async (item: Product) => {
    try {
      // Optimistic update - update UI immediately
      setSavedItems(prev => [{ ...item, saved: true }, ...prev])
      
      const response = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', item })
      })

      if (!response.ok) {
        // Revert optimistic update on failure
        setSavedItems(prev => prev.filter(savedItem => savedItem.id !== item.id))
        throw new Error('Failed to save item')
      }
      
      console.log(`[SavedItemsContext] Added item: ${item.title}`)
    } catch (error) {
      console.error('[SavedItemsContext] Error adding saved item:', error)
    }
  }

  const removeSavedItem = async (itemId: string) => {
    try {
      // Optimistic update - update UI immediately
      const itemToRemove = savedItems.find(item => item.id === itemId)
      setSavedItems(prev => prev.filter(item => item.id !== itemId))
      
      const response = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', item: { id: itemId } })
      })

      if (!response.ok) {
        // Revert optimistic update on failure
        if (itemToRemove) {
          setSavedItems(prev => [itemToRemove, ...prev])
        }
        throw new Error('Failed to remove item')
      }
      
      console.log(`[SavedItemsContext] Removed item: ${itemId}`)
    } catch (error) {
      console.error('[SavedItemsContext] Error removing saved item:', error)
    }
  }

  const checkIfSaved = (itemId: string): boolean => {
    return savedItems.some(item => item.id === itemId)
  }

  const refreshSavedItems = async () => {
    await loadSavedItems()
  }

  const value: SavedItemsContextType = {
    savedItems,
    isLoading,
    addSavedItem,
    removeSavedItem,
    checkIfSaved,
    refreshSavedItems
  }

  return (
    <SavedItemsContext.Provider value={value}>
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
