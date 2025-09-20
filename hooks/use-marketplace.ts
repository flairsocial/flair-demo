'use client'

import { useState, useCallback, useEffect } from 'react'
import { useShoppingMode } from '@/lib/shopping-mode-context'
import { useProfile } from '@/lib/profile-context'
import { useCredits } from '@/lib/credit-context'
import { marketplaceService } from '@/lib/marketplace-service'
import type {
  MarketplaceSearchParams,
  AggregatedSearchResult,
  MarketplaceProvider,
  MarketplaceProduct
} from '@/lib/marketplace-service'

interface UseMarketplaceSearchState {
  isLoading: boolean
  results: AggregatedSearchResult | null
  error: string | null
  lastSearchQuery: string | null
}

interface UseMarketplaceSearchReturn extends UseMarketplaceSearchState {
  searchProducts: (params: MarketplaceSearchParams) => Promise<void>
  clearResults: () => void
  enabledProviders: MarketplaceProvider[]
  searchHistory: MarketplaceSearchParams[]
}

/**
 * Hook for marketplace product search functionality
 */
export function useMarketplaceSearch(): UseMarketplaceSearchReturn {
  const { isMarketplace } = useShoppingMode()
  const { profile } = useProfile()
  const { currentPlan } = useCredits()
  const [state, setState] = useState<UseMarketplaceSearchState>({
    isLoading: false,
    results: null,
    error: null,
    lastSearchQuery: null
  })
  const [searchHistory, setSearchHistory] = useState<MarketplaceSearchParams[]>([])

  const searchProducts = useCallback(async (params: MarketplaceSearchParams) => {
    if (!isMarketplace) {
      setState(prev => ({
        ...prev,
        error: 'Marketplace search is only available in marketplace mode'
      }))
      return
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      lastSearchQuery: params.query
    }))

    try {
      // Merge user region data with search parameters
      const searchParamsWithRegion: MarketplaceSearchParams = {
        ...params,
        // Use user region if available, otherwise keep existing params or use defaults
        country: params.country || profile.country || undefined,
        state: params.state || profile.state || undefined,
        city: params.city || profile.city || undefined
      }

      // Check if user needs to upgrade for marketplace features
      const userAuth = {
        isSignedIn: !!profile, // Assuming profile exists if user is signed in
        currentPlan: currentPlan
      }

      const results = await marketplaceService.searchMultipleProviders(
        searchParamsWithRegion,
        undefined, // Use default providers
        userAuth
      )

      // Check if upgrade is required
      if (results.requiresUpgrade) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          results: null,
          error: results.upgradeMessage || 'Upgrade required for marketplace features'
        }))

        // Trigger pricing modal for upgrade by dispatching a custom event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('showPricingModal'))
        }

        return
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        results,
        error: null
      }))

      // Add to search history (keep last 10)
      setSearchHistory(prev => [
        searchParamsWithRegion,
        ...prev.filter(p => p.query !== searchParamsWithRegion.query).slice(0, 9)
      ])
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed'
      }))
    }
  }, [isMarketplace, profile, currentPlan])

  const clearResults = useCallback(() => {
    setState({
      isLoading: false,
      results: null,
      error: null,
      lastSearchQuery: null
    })
  }, [])

  const enabledProviders = marketplaceService.getEnabledProviders()

  return {
    ...state,
    searchProducts,
    clearResults,
    enabledProviders,
    searchHistory
  }
}

/**
 * Hook for marketplace service health monitoring
 */
export function useMarketplaceHealth() {
  const [health, setHealth] = useState<Record<MarketplaceProvider, boolean>>({} as Record<MarketplaceProvider, boolean>)
  const [isChecking, setIsChecking] = useState(false)

  const checkHealth = useCallback(async () => {
    setIsChecking(true)
    try {
      const healthStatus = await marketplaceService.checkServiceHealth()
      setHealth(healthStatus)
    } catch (error) {
      console.error('Health check failed:', error)
    } finally {
      setIsChecking(false)
    }
  }, [])

  // Check health on mount and periodically
  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [checkHealth])

  return {
    health,
    isChecking,
    checkHealth
  }
}

/**
 * Hook for marketplace configuration management
 */
export function useMarketplaceConfig() {
  const [isConfigured, setIsConfigured] = useState(false)

  const configureMarketplace = useCallback((apiKeys: Partial<Record<MarketplaceProvider, { key: string; host: string }>>) => {
    marketplaceService.initialize(apiKeys)
    setIsConfigured(Object.values(apiKeys).some(credentials => !!credentials?.key))
  }, [])

  const enableProvider = useCallback((provider: MarketplaceProvider, config: { enabled: boolean }) => {
    marketplaceService.configureProvider(provider, config)
  }, [])

  return {
    isConfigured,
    configureMarketplace,
    enableProvider
  }
}

/**
 * Hook for product deduplication and merging
 */
export function useProductDeduplication() {
  const deduplicateProducts = useCallback((products: MarketplaceProduct[]): MarketplaceProduct[] => {
    // Simple deduplication by title similarity and price
    const uniqueProducts: MarketplaceProduct[] = []
    
    for (const product of products) {
      const isDuplicate = uniqueProducts.some(existing => {
        // Check if titles are very similar
        const titleSimilarity = calculateStringSimilarity(
          product.title.toLowerCase(),
          existing.title.toLowerCase()
        )
        
        // Check if prices are close (within 10%)
        const priceDifference = Math.abs(product.price - existing.price) / Math.max(product.price, existing.price)
        
        // Consider duplicate if title similarity > 80% AND price difference < 10%
        return titleSimilarity > 0.8 && priceDifference < 0.1
      })
      
      if (!isDuplicate) {
        uniqueProducts.push(product)
      }
    }
    
    return uniqueProducts
  }, [])

  return { deduplicateProducts }
}

/**
 * Calculate string similarity using a simple approach
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(' ')
  const words2 = str2.split(' ')
  const allWords = new Set([...words1, ...words2])
  
  let matches = 0
  for (const word of allWords) {
    if (words1.includes(word) && words2.includes(word)) {
      matches++
    }
  }
  
  return matches / allWords.size
}

/**
 * Hook for marketplace search suggestions based on shopping mode
 */
export function useMarketplaceSuggestions() {
  const { isMarketplace } = useShoppingMode()

  const getSearchSuggestions = useCallback((query: string): string[] => {
    if (!isMarketplace) return []

    const suggestions = [
      `${query} vintage`,
      `${query} rare`,
      `${query} limited edition`,
      `${query} designer`,
      `${query} handmade`,
      `${query} authentic`
    ]

    return suggestions.slice(0, 4)
  }, [isMarketplace])

  return { getSearchSuggestions }
}
