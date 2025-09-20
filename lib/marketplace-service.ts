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
  // Region parameters for marketplace localization
  country?: string
  state?: string
  city?: string
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
    rateLimitMs: 2000, // Increased to reduce rate limiting
    timeout: 8000, // Increased timeout
    enabled: false, // Will be enabled when API key is provided
    priority: 1
  },
  grailed: {
    provider: 'grailed',
    baseUrl: 'https://api.grailed.com/api/marketplace/search',
    rateLimitMs: 1000, // Increased to reduce rate limiting
    timeout: 6000, // Increased timeout
    enabled: false,
    priority: 2
  },
  etsy: {
    provider: 'etsy',
    baseUrl: 'https://openapi.etsy.com/v3/application/listings/active',
    rateLimitMs: 500, // Increased to reduce rate limiting
    timeout: 5000, // Increased timeout
    enabled: false,
    priority: 3
  },
  poshmark: {
    provider: 'poshmark',
    baseUrl: 'https://api.poshmark.com/v1/search',
    rateLimitMs: 1500, // Moderate rate limiting
    timeout: 7000, // Good timeout for this API
    enabled: false,
    priority: 4
  },
  ebay: {
    provider: 'ebay',
    baseUrl: 'https://api.ebay.com/buy/browse/v1/item_summary/search',
    rateLimitMs: 2000, // Increased to reduce rate limiting
    timeout: 10000, // Increased timeout for eBay
    enabled: false,
    priority: 5
  },
  aliexpress: {
    provider: 'aliexpress',
    baseUrl: 'https://gw.api.alibaba.com/openapi/param2/2/portals.aliexpress/api.listPromotionProduct',
    rateLimitMs: 1000, // Moderate rate limiting
    timeout: 8000, // Increased timeout
    enabled: false,
    priority: 6
  },
  stockx: {
    provider: 'stockx',
    baseUrl: 'https://stockx.com/api/browse',
    rateLimitMs: 1500, // Moderate rate limiting
    timeout: 6000, // Good timeout
    enabled: false,
    priority: 7
  }
}

class MarketplaceService {
  private rateLimitTrackers: Map<MarketplaceProvider, number> = new Map()
  private configOverrides: Partial<Record<MarketplaceProvider, Partial<MarketplaceConfig>>> = {}

  /**
   * Initialize the service with RapidAPI keys
   * This will be called when RapidAPI keys are provided
   */
  public initialize(rapidApiKeys: Partial<Record<MarketplaceProvider, { key: string; host: string }>>) {
    Object.entries(rapidApiKeys).forEach(([provider, credentials]) => {
      if (credentials && credentials.key && credentials.host) {
        const config = MARKETPLACE_CONFIGS[provider as MarketplaceProvider]
        if (config) {
          config.apiKey = credentials.key
          config.enabled = true
        }
      }
    })
  }

  /**
   * Auto-initialize from environment variables
   */
  public autoInitialize() {
    const providers: MarketplaceProvider[] = [
      'facebook_marketplace',
      'grailed',
      'etsy',
      'poshmark',
      'ebay',
      'aliexpress',
      'stockx'
    ]

    console.log('🚀 MarketplaceService: Auto-initializing providers...')
    console.log('📋 MarketplaceService: Environment check:')
    console.log('   - Node.js version:', process.version)
    console.log('   - Platform:', process.platform)
    console.log('   - Total env vars:', Object.keys(process.env).length)
    console.log('   - RapidAPI env vars:', Object.keys(process.env).filter(k => k.includes('RAPIDAPI')).sort())

    // Check if we're in Next.js context
    const isNextJs = typeof window === 'undefined' && process.env.npm_package_name
    console.log('   - Running in Next.js:', isNextJs ? 'YES' : 'NO')

    providers.forEach(provider => {
      const keyEnvVar = `${provider.toUpperCase().replace('-', '_')}_RAPIDAPI_KEY`
      const hostEnvVar = `${provider.toUpperCase().replace('-', '_')}_RAPIDAPI_HOST`

      const apiKey = process.env[keyEnvVar]
      const apiHost = process.env[hostEnvVar]

      console.log(`🔍 ${provider}:`)
      console.log(`   - Key var: ${keyEnvVar}`)
      console.log(`   - Host var: ${hostEnvVar}`)
      console.log(`   - Key present: ${!!apiKey}`)
      console.log(`   - Host present: ${!!apiHost}`)

      if (apiKey && apiHost && apiKey !== `your_${provider}_rapidapi_key`) {
        const config = MARKETPLACE_CONFIGS[provider]
        config.apiKey = apiKey
        config.enabled = true
        console.log(`   ✅ ENABLED`)
      } else {
        console.log(`   ❌ DISABLED - Missing credentials`)
        if (!apiKey) console.log(`      Missing: ${keyEnvVar}`)
        if (!apiHost) console.log(`      Missing: ${hostEnvVar}`)
        if (apiKey === `your_${provider}_rapidapi_key`) console.log(`      Invalid: Key is placeholder`)
      }
    })

    const enabledCount = providers.filter(p => MARKETPLACE_CONFIGS[p].enabled).length
    console.log(`📊 MarketplaceService: Initialization complete - ${enabledCount}/${providers.length} providers enabled`)

    if (enabledCount === 0) {
      console.log('⚠️  WARNING: No marketplace providers enabled!')
      console.log('💡 This could be due to:')
      console.log('   1. Environment variables not loaded in Next.js context')
      console.log('   2. .env.local file not being read')
      console.log('   3. Variables have wrong names')
      console.log('   4. Next.js server needs restart')
    }
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
   * Search a single marketplace provider using real API implementations
   */
  private async searchSingleProvider(
    provider: MarketplaceProvider,
    params: MarketplaceSearchParams
  ): Promise<MarketplaceSearchResult> {
    const startTime = Date.now()
    const config = this.getProviderConfig(provider)

    if (!config.enabled) {
      return {
        products: [],
        provider,
        totalResults: 0,
        searchTime: Date.now() - startTime,
        success: false,
        error: 'Provider not enabled'
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

      // Import the marketplace APIs dynamically to avoid circular dependencies
      const { marketplaceAPIs } = await import('./marketplace-apis')

      const api = marketplaceAPIs[provider]
      if (!api) {
        throw new Error(`API implementation not found for provider: ${provider}`)
      }

      const products = await api.search(params)

      return {
        products,
        provider,
        totalResults: products.length,
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

    console.log(`MarketplaceService: Searching ${targetProviders.length} providers: ${targetProviders.join(', ')}`)

    // Create promises for all provider searches with better error handling
    const searchPromises = targetProviders.map(async (provider) => {
      try {
        console.log(`MarketplaceService: Starting search for ${provider}`)
        const result = await this.searchSingleProvider(provider, params)
        console.log(`MarketplaceService: ${provider} completed - ${result.totalResults} results, success: ${result.success}`)
        return result
      } catch (error) {
        console.error(`MarketplaceService: ${provider} failed with error:`, error)
        return {
          products: [],
          provider,
          totalResults: 0,
          searchTime: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as MarketplaceSearchResult
      }
    })

    // Wait for all searches to complete with individual timeouts
    const results = await Promise.allSettled(searchPromises)

    // Process results - handle both fulfilled and rejected promises
    const processedResults: MarketplaceSearchResult[] = results.map((result, index) => {
      const provider = targetProviders[index]

      if (result.status === 'fulfilled') {
        return result.value
      } else {
        console.error(`MarketplaceService: ${provider} promise rejected:`, result.reason)
        return {
          products: [],
          provider,
          totalResults: 0,
          searchTime: Date.now() - startTime,
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Promise rejected'
        } as MarketplaceSearchResult
      }
    })

    // Aggregate and sort results from successful providers only
    const allProducts = processedResults
      .filter(result => result.success && result.products.length > 0)
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

    // Apply limit if specified, but ensure we get results from multiple providers
    const limitedProducts = params.limit ? allProducts.slice(0, params.limit) : allProducts

    const successfulProviders = processedResults
      .filter(result => result.success)
      .map(result => result.provider)

    const failedProviders = processedResults
      .filter(result => !result.success)
      .map(result => result.provider)

    console.log(`MarketplaceService: Search completed - ${limitedProducts.length} total products from ${successfulProviders.length} successful providers`)
    console.log(`MarketplaceService: Failed providers: ${failedProviders.join(', ')}`)

    return {
      products: limitedProducts,
      results: processedResults,
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

// Auto-initialize from environment variables on module load
marketplaceService.autoInitialize()

// Export types and service
export default MarketplaceService
