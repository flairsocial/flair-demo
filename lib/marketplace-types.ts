/**
 * Marketplace Types
 * 
 * Centralized type definitions for marketplace integration
 */

import type { MarketplaceProvider, MarketplaceProduct } from './marketplace-service'

export interface MarketplaceApiCredentials {
  facebook?: {
    accessToken: string
    appId: string
    appSecret: string
  }
  grailed?: {
    apiKey: string
  }
  etsy?: {
    apiKey: string
    sharedSecret: string
    oauthToken?: string
    oauthTokenSecret?: string
  }
  poshmark?: {
    clientId: string
    clientSecret: string
    accessToken?: string
  }
  ebay?: {
    clientId: string
    clientSecret: string
    accessToken?: string
    environment: 'sandbox' | 'production'
  }
  aliexpress?: {
    appKey: string
    appSecret: string
    accessToken?: string
  }
  stockx?: {
    apiKey: string
    environment: 'sandbox' | 'production'
  }
}

export interface MarketplaceSearchOptions {
  providers?: MarketplaceProvider[]
  maxResultsPerProvider?: number
  timeoutMs?: number
  enabledProviders?: MarketplaceProvider[]
  priorityProviders?: MarketplaceProvider[]
}

export interface MarketplaceMetrics {
  searchLatency: Record<MarketplaceProvider, number>
  successRate: Record<MarketplaceProvider, number>
  totalRequests: Record<MarketplaceProvider, number>
  failedRequests: Record<MarketplaceProvider, number>
  averageResponseSize: Record<MarketplaceProvider, number>
  lastSuccessfulRequest: Record<MarketplaceProvider, Date | null>
}

export interface MarketplaceProviderStatus {
  provider: MarketplaceProvider
  isEnabled: boolean
  isHealthy: boolean
  lastError?: string
  lastHealthCheck?: Date
  requestsThisHour: number
  rateLimitRemaining?: number
  rateLimitReset?: Date
}

export interface MarketplaceSearchResponse {
  query: string
  products: MarketplaceProduct[]
  totalResults: number
  searchTime: number
  providerStatuses: MarketplaceProviderStatus[]
  aggregatedFrom: MarketplaceProvider[]
  errors: Array<{
    provider: MarketplaceProvider
    error: string
    timestamp: Date
  }>
}

export interface ProductDeduplicationConfig {
  enabled: boolean
  similarityThreshold: number // 0-1, how similar products need to be to be considered duplicates
  compareFields: Array<'title' | 'brand' | 'price' | 'image' | 'description'>
  priorityOrder: MarketplaceProvider[] // Which provider to keep when duplicates are found
}

export interface MarketplaceConfig {
  credentials: Partial<MarketplaceApiCredentials>
  searchOptions: MarketplaceSearchOptions
  deduplication: ProductDeduplicationConfig
  caching: {
    enabled: boolean
    ttlSeconds: number
    maxCacheSize: number
  }
  monitoring: {
    enabled: boolean
    metricsRetentionDays: number
    alertThresholds: {
      failureRate: number // Alert if failure rate exceeds this percentage
      responseTime: number // Alert if avg response time exceeds this (ms)
    }
  }
}

// Default configuration
export const DEFAULT_MARKETPLACE_CONFIG: MarketplaceConfig = {
  credentials: {},
  searchOptions: {
    maxResultsPerProvider: 10,
    timeoutMs: 5000,
    enabledProviders: []
  },
  deduplication: {
    enabled: true,
    similarityThreshold: 0.85,
    compareFields: ['title', 'brand', 'price'],
    priorityOrder: [
      'ebay',
      'etsy', 
      'grailed',
      'stockx',
      'poshmark',
      'facebook_marketplace',
      'aliexpress'
    ]
  },
  caching: {
    enabled: true,
    ttlSeconds: 300, // 5 minutes
    maxCacheSize: 1000
  },
  monitoring: {
    enabled: true,
    metricsRetentionDays: 30,
    alertThresholds: {
      failureRate: 50,
      responseTime: 10000
    }
  }
}

// Utility types for API responses
export interface FacebookMarketplaceResponse {
  data: Array<{
    id: string
    marketplace_listing_title: string
    listing_price: {
      amount: string
      currency: string
    }
    primary_listing_photo: {
      image: {
        uri: string
      }
    }
    url: string
    location: {
      city: string
      state: string
    }
    creation_time: string
  }>
  paging?: {
    cursors: {
      before: string
      after: string
    }
    next?: string
  }
}

export interface GrailedResponse {
  data: Array<{
    id: number
    title: string
    price: number
    price_currency: string
    photos: Array<{
      url: string
    }>
    designer: {
      name: string
    }
    size: string
    condition: string
    url: string
    created_at: string
  }>
  pagination: {
    current_page: number
    total_pages: number
    total_results: number
  }
}

export interface EtsyResponse {
  results: Array<{
    listing_id: number
    title: string
    price: string
    currency_code: string
    url: string
    Images: Array<{
      url_570xN: string
    }>
    shop_section_name?: string
    creation_timestamp: number
    materials: string[]
    tags: string[]
  }>
  count: number
  pagination: {
    effective_limit: number
    effective_offset: number
    next_offset?: number
  }
}

export interface EbayResponse {
  itemSummaries: Array<{
    itemId: string
    title: string
    price: {
      value: string
      currency: string
    }
    image: {
      imageUrl: string
    }
    itemWebUrl: string
    condition: string
    seller: {
      username: string
      feedbackPercentage: string
    }
    shippingOptions: Array<{
      shippingCost: {
        value: string
        currency: string
      }
      type: string
    }>
  }>
  total: number
  limit: number
  offset: number
}

// Export all types
export type {
  MarketplaceProvider,
  MarketplaceProduct
} from './marketplace-service'