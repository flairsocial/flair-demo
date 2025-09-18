/**
 * Marketplace Service Foundation
 * 
 * This service is designed to handle multiple marketplace APIs simultaneously
 * with optimization for latency and performance. Currently prepared for future
 * integration with Facebook Marketplace, Grailed, Etsy, Poshmark, eBay, 
 * AliExpress, and StockX APIs.
 */

export type MarketplaceProvider = 
  | 'facebook_marketplace'
  | 'grailed'
  | 'etsy'
  | 'poshmark'
  | 'ebay'
  | 'aliexpress'
  | 'stockx'

export interface MarketplaceConfig {
  provider: MarketplaceProvider
  apiKey?: string
  baseUrl: string
  rateLimitMs: number // Minimum time between requests
  timeout: number // Request timeout in ms
  enabled: boolean
  priority: number // Lower number = higher priority
}

export interface MarketplaceProduct {
  id: string
  title: string
  description: string
  price: number
  currency: string
  imageUrl: string
  url: string
  brand?: string
  condition?: 'new' | 'used' | 'refurbished'
  provider: MarketplaceProvider
  providerProductId: string
  availability: boolean
  createdAt?: string
  size?: string
  color?: string
  category?: string
  shipping?: {
    cost: number
    estimatedDays: number
    freeShipping: boolean
  }
  seller?: {
    name: string
    rating?: number
    verified?: boolean
  }
}

export interface MarketplaceSearchParams {
  query: string
  category?: string
  minPrice?: number
  maxPrice?: number
  condition?: 'new' | 'used' | 'any'
  size?: string
  color?: string
  brand?: string
  limit?: number
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'newest' | 'rating'
  freeShipping?: boolean
}

export interface MarketplaceSearchResult {
  products: MarketplaceProduct[]
  provider: MarketplaceProvider
  totalResults: number
  searchTime: number // Time taken for this provider's search
  success: boolean
  error?: string
}

export interface AggregatedSearchResult {
  products: MarketplaceProduct[]
  results: MarketplaceSearchResult[]
  totalSearchTime: number
  successfulProviders: MarketplaceProvider[]
  failedProviders: MarketplaceProvider[]
}

/**
 * Marketplace service configuration
 * This will be populated with actual API keys and endpoints when ready
 */
const MARKETPLACE_CONFIGS: Record<MarketplaceProvider, MarketplaceConfig> = {
  facebook_marketplace: {
    provider: 'facebook_marketplace',
    baseUrl: 'https://graph.facebook.com/v18.0/marketplace_search',
    rateLimitMs: 1000,
    timeout: 5000,
    enabled: false, // Will be enabled when API key is provided
    priority: 1
  },
  grailed: {
    provider: 'grailed',
    baseUrl: 'https://api.grailed.com/api/marketplace/search',
    rateLimitMs: 500,
    timeout: 4000,
    enabled: false,
    priority: 2
  },
  etsy: {
    provider: 'etsy',
    baseUrl: 'https://openapi.etsy.com/v3/application/listings/active',
    rateLimitMs: 200,
    timeout: 3000,
    enabled: false,
    priority: 3
  },
  poshmark: {
    provider: 'poshmark',
    baseUrl: 'https://api.poshmark.com/v1/search',
    rateLimitMs: 1000,
    timeout: 5000,
    enabled: false,
    priority: 4
  },
  ebay: {
    provider: 'ebay',
    baseUrl: 'https://api.ebay.com/buy/browse/v1/item_summary/search',
    rateLimitMs: 100,
    timeout: 3000,
    enabled: false,
    priority: 5
  },
  aliexpress: {
    provider: 'aliexpress',
    baseUrl: 'https://gw.api.alibaba.com/openapi/param2/2/portals.aliexpress/api.listPromotionProduct',
    rateLimitMs: 500,
    timeout: 6000,
    enabled: false,
    priority: 6
  },
  stockx: {
    provider: 'stockx',
    baseUrl: 'https://stockx.com/api/browse',
    rateLimitMs: 1000,
    timeout: 4000,
    enabled: false,
    priority: 7
  }
}

class MarketplaceService {
  private rateLimitTrackers: Map<MarketplaceProvider, number> = new Map()
  private configOverrides: Partial<Record<MarketplaceProvider, Partial<MarketplaceConfig>>> = {}

  /**
   * Initialize the service with API keys
   * This will be called when API keys are provided
   */
  public initialize(apiKeys: Partial<Record<MarketplaceProvider, string>>) {
    Object.entries(apiKeys).forEach(([provider, apiKey]) => {
      if (apiKey) {
        const config = MARKETPLACE_CONFIGS[provider as MarketplaceProvider]
        if (config) {
          config.apiKey = apiKey
          config.enabled = true
        }
      }
    })
  }

  /**
   * Override configuration for specific providers
   */
  public configureProvider(provider: MarketplaceProvider, config: Partial<MarketplaceConfig>) {
    this.configOverrides[provider] = config
  }

  /**
   * Get effective configuration for a provider
   */
  private getProviderConfig(provider: MarketplaceProvider): MarketplaceConfig {
    const baseConfig = MARKETPLACE_CONFIGS[provider]
    const overrides = this.configOverrides[provider] || {}
    return { ...baseConfig, ...overrides }
  }

  /**
   * Check if rate limiting allows a request to this provider
   */
  private canMakeRequest(provider: MarketplaceProvider): boolean {
    const config = this.getProviderConfig(provider)
    const lastRequest = this.rateLimitTrackers.get(provider) || 0
    return Date.now() - lastRequest >= config.rateLimitMs
  }

  /**
   * Update rate limit tracker after making a request
   */
  private updateRateLimit(provider: MarketplaceProvider) {
    this.rateLimitTrackers.set(provider, Date.now())
  }

  /**
   * Search a single marketplace provider
   * This is a placeholder - actual implementation will use real API calls
   */
  private async searchSingleProvider(
    provider: MarketplaceProvider,
    params: MarketplaceSearchParams
  ): Promise<MarketplaceSearchResult> {
    const startTime = Date.now()
    const config = this.getProviderConfig(provider)

    if (!config.enabled || !config.apiKey) {
      return {
        products: [],
        provider,
        totalResults: 0,
        searchTime: Date.now() - startTime,
        success: false,
        error: 'Provider not configured or disabled'
      }
    }

    if (!this.canMakeRequest(provider)) {
      return {
        products: [],
        provider,
        totalResults: 0,
        searchTime: Date.now() - startTime,
        success: false,
        error: 'Rate limit exceeded'
      }
    }

    try {
      this.updateRateLimit(provider)

      // TODO: Replace with actual API implementation
      // This is a placeholder that will be replaced with real API calls
      const mockProducts: MarketplaceProduct[] = []

      return {
        products: mockProducts,
        provider,
        totalResults: mockProducts.length,
        searchTime: Date.now() - startTime,
        success: true
      }
    } catch (error) {
      return {
        products: [],
        provider,
        totalResults: 0,
        searchTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Search multiple marketplace providers simultaneously
   * Optimized for latency with parallel requests and smart error handling
   */
  public async searchMultipleProviders(
    params: MarketplaceSearchParams,
    providers?: MarketplaceProvider[]
  ): Promise<AggregatedSearchResult> {
    const startTime = Date.now()
    
    // Use all enabled providers if none specified
    const targetProviders = providers || Object.keys(MARKETPLACE_CONFIGS)
      .filter(p => this.getProviderConfig(p as MarketplaceProvider).enabled)
      .sort((a, b) => 
        this.getProviderConfig(a as MarketplaceProvider).priority - 
        this.getProviderConfig(b as MarketplaceProvider).priority
      ) as MarketplaceProvider[]

    // Create promises for all provider searches
    const searchPromises = targetProviders.map(provider => 
      this.searchSingleProvider(provider, params)
        .catch(error => ({
          products: [],
          provider,
          totalResults: 0,
          searchTime: Date.now() - startTime,
          success: false,
          error: error.message
        } as MarketplaceSearchResult))
    )

    // Wait for all searches to complete (or timeout)
    const results = await Promise.all(searchPromises)

    // Aggregate and sort results
    const allProducts = results
      .filter(result => result.success)
      .flatMap(result => result.products)
      .sort((a, b) => {
        // Sort by provider priority first, then by relevance/price
        const providerPriorityA = this.getProviderConfig(a.provider).priority
        const providerPriorityB = this.getProviderConfig(b.provider).priority
        
        if (providerPriorityA !== providerPriorityB) {
          return providerPriorityA - providerPriorityB
        }
        
        // Secondary sort by price if sort parameter is specified
        if (params.sortBy === 'price_low') {
          return a.price - b.price
        } else if (params.sortBy === 'price_high') {
          return b.price - a.price
        }
        
        return 0 // Keep original order for relevance
      })

    // Apply limit if specified
    const limitedProducts = params.limit ? allProducts.slice(0, params.limit) : allProducts

    const successfulProviders = results
      .filter(result => result.success)
      .map(result => result.provider)

    const failedProviders = results
      .filter(result => !result.success)
      .map(result => result.provider)

    return {
      products: limitedProducts,
      results,
      totalSearchTime: Date.now() - startTime,
      successfulProviders,
      failedProviders
    }
  }

  /**
   * Get enabled marketplace providers
   */
  public getEnabledProviders(): MarketplaceProvider[] {
    return Object.keys(MARKETPLACE_CONFIGS)
      .filter(p => this.getProviderConfig(p as MarketplaceProvider).enabled)
      .sort((a, b) => 
        this.getProviderConfig(a as MarketplaceProvider).priority - 
        this.getProviderConfig(b as MarketplaceProvider).priority
      ) as MarketplaceProvider[]
  }

  /**
   * Check service health - which providers are working
   */
  public async checkServiceHealth(): Promise<Record<MarketplaceProvider, boolean>> {
    const providers = Object.keys(MARKETPLACE_CONFIGS) as MarketplaceProvider[]
    const healthChecks = await Promise.all(
      providers.map(async provider => {
        try {
          const result = await this.searchSingleProvider(provider, { 
            query: 'test', 
            limit: 1 
          })
          return { provider, healthy: result.success }
        } catch {
          return { provider, healthy: false }
        }
      })
    )

    return healthChecks.reduce((acc, { provider, healthy }) => {
      acc[provider] = healthy
      return acc
    }, {} as Record<MarketplaceProvider, boolean>)
  }
}

// Export singleton instance
export const marketplaceService = new MarketplaceService()

// Export types and service
export default MarketplaceService