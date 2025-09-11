import type { Product } from "@/lib/types"

export interface RealProductData {
  reviews?: {
    overallRating: number
    totalReviewCount: number
    averageRating: number
    topReviews: Array<{
      author: string
      date: string
      rating: number
      title?: string
      content: string
      verified: boolean
      helpful: number
    }>
    sentiment: {
      positive: number
      neutral: number
      negative: number
    }
    recentReviews: Array<{
      date: string
      rating: number
      verified: boolean
    }>
  }
  specifications?: {
    dimensions?: string
    weight?: string
    materials?: string[]
    construction?: string
    features?: string[]
    warranty?: string
    manufacturer?: string
    model?: string
    color?: string
    size?: string
    compatibility?: string[]
    requirements?: string
    includedItems?: string[]
  }
  availability?: {
    inStock: boolean
    shipping?: string
    delivery?: string
    primeEligible?: boolean
    expressShipping?: boolean
    estimatedDelivery?: string
    stockCount?: number
    storePickup?: boolean
    internationalShipping?: boolean
  }
  pricing?: {
    current: number
    original?: number
    savings?: number
    savingsPercentage?: number
    isDeal?: boolean
    isClearance?: boolean
    isDiscounted?: boolean
  }
  merchant?: {
    name: string
    rating?: number
    reviewCount?: number
    trustScore?: number
    returnPolicy?: string
    warranty?: string
  }
}

export class RealProductDataService {

  /**
   * Extract comprehensive real-time product data from URL
   */
  static async extractRealProductData(url: string): Promise<RealProductData | null> {
    try {
      console.log(`[RealProductData] Extracting real data from: ${url}`)

      // Detect retailer/service
      const retailerType = this.detectRetailerType(url)
      console.log(`[RealProductData] Detected retailer type: ${retailerType}`)

      // Universal HTML extraction
      const htmlContent = await this.fetchPageContent(url)
      if (!htmlContent) return null

      const productData: RealProductData = {}

      // Extract reviews based on retailer
      productData.reviews = await this.extractReviews(htmlContent, retailerType, url)

      // Extract specifications
      productData.specifications = await this.extractSpecifications(htmlContent, retailerType)

      // Extract availability information
      productData.availability = await this.extractAvailability(htmlContent, retailerType)

      // Extract pricing details
      productData.pricing = await this.extractPricing(htmlContent, retailerType)

      // Extract merchant information
      productData.merchant = await this.extractMerchantInfo(htmlContent, retailerType, url)

      console.log(`[RealProductData] Successfully extracted data:`, {
        reviews: !!productData.reviews?.totalReviewCount,
        specs: !!productData.specifications,
        availability: !!productData.availability,
        pricing: !!productData.pricing
      })

      return productData

    } catch (error) {
      console.error('[RealProductData] Error extracting data:', error)
      return null
    }
  }

  /**
   * Detect retailer type from URL
   */
  private static detectRetailerType(url: string): string {
    if (url.includes('amazon.com')) return 'amazon'
    if (url.includes('bestbuy.com')) return 'bestbuy'
    if (url.includes('walmart.com')) return 'walmart'
    if (url.includes('target.com')) return 'target'
    if (url.includes('homedepot.com')) return 'homedepot'
    if (url.includes('lowes.com')) return 'lowes'
    if (url.includes('nordstrom.com')) return 'nordstrom'
    if (url.includes('nike.com')) return 'nike'
    if (url.includes('adidas.com')) return 'adidas'
    if (url.includes('stockx.com')) return 'stockx'
    if (url.includes('goat.com')) return 'goat'
    return 'generic'
  }

  /**
   * Fetch page content with proper headers
   */
  private static async fetchPageContent(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        // Adding timeout
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        console.error(`[RealProductData] Failed to fetch ${url}: ${response.status}`)
        return null
      }

      return await response.text()
    } catch (error) {
      console.error('[RealProductData] Fetch error:', error)
      return null
    }
  }

  /**
   * Extract reviews based on retailer type
   */
  private static async extractReviews(html: string, retailer: string, url: string): Promise<RealProductData['reviews'] | undefined> {
    try {
      // Amazon review extraction
      if (retailer === 'amazon') {
        return this.extractAmazonReviews(html)
      }

      // Generic review extraction (works for most sites)
      return this.extractGenericReviews(html)

    } catch (error) {
      console.error('[RealProductData] Review extraction error:', error)
      return undefined
    }
  }

  /**
   * Extract specifications from various retailer formats
   */
  private static async extractSpecifications(html: string, retailer: string): Promise<RealProductData['specifications'] | undefined> {
    try {
      // Amazon specifications
      if (retailer === 'amazon') {
        return this.extractAmazonSpecs(html)
      }

      // Generic specification extraction
      return this.extractGenericSpecs(html)

    } catch (error) {
      console.error('[RealProductData] Spec extraction error:', error)
      return undefined
    }
  }

  /**
   * Extract availability information
   */
  private static async extractAvailability(html: string, retailer: string): Promise<RealProductData['availability'] | undefined> {
    const availability: RealProductData['availability'] = {
      inStock: true
    }

    // Look for out of stock indicators
    if (html.toLowerCase().includes('out of stock') ||
        html.toLowerCase().includes('not available') ||
        html.toLowerCase().includes('unavailable')) {
      availability.inStock = false
    }

    // Extract shipping info
    const shippingMatches = html.match(/(ships?\s+within?\s*[\d\s]+(?:days?|business\s+days?))/gi)
    if (shippingMatches) {
      availability.shipping = shippingMatches[0]
    }

    // Extract delivery info
    const deliveryMatches = html.match(/(arrives?\s+[a-z0-9\s,-]+\s*(?:\d{1,2}\/\d{1,2}|\d{1,2}th|\d{1,2}nd|\d{1,2}st|monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi)
    if (deliveryMatches) {
      availability.delivery = deliveryMatches[0]
    }

    return availability
  }

  /**
   * Extract pricing information
   */
  private static async extractPricing(html: string, retailer: string): Promise<RealProductData['pricing'] | undefined> {
    const pricing: RealProductData['pricing'] = {
      current: 0
    }

    // Look for price patterns
    const pricePatterns = [
      /\$[\d,]+\.?\d{0,2}/g,
      /\$[\d,]+\.?\d{0,2}/g,
      /\$\d+(?:\.\d{2})?/g,
      /[\d,]+\.?\d{2}\s*\$/g
    ]

    for (const pattern of pricePatterns) {
      const matches = html.match(pattern)
      if (matches && matches.length > 0) {
        // Find the first reasonable price (not too small)
        for (const match of matches) {
          const numPrice = parseFloat(match.replace(/[^\d.]/g, ''))
          if (numPrice > 1 && numPrice < 10000) { // Reasonable product price range
            pricing.current = numPrice
            break
          }
        }
        if (pricing.current > 0) break
      }
    }

    return pricing.current > 0 ? pricing : undefined
  }

  /**
   * Extract merchant/trust information
   */
  private static async extractMerchantInfo(html: string, retailer: string, url: string): Promise<RealProductData['merchant']> {
    const merchant: RealProductData['merchant'] = {
      name: retailer.charAt(0).toUpperCase() + retailer.slice(1)
    }

    // Extract return policy if available
    const returnMatches = html.match(/(?:return policy?|returns?|30(?:-| )day return)/gi)
    if (returnMatches) {
      merchant.returnPolicy = returnMatches.join(', ')
    }

    // Extract warranty if available
    const warrantyMatches = html.match(/(?:warranty|limited warranty|manufacturer warranty)[^.,!\n]{0,100}/gi)
    if (warrantyMatches) {
      merchant.warranty = warrantyMatches[0].trim()
    }

    return merchant
  }

  // Amazon-specific review extraction
  private static extractAmazonReviews(html: string): RealProductData['reviews'] | undefined {
    const reviews: RealProductData['reviews'] = {
      overallRating: 0,
      totalReviewCount: 0,
      averageRating: 0,
      topReviews: [],
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      recentReviews: []
    }

    // Extract overall rating
    const ratingMatch = html.match(/([\d.]+)\s*out\s+of\s+5\s+stars?/i)
    if (ratingMatch) {
      reviews.overallRating = parseFloat(ratingMatch[1])
      reviews.averageRating = reviews.overallRating
    }

    // Extract review count
    const countMatches = [
      html.match(/([\d,]+)\s*ratings?/), // Primary pattern
      html.match(/([\d,]+)\s*customer\s+reviews/), // Alternative pattern
      html.match(/(\d{1,4})\s*out\s+of\s+5\s+stars/) // Rating count
    ]

    for (const match of countMatches) {
      if (match) {
        const count = parseInt(match[1].replace(/,/g, ''))
        if (count > 0) {
          reviews.totalReviewCount = Math.max(reviews.totalReviewCount, count)
        }
      }
    }

    return reviews.overallRating > 0 || reviews.totalReviewCount > 0 ? reviews : undefined
  }

  // Generic review extraction for other sites
  private static extractGenericReviews(html: string): RealProductData['reviews'] | undefined {
    const reviews: RealProductData['reviews'] = {
      overallRating: 0,
      totalReviewCount: 0,
      averageRating: 0,
      topReviews: [],
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      recentReviews: []
    }

    // Look for rating patterns (X/X, X.X stars, etc.)
    const ratingPatterns = [
      /([\d.]+)\s*(?:stars?|out of 5|rating)/gi,
      /(\d{1,2})\.?\d{0,2}\s*\/\s*\d{1,2}/g, // X.X/X format
      /\b\d\.\d\s*stars?/gi, // X.X stars
      /\b\d\s*stars?\s*-\s*([\d,]+)/gi // X stars - count
    ]

    for (const pattern of ratingPatterns) {
      const matches = html.match(pattern)
      if (matches) {
        for (const match of matches) {
          const numMatch = match.match(/[\d.]+/)
          if (numMatch) {
            const rating = parseFloat(numMatch[0])
            if (rating > 0 && rating <= 5) {
              reviews.overallRating = Math.max(reviews.overallRating, rating)
            }
          }

          // Try to extract count from patterns like "3.8 stars - 124 reviews"
          const countMatch = match.match(/[\d,]{1,10}/g)
          if (countMatch) {
            const count = parseInt(countMatch[0].replace(/,/g, ''))
            if (count > 0 && count < 100000) {
              reviews.totalReviewCount = Math.max(reviews.totalReviewCount, count)
            }
          }
        }
      }
    }

    if (reviews.overallRating > 0) {
      reviews.averageRating = reviews.overallRating
    }

    return reviews.overallRating > 0 || reviews.totalReviewCount > 0 ? reviews : undefined
  }

  // Amazon-specific spec extraction
  private static extractAmazonSpecs(html: string): RealProductData['specifications'] | undefined {
    const specs: RealProductData['specifications'] = {}

    // Look for common Amazon spec items
    const specPatterns = {
      dimensions: /(?:product\s+)?dimensions?\s*:\s*([^<\n]{10,100})/gi,
      weight: /(?:shipping\s+)?weight\s*:\s*([^<\n]{5,50})/gi,
      warranty: /warranty\s*(?:information)?\s*:\s*([^<\n]{10,100})/gi,
      manufacturer: /manufacturer\s*:\s*([^<\n]{3,50})/gi,
      model: /(?:model\s+number|model\s+no|item\s+model)\s*:\s*([^<\n]{3,30})/gi
    }

    let foundSpecs = false
    for (const [key, pattern] of Object.entries(specPatterns)) {
      const match = html.match(pattern)
      if (match) {
        const value = match[1].trim()
        if (value && value.length > 0) {
          (specs as any)[key] = value
          foundSpecs = true
        }
      }
    }

    return foundSpecs ? specs : undefined
  }

  // Generic spec extraction
  private static extractGenericSpecs(html: string): RealProductData['specifications'] | undefined {
    const specs: RealProductData['specifications'] = {}

    // Universal spec extraction patterns
    const specPatterns = [
      // Dimensions/weight patterns
      /(?:dimensions?|size)s?\s*[:\-]\s*([^<\n.,]{5,50})/gi,
      /(?:weight|\bwt\.?)\s*[:\-]\s*([^<\n.,]{3,30})/gi,

      // Material patterns
      /(?:materials?|fabric|composition)\s*[:\-]\s*([^<\n.,]{5,100})/gi,

      // Warranty/manufacturer
      /warranty\s*[:\-]\s*([^<\n.,]{5,50})/gi,
      /manufacturing\s*[:\-]\s*([^<\n.,]{3,50})/gi,
    ]

    let foundSpecs = false
    for (const pattern of specPatterns) {
      const matches = html.match(pattern)
      if (matches) {
        for (const match of matches) {
          const parts = match.split(/[:\-]/)
          if (parts.length >= 2) {
            const value = parts.slice(1).join(':').trim()
            if (value && value.length > 2) {
              // Try to infer spec type from context
              if (match.toLowerCase().includes('dimension')) specs.dimensions = value
              else if (match.toLowerCase().includes('weight') || match.toLowerCase().includes(' wt') || match.toLowerCase().includes(' lb')) specs.weight = value
              else if (match.toLowerCase().includes('material') || match.toLowerCase().includes('fabric')) specs.materials = value.split(',').map(m => m.trim()).filter(m => m)
              else if (match.toLowerCase().includes('warranty')) specs.warranty = value
              else if (match.toLowerCase().includes('manufactur')) specs.manufacturer = value

              foundSpecs = true
            }
          }
        }
      }
    }

    return foundSpecs ? specs : undefined
  }

  /**
   * Main entry point - enhance a product with real-time data
   */
  static async enhanceProductWithRealData(product: Product): Promise<Product> {
    try {
      if (!product.link) return product

      console.log(`[RealProductData] Enhancing product with real data: ${product.title}`)

      const realData = await this.extractRealProductData(product.link)
      if (!realData) return product

      // Merge real data with existing product data
      const enhancedProduct: Product = {
        ...product,

        // Update price if real data is available
        price: realData.pricing?.current || product.price,

        // Add reviews
        reviews: realData.reviews ? {
          rating: realData.reviews.averageRating,
          count: realData.reviews.totalReviewCount,
          topReviews: realData.reviews.topReviews?.map(review => ({
            author: review.author,
            date: review.date,
            rating: review.rating,
            content: review.content,
            verified: review.verified
          }))
        } : undefined,

        // Add specifications
        specifications: realData.specifications ? {
          dimensions: realData.specifications.dimensions,
          weight: realData.specifications.weight,
          materials: realData.specifications.materials,
          features: realData.specifications.features,
          warranty: realData.specifications.warranty,
          manufacturer: realData.specifications.manufacturer,
          model: realData.specifications.model,
          color: realData.specifications.color,
          size: realData.specifications.size
        } : undefined,

        // Add availability
        availability: realData.availability ? {
          inStock: realData.availability.inStock,
          shipping: realData.availability.shipping,
          delivery: realData.availability.delivery,
          stores: realData.availability.stores
        } : undefined,

        // Add real-time metadata
        realTimeData: {
          lastUpdated: new Date().toISOString(),
          sourceUrl: product.link,
          confidence: 0.9,
          extractedAt: new Date().toISOString()
        }
      }

      console.log(`[RealProductData] Enhanced product with:`, {
        reviews: !!enhancedProduct.reviews,
        specs: !!enhancedProduct.specifications,
        availability: !!enhancedProduct.availability
      })

      return enhancedProduct

    } catch (error) {
      console.error('[RealProductData] Error enhancing product:', error)
      return product
    }
  }
}
