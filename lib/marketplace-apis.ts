/**
 * Marketplace API Implementations using RapidAPI
 *
 * Real API integrations for all 7 marketplaces using RapidAPI endpoints
 */

import type {
  MarketplaceProvider,
  MarketplaceProduct,
  MarketplaceSearchParams
} from './marketplace-service'

/**
 * Base RapidAPI client class with common functionality
 */
abstract class BaseRapidAPIMarketplace {
  protected provider: MarketplaceProvider
  protected baseUrl: string
  protected rapidApiKey: string
  protected rapidApiHost: string
  protected timeout: number
  protected rateLimitMs: number

  constructor(
    provider: MarketplaceProvider,
    baseUrl: string,
    timeout = 5000,
    rateLimitMs = 1000
  ) {
    this.provider = provider
    this.baseUrl = baseUrl
    this.timeout = timeout
    this.rateLimitMs = rateLimitMs

    // Get RapidAPI credentials from environment
    const keyEnvVar = `${provider.toUpperCase().replace('-', '_')}_RAPIDAPI_KEY`
    const hostEnvVar = `${provider.toUpperCase().replace('-', '_')}_RAPIDAPI_HOST`

    this.rapidApiKey = process.env[keyEnvVar] || ''
    this.rapidApiHost = process.env[hostEnvVar] || ''
  }

  protected async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.rapidApiKey || !this.rapidApiHost) {
      throw new Error(`${this.provider} RapidAPI credentials not configured`)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const url = new URL(endpoint, this.baseUrl)
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey,
          'X-RapidAPI-Host': this.rapidApiHost,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`RapidAPI request failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  abstract search(params: MarketplaceSearchParams): Promise<MarketplaceProduct[]>
}

/**
 * Facebook Marketplace API Implementation (RapidAPI)
 */
class FacebookMarketplaceAPI extends BaseRapidAPIMarketplace {
  constructor() {
    super('facebook_marketplace', 'https://facebook-marketplace1.p.rapidapi.com', 8000, 2000)
  }

  async search(params: MarketplaceSearchParams): Promise<MarketplaceProduct[]> {
    try {
      console.log('Facebook Marketplace API: Searching for:', params.query)

      // Use user region or fallback to default
      const city = params.city || 'toronto' // Default fallback
      const country = params.country || 'ca' // Default to Canada

      const response = await this.makeRequest('search', {
        query: params.query,
        sort: 'newest',
        city: city.toLowerCase(),
        country: country.toLowerCase(),
        daysSinceListed: 1,
        limit: params.limit || 10
      })

      console.log('Facebook Marketplace API: Raw response received:', response)

      // Parse Facebook Marketplace response based on provided example
      return response.map((item: any) => {
        const productUrl = item.url || `https://www.facebook.com/marketplace/item/${item.id}`

        console.log('Facebook Marketplace API: Product URL for', item.marketplace_listing_title || item.title, ':', productUrl)

        return {
          id: `fb_${item.id}`, // Prefix with provider to ensure uniqueness
          title: item.marketplace_listing_title || item.custom_title || item.title,
          description: item.marketplace_listing_title || item.custom_title || item.title,
          price: parseFloat(item.listing_price?.amount || item.price || '0'),
          currency: item.listing_price?.currency || item.currency || 'USD',
          imageUrl: item.primary_listing_photo?.image?.uri || item.image_url || '',
          url: productUrl,
          provider: 'facebook_marketplace',
          providerProductId: item.id,
          availability: !item.is_sold,
          createdAt: item.creation_time,
          category: item.marketplace_listing_category_id ? 'marketplace' : 'general',
          shipping: {
            cost: 0,
            estimatedDays: 3,
            freeShipping: true
          },
          seller: item.marketplace_listing_seller ? {
            name: 'Seller',
            verified: false
          } : undefined
        }
      })
    } catch (error) {
      console.error('Facebook Marketplace RapidAPI error:', error)
      return []
    }
  }
}

/**
 * Grailed API Implementation (RapidAPI)
 */
class GrailedAPI extends BaseRapidAPIMarketplace {
  constructor() {
    super('grailed', 'https://grailed.p.rapidapi.com', 6000, 1000)
  }

  async search(params: MarketplaceSearchParams): Promise<MarketplaceProduct[]> {
    try {
      const response = await this.makeRequest('search', {
        query: params.query,
        page: 1,
        hitsPerPage: params.limit || 10,
        sortBy: 'mostrecent'
      })

      // Parse Grailed response based on provided example
      // The response might be wrapped in an object, extract the array
      const items = Array.isArray(response) ? response : response.hits || response.data || []
      return items.map((item: any) => ({
        id: `gr_${item.id?.toString() || item.objectID}`, // Prefix with provider
        title: item.title,
        description: item.title,
        price: item.price || item.price_i,
        currency: 'USD',
        imageUrl: item.cover_photo?.url || item.image_url || '',
        url: `https://www.grailed.com/listings/${item.id}`,
        brand: item.designer_names?.[0] || item.designers?.[0]?.name || item.brand,
        provider: 'grailed',
        providerProductId: item.id?.toString() || item.objectID,
        availability: !item.sold,
        createdAt: item.created_at || item.bumped_at,
        category: item.category || 'fashion',
        size: item.size,
        condition: item.condition === 'is_used' ? 'used' : 'new',
        seller: {
          name: item.user?.username || 'Seller',
          rating: item.user?.seller_score?.rating_average || 0
        },
        shipping: item.shipping ? {
          cost: item.shipping.us?.amount || 0,
          estimatedDays: 3,
          freeShipping: false
        } : undefined
      }))
    } catch (error) {
      console.error('Grailed RapidAPI error:', error)
      return []
    }
  }
}

/**
 * Etsy API Implementation (RapidAPI) - Updated Provider
 */
class EtsyAPI extends BaseRapidAPIMarketplace {
  constructor() {
    super('etsy', 'https://etsy-data-api.p.rapidapi.com', 5000, 500) // Updated timeout
  }

  async search(params: MarketplaceSearchParams): Promise<MarketplaceProduct[]> {
    try {
      // For now, return a placeholder result since this API requires specific listing IDs
      // In a production environment, you would need to:
      // 1. Use Etsy's official API for search
      // 2. Or implement a web scraping solution
      // 3. Or find a different RapidAPI provider that supports search

      console.log('Etsy API: Search requested for:', params.query)
      console.log('Etsy API: Note - This API requires specific listing IDs, not search queries')

      // Return a placeholder result to indicate the API is working but limited
      return [{
        id: 'etsy-placeholder-search',
        title: `Etsy search for "${params.query}"`,
        description: 'Etsy API currently requires specific listing IDs. Consider using Etsys official API for full search functionality.',
        price: 0,
        currency: 'USD',
        imageUrl: 'https://via.placeholder.com/300x300?text=Etsy+API',
        url: `https://www.etsy.com/search?q=${encodeURIComponent(params.query)}`,
        provider: 'etsy',
        providerProductId: 'placeholder',
        availability: true,
        category: 'crafts',
        seller: {
          name: 'Etsy Marketplace'
        },
        shipping: {
          cost: 0,
          estimatedDays: 3,
          freeShipping: false
        }
      }]
    } catch (error) {
      console.error('Etsy RapidAPI error:', error)
      const err = error as Error
      console.error('Etsy API: Full error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      })
      return []
    }
  }

  // Method to get specific listing details (can be used when you have listing IDs)
  async getListingDetails(listingId: string): Promise<any> {
    try {
      console.log('Etsy API: Getting listing details for ID:', listingId)
      const response = await this.makeRequest('get-listing', {
        listing_id: listingId
      })
      return response
    } catch (error) {
      console.error('Etsy API: Error getting listing details:', error)
      return null
    }
  }

  // Method to get shop details (can be used when you have shop names)
  async getShopDetails(shopName: string): Promise<any> {
    try {
      console.log('Etsy API: Getting shop details for:', shopName)
      const response = await this.makeRequest('get-shop', {
        name: shopName
      })
      return response
    } catch (error) {
      console.error('Etsy API: Error getting shop details:', error)
      return null
    }
  }
}

/**
 * Poshmark API Implementation (RapidAPI)
 */
class PoshmarkAPI extends BaseRapidAPIMarketplace {
  constructor() {
    super('poshmark', 'https://poshmark.p.rapidapi.com', 7000, 1500)
  }

  async search(params: MarketplaceSearchParams): Promise<MarketplaceProduct[]> {
    try {
      console.log('Poshmark API: Searching for:', params.query)

      const response = await this.makeRequest('search', {
        query: params.query,
        limit: params.limit || 10
      })

      console.log('Poshmark API: Raw response received:', typeof response, Array.isArray(response) ? `Array with ${response.length} items` : 'Not an array')
      console.log('Poshmark API: Response keys:', response && typeof response === 'object' ? Object.keys(response) : 'N/A')

      // Parse Poshmark response - handle both array and object formats
      let items = []
      if (Array.isArray(response)) {
        items = response
      } else if (response && typeof response === 'object') {
        // Try common response wrapper patterns
        items = response.data || response.results || response.products || response.items || []
        if (!Array.isArray(items) && response) {
          // If it's a single item object, wrap it in an array
          items = [response]
        }
      }

      if (!items || items.length === 0) {
        console.log('Poshmark API: No items found in response, returning empty array')
        return []
      }

      console.log(`Poshmark API: Found ${items.length} items to process`)

      const products = items.map((item: any) => ({
        id: `pm_${item.id}`, // Prefix with provider
        title: item.title,
        description: item.title,
        price: parseFloat(item.price_amount || '0'),
        currency: item.currency_code || 'USD',
        imageUrl: item.picture_url || item.photos?.[0]?.url || '',
        url: item.url,
        brand: item.brand,
        provider: 'poshmark' as MarketplaceProvider,
        providerProductId: item.id,
        availability: !item.sold,
        createdAt: item.created_at,
        category: item.category,
        size: item.size,
        condition: item.condition,
        seller: {
          name: item.creator?.username || 'Seller',
          rating: item.creator?.seller_score || 0
        },
        shipping: {
          cost: item.shipping_price || 0,
          estimatedDays: 3,
          freeShipping: item.free_shipping || false
        }
      }))

      console.log(`Poshmark API: Successfully parsed ${products.length} products`)
      return products
    } catch (error) {
      console.error('Poshmark RapidAPI error:', error)
      return []
    }
  }
}

/**
 * eBay API Implementation (RapidAPI)
 */
class EbayAPI extends BaseRapidAPIMarketplace {
  constructor() {
    super('ebay', 'https://ebay-data-scraper.p.rapidapi.com', 10000, 2000)
  }

  async search(params: MarketplaceSearchParams): Promise<MarketplaceProduct[]> {
    try {
      console.log('eBay API: Searching for:', params.query)

      // Use user region or fallback to default
      const country = params.country || 'us' // Default fallback

      console.log('eBay API: Using country:', country)

      const response = await this.makeRequest('products', {
        product_name: params.query,
        country: country.toLowerCase(),
        limit: params.limit || 10
      })

      console.log('eBay API: Raw response type:', typeof response)
      console.log('eBay API: Is array?', Array.isArray(response))
      console.log('eBay API: Response keys:', response && typeof response === 'object' ? Object.keys(response) : 'N/A')
      console.log('eBay API: Response length/size:', response ? (Array.isArray(response) ? response.length : JSON.stringify(response).length) : 'null/undefined')

      // Parse eBay response - handle different response formats
      let items = []
      if (Array.isArray(response)) {
        items = response
        console.log('eBay API: Response is array with', items.length, 'items')
      } else if (response && typeof response === 'object') {
        // Try common response wrapper patterns
        items = response.data || response.results || response.products || response.items || []
        if (!Array.isArray(items) && response) {
          // If it's a single item object, wrap it in an array
          items = [response]
        }
        console.log('eBay API: Extracted items from object response:', items.length, 'items')
      } else {
        console.log('eBay API: Unexpected response format')
        return []
      }

      if (!items || items.length === 0) {
        console.log('eBay API: No items found in response')
        return []
      }

      console.log('eBay API: Processing', items.length, 'items')

      const products = items.map((item: any, index: number) => {
        console.log(`eBay API: Processing item ${index + 1}:`, item.name || item.title || 'No title')

        // Ensure we have a valid URL
        const productUrl = item.link || item.url || item.product_link || `https://www.ebay.com/itm/${item.product_id || item.id}`

        return {
          id: `eb_${item.product_id || item.id || index}`, // Prefix with provider
          title: item.name || item.title || 'Untitled Product',
          description: item.name || item.title || 'No description available',
          price: parseFloat(item.price?.replace(/[$,]/g, '') || item.price_value || '0'),
          currency: item.currency || 'USD',
          imageUrl: item.thumbnail || item.image || item.images?.[0] || '',
          url: productUrl,
          provider: 'ebay' as MarketplaceProvider,
          providerProductId: item.product_id || item.id || `unknown_${index}`,
          availability: item.condition !== 'sold',
          createdAt: item.created_at,
          category: item.category,
          condition: item.condition,
          seller: {
            name: item.seller?.name || 'Seller',
            rating: item.seller?.feedback_score || 0
          },
          shipping: {
            cost: parseFloat(item.logistics_cost?.replace(/[$,]/g, '') || '0'),
            estimatedDays: 3, // eBay typically 3-5 days
            freeShipping: item.logistics_cost === '$0.00' || item.logistics_cost === 'FREE'
          }
        }
      })

      console.log('eBay API: Successfully processed', products.length, 'products')
      return products
    } catch (error) {
      console.error('eBay RapidAPI error:', error)
      console.error('eBay API: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack'
      })
      return []
    }
  }
}

/**
 * AliExpress API Implementation (RapidAPI)
 */
class AliExpressAPI extends BaseRapidAPIMarketplace {
  constructor() {
    super('aliexpress', 'https://aliexpress-api2.p.rapidapi.com', 8000, 1000)
  }

  async search(params: MarketplaceSearchParams): Promise<MarketplaceProduct[]> {
    try {
      const response = await this.makeRequest('search', {
        query: params.query,
        limit: params.limit || 10
      })

      // Parse AliExpress response based on provided example
      if (!response || !Array.isArray(response)) return []

      return response.map((item: any) => ({
        id: `ae_${item.product_id || item.id}`, // Prefix with provider
        title: item.product_title || item.title,
        description: item.product_title || item.title,
        price: parseFloat(item.price || item.sale_price || '0'),
        currency: item.currency || 'USD',
        imageUrl: item.image_url || item.images?.[0] || '',
        url: item.product_url || item.url,
        provider: 'aliexpress',
        providerProductId: item.product_id || item.id,
        availability: item.availability !== 'out_of_stock',
        createdAt: item.created_at,
        category: item.category,
        rating: item.rating,
        reviewsCount: item.reviews_count,
        seller: {
          name: item.seller_name || 'Seller',
          rating: item.seller_rating || 0
        },
        shipping: {
          cost: item.shipping_cost || 0,
          estimatedDays: item.shipping_days || 7,
          freeShipping: item.free_shipping || false
        }
      }))
    } catch (error) {
      console.error('AliExpress RapidAPI error:', error)
      return []
    }
  }
}

/**
 * StockX API Implementation (RapidAPI)
 */
class StockXAPI extends BaseRapidAPIMarketplace {
  constructor() {
    super('stockx', 'https://stockx-api.p.rapidapi.com', 6000, 1500)
  }

  async search(params: MarketplaceSearchParams): Promise<MarketplaceProduct[]> {
    try {
      const response = await this.makeRequest('search', {
        query: params.query,
        limit: params.limit || 10
      })

      // Parse StockX response based on provided example
      if (!response || !Array.isArray(response)) return []

      return response.map((item: any) => ({
        id: `sx_${item.id}`, // Prefix with provider
        title: item.title,
        description: item.title,
        price: parseFloat(item.price || item.market_value || '0'),
        currency: item.currency || 'USD',
        imageUrl: item.image_url || item.images?.[0] || '',
        url: item.url,
        brand: item.brand,
        provider: 'stockx',
        providerProductId: item.id,
        availability: item.availability !== 'sold_out',
        createdAt: item.created_at,
        category: item.category,
        condition: 'new',
        size: item.size,
        seller: {
          name: 'StockX',
          verified: true
        },
        shipping: {
          cost: 0, // StockX includes shipping
          estimatedDays: 3,
          freeShipping: true
        }
      }))
    } catch (error) {
      console.error('StockX RapidAPI error:', error)
      return []
    }
  }
}

// Export API instances
export const marketplaceAPIs = {
  facebook_marketplace: new FacebookMarketplaceAPI(),
  grailed: new GrailedAPI(),
  etsy: new EtsyAPI(),
  poshmark: new PoshmarkAPI(),
  ebay: new EbayAPI(),
  aliexpress: new AliExpressAPI(),
  stockx: new StockXAPI()
}

// Export individual API classes for testing
export {
  FacebookMarketplaceAPI,
  GrailedAPI,
  EtsyAPI,
  PoshmarkAPI,
  EbayAPI,
  AliExpressAPI,
  StockXAPI
}
