import { RealProductDataService } from './real-product-data-service'
import type { Product } from './types'

export class ChatRealTimeService {
  /**
   * Detect if user is asking for real-time data (reviews, specs, availability, etc.)
   * Expanded to include questions about the product itself
   */
  static detectRealTimeDataRequest(message: string): {
    requestsReviews: boolean
    requestsSpecs: boolean
    requestsAvailability: boolean
    requestsPricing: boolean
    requestsValue: boolean
    requestsQuality: boolean
    requestsReputation: boolean
  } {
    const msg = message.toLowerCase()

    return {
      requestsReviews: msg.includes('review') || msg.includes('rating') || msg.includes('star') ||
                     msg.includes('feedback') || msg.includes('comment') || msg.includes('opinion'),
      requestsSpecs: msg.includes('spec') || msg.includes('detail') || msg.includes('feature') ||
                   msg.includes('dimension') || msg.includes('size') || msg.includes('material') ||
                   msg.includes('weight') || msg.includes('warranty'),
      requestsAvailability: msg.includes('available') || msg.includes('stock') || msg.includes('in stock') ||
                          msg.includes('shipping') || msg.includes('delivery') || msg.includes('store'),
      requestsPricing: msg.includes('price') || msg.includes('cost') || msg.includes('expensive') ||
                     msg.includes('cheap') || msg.includes('affordable') || msg.includes('discount') ||
                     msg.includes('sale') || msg.includes('deal'),
      requestsValue: msg.includes('worth') || msg.includes('value') || msg.includes('worth it') ||
                   msg.includes('bang for buck') || msg.includes('good deal') || msg.includes('is this good') ||
                   msg.includes('should i buy') || msg.includes('recommend this'),
      requestsQuality: msg.includes('quality') || msg.includes('good quality') || msg.includes('build quality') ||
                    msg.includes('made well') || msg.includes('durability') || msg.includes('reliable') ||
                    msg.includes('how good') || msg.includes('performance'),
      requestsReputation: msg.includes('reputable') || msg.includes('trustworthy') || msg.includes('scam') ||
                        msg.includes('legit') || msg.includes('fake') || msg.includes('counterfeit') ||
                        msg.includes('seller') || msg.includes('brand reputation') || msg.includes('trust')
    }
  }

  /**
   * Extract all product URLs from a message or attached files
   */
  static extractProductUrls(message: string, attachedFiles: any[] = []): string[] {
    const urls: string[] = []

    // Extract URLs from message text
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const messageUrls = message.match(urlRegex) || []
    urls.push(...messageUrls)

    // Extract URLs from attached files
    attachedFiles.forEach(file => {
      if (file.type === 'url' && file.url) {
        urls.push(file.url)
      } else if (file.type === 'product' && file.metadata?.link) {
        urls.push(file.metadata.link)
      }
    })

    return [...new Set(urls)] // Remove duplicates
  }

  /**
   * Fetch real-time data for products and generate contextual chat response
   */
  static async generateRealTimeResponse(
    message: string,
    attachedFiles: any[] = [],
    attachedProducts: Product[] = []
  ): Promise<{
    realTimeData: any
    contextualMessage: string
  }> {
    try {
      console.log('[ChatRealTime] Analyzing message for real-time data requests:', message)

      const dataRequests = this.detectRealTimeDataRequest(message)
      const hasRealTimeRequests = Object.values(dataRequests).some(Boolean)

      if (!hasRealTimeRequests && attachedProducts.length === 0) {
        console.log('[ChatRealTime] No real-time requests or attached products detected')
        return { realTimeData: null, contextualMessage: '' }
      }

      let realTimeData: any = {}
      let contextualParts: string[] = []

      // Process attached products
      for (const product of attachedProducts) {
        if (product.link) {
          console.log(`[ChatRealTime] Fetching real-time data for: ${product.title}`)
          const productRealTimeData = await RealProductDataService.extractRealProductData(product.link)

          if (productRealTimeData) {
            realTimeData[product.id] = productRealTimeData
            const enrichedProduct = await RealProductDataService.enhanceProductWithRealData(product)

            // Generate contextual text based on what user asked for
            if (dataRequests.requestsValue && (enrichedProduct.reviews || enrichedProduct.availability || product.price)) {
              const valueSignals = []
              if (enrichedProduct.reviews && enrichedProduct.reviews.rating >= 4.0) {
                valueSignals.push(`${enrichedProduct.reviews.rating}/5 star rating from ${enrichedProduct.reviews.count} reviews`)
              }
              if (product.price && product.price > 100) {
                valueSignals.push(`${product.price > 500 ? 'premium' : 'mid-range'} price point`)
              }
              if (enrichedProduct.availability && enrichedProduct.availability.inStock) {
                valueSignals.push('widely available')
              }

              if (valueSignals.length > 0) {
                contextualParts.push(`Value assessment for ${product.title}: ${valueSignals.join(', ')}`)
              }
            }

            if (dataRequests.requestsQuality && (enrichedProduct.reviews || enrichedProduct.specifications)) {
              const qualitySignals = []
              if (enrichedProduct.reviews && enrichedProduct.reviews.rating >= 4.2) {
                qualitySignals.push('highly rated for quality')
              }
              if (enrichedProduct.specifications && enrichedProduct.specifications.warranty) {
                qualitySignals.push(`comes with ${enrichedProduct.specifications.warranty.warranty}`)
              }
              if (enrichedProduct.specifications && enrichedProduct.specifications.materials && enrichedProduct.specifications.materials.length > 0) {
                const qualityMaterials = ['leather', 'stainless steel', 'solid wood', 'premium', 'genuine']
                const foundQualityMaterial = qualityMaterials.find(material =>
                  enrichedProduct.specifications.materials.some(productMaterial =>
                    productMaterial.toLowerCase().includes(material.toLowerCase())
                  )
                )
                if (foundQualityMaterial) {
                  qualitySignals.push(`quality ${foundQualityMaterial} materials`)
                }
              }

              if (qualitySignals.length > 0) {
                contextualParts.push(`Quality indicators for ${product.title}: ${qualitySignals.join(', ')}`)
              }
            }

            if (dataRequests.requestsReputation && product.brand) {
              // Basic reputation assessment based on brand and reviews
              const reputationSignals = []
              if (enrichedProduct.reviews && enrichedProduct.reviews.rating >= 4.0) {
                reputationSignals.push(`${product.brand} has strong customer satisfaction`)
              }
              if (enrichedProduct.reviews && enrichedProduct.reviews.count > 500) {
                reputationSignals.push('large customer base with extensive feedback')
              }

              if (reputationSignals.length > 0) {
                contextualParts.push(`Brand reputation for ${product.brand}: ${reputationSignals.join(', ')}`)
              }
            }

            if (dataRequests.requestsReviews && enrichedProduct.reviews) {
              const reviewData = enrichedProduct.reviews
              contextualParts.push(`Real-time reviews for ${product.title}: ${reviewData.rating}/5 stars from ${reviewData.count} reviews`)

              if (reviewData.topReviews && reviewData.topReviews.length > 0) {
                const topReview = reviewData.topReviews[0]
                contextualParts.push(`Top review: "${topReview.content}" - ${topReview.author}`)
              }
            }

            if (dataRequests.requestsSpecs && enrichedProduct.specifications) {
              const specs = enrichedProduct.specifications
              const specsText = []
              if (specs.dimensions) specsText.push(`Dimensions: ${specs.dimensions}`)
              if (specs.weight) specsText.push(`Weight: ${specs.weight}`)
              if (specs.materials && specs.materials.length > 0) specsText.push(`Materials: ${specs.materials.join(', ')}`)
              if (specs.warranty) specsText.push(`Warranty: ${specs.warranty}`)

              if (specsText.length > 0) {
                contextualParts.push(`Product specs: ${specsText.join(' | ')}`)
              }
            }

            if (dataRequests.requestsAvailability && enrichedProduct.availability) {
              const avail = enrichedProduct.availability
              const availText = []
              availText.push(avail.inStock ? 'In stock' : 'Out of stock')
              if (avail.shipping) availText.push(`Shipping: ${avail.shipping}`)
              if (avail.delivery) availText.push(`Delivery: ${avail.delivery}`)

              contextualParts.push(`Availability: ${availText.join(' | ')}`)
            }
          } else {
            console.warn(`[ChatRealTime] Failed to fetch real-time data for: ${product.title}`)
          }
        }
      }

      // Process URLs from attached files or message
      const urls = this.extractProductUrls(message, attachedFiles)
      for (const url of urls) {
        console.log(`[ChatRealTime] Processing URL: ${url}`)

        try {
          // Build the full URL for the analyze-url endpoint
          // This ensures it works in any environment (dev/staging/production)
          let baseUrl = 'http://localhost:3000' // Default for development

          if (process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`
          } else if (process.env.NODE_ENV === 'production') {
            baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://flair.social' // Replace with你的 actual domain
          }

          const fullUrl = `${baseUrl}/api/analyze-url`
          console.log(`[ChatRealTime] Using analyze URL: ${fullUrl}`)

          // Use the analyze-url endpoint to get product data
          const analyzeResponse = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, includeRealTimeData: true })
          })

          if (analyzeResponse.ok) {
            const urlProduct = await analyzeResponse.json()
            console.log(`[ChatRealTime] URL analyzed successfully: ${urlProduct.title || 'Unknown product'}`)

            // Now fetch real-time data for this URL
            const urlRealTimeData = await RealProductDataService.extractRealProductData(url)
            const urlId = `url-${Date.now()}-${Math.random().toString(36).substring(7)}`

            if (urlRealTimeData) {
              realTimeData[urlId] = urlRealTimeData
              const enrichedUrlProduct = await RealProductDataService.enhanceProductWithRealData(urlProduct)

              // Generate contextual text similar to attached products
              contextualParts.push(`Product found at ${url}: ${urlProduct.title} by ${urlProduct.brand} ($${urlProduct.price})`)

              if (dataRequests.requestsReviews && enrichedUrlProduct.reviews) {
                const reviewData = enrichedUrlProduct.reviews
                contextualParts.push(`Real-time reviews: ${reviewData.rating}/5 stars (${reviewData.count} reviews)`)
              }

              if (dataRequests.requestsSpecs && enrichedUrlProduct.specifications) {
                contextualParts.push(`${urlProduct.title} specifications: Available in real-time`)
              }

              if (dataRequests.requestsAvailability && enrichedUrlProduct.availability) {
                const avail = enrichedUrlProduct.availability
                contextualParts.push(`${urlProduct.title} is ${avail.inStock ? 'in stock' : 'out of stock'}`)
              }
            }
          } else {
            console.warn(`[ChatRealTime] URL analysis failed: ${analyzeResponse.status}`)
          }
        } catch (error) {
          console.error(`[ChatRealTime] Error processing URL ${url}:`, error)
        }
      }

      const contextualMessage = contextualParts.length > 0 ?
        `Based on real-time data I've just fetched: ${contextualParts.join('. ')}.` : ''

      console.log(`[ChatRealTime] Generated contextual message: ${contextualMessage?.substring(0, 100)}...`)

      return {
        realTimeData,
        contextualMessage
      }

    } catch (error) {
      console.error('[ChatRealTime] Error generating real-time response:', error)
      return { realTimeData: null, contextualMessage: '' }
    }
  }

  /**
   * Enhance chat response with real-time data context
   */
  static enhanceChatPromptWithRealTime(
    originalPrompt: string,
    realTimeContext: string,
    dataRequests: any
  ): string {
    if (!realTimeContext) return originalPrompt

    const realTimeInstructions = `
REAL-TIME DATA AVAILABLE: ${realTimeContext}

INSTRUCTIONS:
- Use the real-time data I've provided above to answer user questions
- Reference specific reviews, specs, availability when relevant
- If user asks about reviews but I don't have that data, say so clearly
- If user asks about availability but data shows out of stock, mention it
- Always use the most current data available
- Be specific with numbers and details from the real-time data`

    return originalPrompt + realTimeInstructions
  }

  /**
   * Check if a product needs real-time data refresh
   */
  static needsDataRefresh(product: Product, maxAgeMinutes: number = 60): boolean {
    if (!product.realTimeData?.lastUpdated) return true

    const lastUpdate = new Date(product.realTimeData.lastUpdated)
    const now = new Date()
    const ageMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)

    return ageMinutes > maxAgeMinutes
  }
}
