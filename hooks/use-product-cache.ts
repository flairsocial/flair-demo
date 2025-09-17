import { useRef, useCallback } from 'react'
import type { Product } from '@/lib/types'

interface ProductCache {
  products: Product[]
  searchQuery: string
  category: string
  page: number
  timestamp: number
  hasMore: boolean
}

export function useProductCache() {
  const cacheRef = useRef<Map<string, ProductCache>>(new Map())
  const MAX_CACHE_SIZE = 10 // Keep only 10 different search/category combinations
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  const getCacheKey = (searchQuery: string, category: string) => {
    return `${searchQuery.toLowerCase()}-${category.toLowerCase()}`
  }

  const getCachedProducts = useCallback((searchQuery: string, category: string, page: number): Product[] | null => {
    const key = getCacheKey(searchQuery, category)
    const cached = cacheRef.current.get(key)
    
    if (!cached) return null
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      cacheRef.current.delete(key)
      return null
    }
    
    // Check if we have enough cached pages
    if (page > cached.page) return null
    
    // Return the products for the requested page range
    const productsPerPage = 20 // Adjust based on your pagination
    return cached.products.slice(0, page * productsPerPage)
  }, [])

  const cacheProducts = useCallback((
    searchQuery: string, 
    category: string, 
    products: Product[], 
    page: number,
    hasMore: boolean
  ) => {
    const key = getCacheKey(searchQuery, category)
    const existing = cacheRef.current.get(key)
    
    let allProducts = products
    if (existing && page > 1) {
      // Merge with existing products for pagination
      allProducts = [...existing.products, ...products]
    }
    
    // Cleanup old cache entries if too many
    if (cacheRef.current.size >= MAX_CACHE_SIZE) {
      const firstKey = cacheRef.current.keys().next().value
      if (firstKey) {
        cacheRef.current.delete(firstKey)
      }
    }
    
    cacheRef.current.set(key, {
      products: allProducts,
      searchQuery,
      category,
      page,
      timestamp: Date.now(),
      hasMore
    })
  }, [])

  const clearCache = useCallback((searchQuery?: string, category?: string) => {
    if (searchQuery !== undefined && category !== undefined) {
      const key = getCacheKey(searchQuery, category)
      cacheRef.current.delete(key)
    } else {
      cacheRef.current.clear()
    }
  }, [])

  const getCachedMeta = useCallback((searchQuery: string, category: string) => {
    const key = getCacheKey(searchQuery, category)
    const cached = cacheRef.current.get(key)
    
    if (!cached || Date.now() - cached.timestamp > CACHE_DURATION) {
      return null
    }
    
    return {
      page: cached.page,
      hasMore: cached.hasMore,
      totalProducts: cached.products.length
    }
  }, [])

  return {
    getCachedProducts,
    cacheProducts,
    clearCache,
    getCachedMeta
  }
}