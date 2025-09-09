import type { Product } from "@/lib/types"

export interface ImageSearchResult {
  products: Product[]
  searchMethod: 'google-vision' | 'bing-visual' | 'reverse-image' | 'embedding-similarity' | 'text-fallback'
  detectedObjects: string[]
  confidence: number
  timestamp: string
  debugInfo?: any
}

/**
 * Multi-provider visual search service with comprehensive fallback strategies
 */
export class ComprehensiveVisualSearchService {

  /**
   * Main entry point - tries multiple visual search providers
   */
  static async searchByImage(
    imageUrl: string,
    budget?: { min: number, max: number },
    userPreferences?: any
  ): Promise<ImageSearchResult> {
    
    console.log(`[ComprehensiveVisualSearch] Starting multi-provider visual search for: ${imageUrl}`)
    
    // Strategy 1: Google Vision API (most accurate)
    if (process.env.GOOGLE_VISION_API_KEY) {
      try {
        const googleResult = await this.searchWithGoogleVision(imageUrl, budget)
        if (googleResult.products.length > 0) {
          console.log(`[ComprehensiveVisualSearch] Google Vision successful: ${googleResult.products.length} products`)
          return googleResult
        }
      } catch (error) {
        console.error('[ComprehensiveVisualSearch] Google Vision failed:', error)
      }
    }
    
    // Strategy 2: Bing Visual Search API
    if (process.env.BING_SEARCH_API_KEY) {
      try {
        const bingResult = await this.searchWithBingVisual(imageUrl, budget)
        if (bingResult.products.length > 0) {
          console.log(`[ComprehensiveVisualSearch] Bing Visual successful: ${bingResult.products.length} products`)
          return bingResult
        }
      } catch (error) {
        console.error('[ComprehensiveVisualSearch] Bing Visual failed:', error)
      }
    }
    
    // Strategy 3: Reverse image search using SerpApi
    if (process.env.SERPAPI_API_KEY) {
      try {
        const serpResult = await this.searchWithSerpApi(imageUrl, budget)
        if (serpResult.products.length > 0) {
          console.log(`[ComprehensiveVisualSearch] SerpApi reverse search successful: ${serpResult.products.length} products`)
          return serpResult
        }
      } catch (error) {
        console.error('[ComprehensiveVisualSearch] SerpApi reverse search failed:', error)
      }
    }
    
    // Strategy 4: TinEye reverse image search (free tier available)
    try {
      const tineyeResult = await this.searchWithTinEye(imageUrl, budget)
      if (tineyeResult.products.length > 0) {
        console.log(`[ComprehensiveVisualSearch] TinEye successful: ${tineyeResult.products.length} products`)
        return tineyeResult
      }
    } catch (error) {
      console.error('[ComprehensiveVisualSearch] TinEye failed:', error)
    }
    
    // Final fallback: Enhanced text analysis
    console.log('[ComprehensiveVisualSearch] All visual methods failed, using text fallback')
    return this.textBasedFallback(imageUrl, budget)
  }
  
  /**
   * Google Vision API implementation
   */
  private static async searchWithGoogleVision(
    imageUrl: string,
    budget?: { min: number, max: number }
  ): Promise<ImageSearchResult> {
    
    const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY!
    
    try {
      // Fetch the image and convert to base64
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`)
      }
      
      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      
      // Google Vision API request
      const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`
      
      const requestBody = {
        requests: [{
          image: {
            content: base64Image
          },
          features: [
            { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
            { type: 'LABEL_DETECTION', maxResults: 20 },
            { type: 'WEB_DETECTION' }
          ]
        }]
      }
      
      const response = await fetch(visionApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status}`)
      }
      
      const data = await response.json()
      const annotations = data.responses[0]
      
      // Extract detected objects
      const detectedObjects: string[] = []
      
      // Process object localization
      if (annotations.localizedObjectAnnotations) {
        annotations.localizedObjectAnnotations.forEach((obj: any) => {
          detectedObjects.push(obj.name)
        })
      }
      
      // Process labels
      if (annotations.labelAnnotations) {
        annotations.labelAnnotations.slice(0, 5).forEach((label: any) => {
          if (label.score > 0.7) {
            detectedObjects.push(label.description)
          }
        })
      }
      
      // Process web entities for product identification
      if (annotations.webDetection?.webEntities) {
        annotations.webDetection.webEntities
          .filter((entity: any) => entity.score > 0.6)
          .slice(0, 3)
          .forEach((entity: any) => {
            if (entity.description) {
              detectedObjects.push(entity.description)
            }
          })
      }
      
      // Search for products using detected objects
      const products = await this.searchProductsByObjects(detectedObjects, budget)
      
      const confidence = detectedObjects.length > 0 ? Math.min(90, 60 + detectedObjects.length * 10) : 0
      
      return {
        products,
        searchMethod: 'google-vision',
        detectedObjects: [...new Set(detectedObjects)].slice(0, 5),
        confidence,
        timestamp: new Date().toISOString(),
        debugInfo: { 
          totalObjectsFound: detectedObjects.length,
          googleVisionResponse: annotations
        }
      }
      
    } catch (error) {
      console.error('[ComprehensiveVisualSearch] Google Vision API error:', error)
      throw error
    }
  }
  
  /**
   * Bing Visual Search API implementation
   */
  private static async searchWithBingVisual(
    imageUrl: string,
    budget?: { min: number, max: number }
  ): Promise<ImageSearchResult> {
    
    const BING_API_KEY = process.env.BING_SEARCH_API_KEY!
    
    try {
      // Bing Visual Search API endpoint
      const endpoint = 'https://api.bing.microsoft.com/v7.0/images/visualsearch'
      
      // Create form data with image URL
      const formData = new FormData()
      formData.append('knowledgeRequest', JSON.stringify({
        imageInfo: {
          url: imageUrl
        }
      }))
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': BING_API_KEY,
        },
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Bing API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Process Bing response to extract product information
      const detectedObjects = this.extractBingObjects(data)
      const products = await this.searchProductsByObjects(detectedObjects, budget)
      
      return {
        products,
        searchMethod: 'bing-visual',
        detectedObjects,
        confidence: detectedObjects.length > 0 ? 75 : 0,
        timestamp: new Date().toISOString(),
        debugInfo: { bingResponse: data }
      }
      
    } catch (error) {
      console.error('[ComprehensiveVisualSearch] Bing Visual API error:', error)
      throw error
    }
  }
  
  /**
   * SerpApi reverse image search
   */
  private static async searchWithSerpApi(
    imageUrl: string,
    budget?: { min: number, max: number }
  ): Promise<ImageSearchResult> {
    
    const SERP_API_KEY = process.env.SERPAPI_API_KEY!
    
    try {
      const searchParams = new URLSearchParams({
        engine: 'google_reverse_image',
        image_url: imageUrl,
        api_key: SERP_API_KEY,
        no_cache: 'true'
      })
      
      const response = await fetch(`https://serpapi.com/search?${searchParams}`)
      
      if (!response.ok) {
        throw new Error(`SerpApi error: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Extract product information from reverse image results
      const detectedObjects = this.extractSerpApiObjects(data)
      const products = await this.searchProductsByObjects(detectedObjects, budget)
      
      return {
        products,
        searchMethod: 'reverse-image',
        detectedObjects,
        confidence: detectedObjects.length > 0 ? 70 : 0,
        timestamp: new Date().toISOString(),
        debugInfo: { serpApiResponse: data }
      }
      
    } catch (error) {
      console.error('[ComprehensiveVisualSearch] SerpApi error:', error)
      throw error
    }
  }
  
  /**
   * TinEye reverse image search (limited free tier)
   */
  private static async searchWithTinEye(
    imageUrl: string,
    budget?: { min: number, max: number }
  ): Promise<ImageSearchResult> {
    
    // Note: TinEye API requires paid subscription for full access
    // This is a placeholder for the implementation
    
    console.log('[ComprehensiveVisualSearch] TinEye search not fully implemented (requires paid API)')
    
    return {
      products: [],
      searchMethod: 'reverse-image',
      detectedObjects: [],
      confidence: 0,
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * Enhanced text-based fallback using multiple AI models
   */
  private static async textBasedFallback(
    imageUrl: string,
    budget?: { min: number, max: number }
  ): Promise<ImageSearchResult> {
    
    try {
      console.log('[ComprehensiveVisualSearch] Using enhanced text analysis fallback')
      
      // Use multiple AI models for better object recognition
      const detectedObject = await this.analyzeImageWithMultipleModels(imageUrl)
      
      if (detectedObject) {
        const { searchForProducts } = await import("@/lib/products-service")
        const products = await searchForProducts(detectedObject, 8, undefined, true)
        
        return {
          products,
          searchMethod: 'text-fallback',
          detectedObjects: [detectedObject],
          confidence: 40, // Lower confidence for text-based approach
          timestamp: new Date().toISOString(),
          debugInfo: { textAnalysisResult: detectedObject }
        }
      }
    } catch (error) {
      console.error('[ComprehensiveVisualSearch] Text fallback failed:', error)
    }
    
    // Ultimate fallback
    return {
      products: [],
      searchMethod: 'text-fallback',
      detectedObjects: [],
      confidence: 0,
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * Helper methods
   */
  private static extractBingObjects(bingResponse: any): string[] {
    const objects: string[] = []
    
    // Extract from Bing's visual search tags
    if (bingResponse.tags) {
      bingResponse.tags.forEach((tag: any) => {
        if (tag.displayName && tag.displayName !== 'CaptionModule') {
          objects.push(tag.displayName)
        }
        
        // Extract from actions
        if (tag.actions) {
          tag.actions.forEach((action: any) => {
            if (action.actionType === 'VisualSearch' && action.data?.value) {
              action.data.value.forEach((item: any) => {
                if (item.name) {
                  objects.push(item.name)
                }
              })
            }
          })
        }
      })
    }
    
    return [...new Set(objects)].slice(0, 5) // Deduplicate and limit
  }
  
  private static extractSerpApiObjects(serpResponse: any): string[] {
    const objects: string[] = []
    
    // Extract from reverse image search results
    if (serpResponse.image_results) {
      serpResponse.image_results.forEach((result: any) => {
        if (result.title) {
          // Extract product names from titles
          const cleanTitle = result.title.replace(/[^\w\s]/g, ' ').trim()
          objects.push(cleanTitle)
        }
      })
    }
    
    // Extract from inline images
    if (serpResponse.inline_images) {
      serpResponse.inline_images.slice(0, 3).forEach((image: any) => {
        if (image.title) {
          objects.push(image.title)
        }
      })
    }
    
    return [...new Set(objects)].slice(0, 5) // Deduplicate and limit
  }
  
  private static async searchProductsByObjects(
    objects: string[],
    budget?: { min: number, max: number }
  ): Promise<Product[]> {
    
    if (!objects.length) return []
    
    const allProducts: Product[] = []
    
    try {
      const { searchForProducts } = await import("@/lib/products-service")
      
      // Search for each detected object
      for (const object of objects.slice(0, 3)) { // Limit to top 3 objects
        try {
          const products = await searchForProducts(object, 4, undefined, true)
          allProducts.push(...products)
        } catch (error) {
          console.error(`[ComprehensiveVisualSearch] Failed to search for ${object}:`, error)
        }
      }
    } catch (error) {
      console.error('[ComprehensiveVisualSearch] Product search failed:', error)
    }
    
    // Deduplicate and filter by budget
    const uniqueProducts = this.deduplicateProducts(allProducts)
    
    if (budget) {
      return uniqueProducts.filter(p => p.price >= budget.min && p.price <= budget.max)
    }
    
    return uniqueProducts.slice(0, 12) // Return top 12 results
  }
  
  private static async analyzeImageWithMultipleModels(imageUrl: string): Promise<string | null> {
    try {
      // Enhanced Gemini visual analysis with detailed prompts
      const { generateText } = await import("ai")
      const { google } = await import("@ai-sdk/google")
      
      const imageResponse = await fetch(imageUrl)
      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      const dataUrl = `data:image/jpeg;base64,${base64Image}`
      
      const result = await generateText({
        model: google('gemini-1.5-flash'),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Look at this image and identify EXACTLY what product is shown. Be incredibly specific about visual details:

ANALYZE:
1. What is the exact product type?
2. What materials can you see? (leather, metal, fabric, plastic, etc.)
3. What are the main colors?
4. What style is it? (modern, vintage, classic, etc.)
5. Any brand markings or distinctive features?

RESPOND with a detailed search query that captures the visual essence:
Examples:
- "brown leather bomber jacket vintage aviator style"  
- "rose gold luxury dress watch classic round dial"
- "black wireless over-ear headphones modern design"
- "silver adjustable desk lamp modern minimalist"

Focus on what you actually SEE, not what you assume. Be specific about materials, colors, and style.`
              },
              {
                type: "image",
                image: dataUrl
              }
            ]
          }
        ]
      })
      
      return result?.text?.trim() || null
      
    } catch (error) {
      console.error('[ComprehensiveVisualSearch] Enhanced visual analysis failed:', error)
      return null
    }
  }
  
  private static deduplicateProducts(products: Product[]): Product[] {
    const seen = new Set<string>()
    return products.filter(product => {
      const key = `${product.title}-${product.price}-${product.brand}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}

export const comprehensiveVisualSearchService = new ComprehensiveVisualSearchService()
