import type { Product } from "@/lib/types"

export interface VisualFeatures {
  objects: Array<{
    name: string
    confidence: number
    boundingBox?: {
      x: number
      y: number
      width: number
      height: number
    }
  }>
  colors: Array<{
    color: string
    percentage: number
    hex: string
  }>
  labels: Array<{
    description: string
    confidence: number
  }>
  textAnnotations?: string[]
  logoAnnotations?: Array<{
    description: string
    confidence: number
  }>
  webEntities?: Array<{
    entityId: string
    description: string
    confidence: number
  }>
  similarImages?: string[]
  categoryHints?: string[]
}

export interface VisualSearchResult {
  products: Product[]
  visualFeatures: VisualFeatures
  searchMethod: 'google-vision' | 'reverse-image' | 'embedding-similarity' | 'fallback'
  confidence: number
  matchingCriteria: {
    objectMatch: number
    colorMatch: number
    categoryMatch: number
    overallSimilarity: number
  }
  timestamp: string
}

/**
 * Advanced Visual Search Service using Google Vision API and actual visual comparison
 */
export class RealVisualSearchService {
  
  /**
   * Main visual search using Google Vision API for actual visual understanding
   */
  static async searchBySimilarVisuals(
    imageUrl: string,
    budget?: { min: number, max: number },
    userPreferences?: any
  ): Promise<VisualSearchResult> {
    
    console.log(`[RealVisualSearch] Starting Google Vision-based visual search for: ${imageUrl}`)
    
    try {
      // Step 1: Extract real visual features using Google Vision API
      const visualFeatures = await this.extractVisualFeaturesWithGoogleVision(imageUrl)
      console.log(`[RealVisualSearch] Extracted visual features:`, visualFeatures)
      
      // Step 2: Search for products using extracted visual features
      const products = await this.findProductsByVisualFeatures(visualFeatures, budget)
      
      // Step 3: Calculate matching criteria
      const matchingCriteria = this.calculateMatchingScore(visualFeatures, products)
      
      return {
        products,
        visualFeatures,
        searchMethod: 'google-vision',
        confidence: matchingCriteria.overallSimilarity,
        matchingCriteria,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`[RealVisualSearch] Google Vision search failed:`, error)
      
      // Fallback to reverse image search
      return this.fallbackToReverseImageSearch(imageUrl, budget, userPreferences)
    }
  }
  
  /**
   * Use Google Vision API to extract actual visual features
   */
  private static async extractVisualFeaturesWithGoogleVision(imageUrl: string): Promise<VisualFeatures> {
    const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY
    
    if (!GOOGLE_VISION_API_KEY) {
      throw new Error('Google Vision API key not configured')
    }
    
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
            { type: 'TEXT_DETECTION' },
            { type: 'LOGO_DETECTION' },
            { type: 'WEB_DETECTION' },
            { type: 'IMAGE_PROPERTIES' }
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
      
      // Process the response into our VisualFeatures format
      return this.processGoogleVisionResponse(annotations)
      
    } catch (error) {
      console.error('[RealVisualSearch] Google Vision API call failed:', error)
      throw error
    }
  }
  
  /**
   * Process Google Vision API response into structured visual features
   */
  private static processGoogleVisionResponse(annotations: any): VisualFeatures {
    const visualFeatures: VisualFeatures = {
      objects: [],
      colors: [],
      labels: [],
      textAnnotations: [],
      logoAnnotations: [],
      webEntities: [],
      categoryHints: []
    }
    
    // Process object localization
    if (annotations.localizedObjectAnnotations) {
      visualFeatures.objects = annotations.localizedObjectAnnotations.map((obj: any) => ({
        name: obj.name,
        confidence: obj.score,
        boundingBox: obj.boundingPoly ? {
          x: obj.boundingPoly.normalizedVertices[0].x,
          y: obj.boundingPoly.normalizedVertices[0].y,
          width: obj.boundingPoly.normalizedVertices[2].x - obj.boundingPoly.normalizedVertices[0].x,
          height: obj.boundingPoly.normalizedVertices[2].y - obj.boundingPoly.normalizedVertices[0].y
        } : undefined
      }))
    }
    
    // Process labels
    if (annotations.labelAnnotations) {
      visualFeatures.labels = annotations.labelAnnotations.map((label: any) => ({
        description: label.description,
        confidence: label.score
      }))
    }
    
    // Process colors
    if (annotations.imagePropertiesAnnotation?.dominantColors?.colors) {
      visualFeatures.colors = annotations.imagePropertiesAnnotation.dominantColors.colors
        .slice(0, 5) // Top 5 colors
        .map((color: any) => ({
          color: this.rgbToColorName(color.color),
          percentage: color.pixelFraction * 100,
          hex: this.rgbToHex(color.color)
        }))
    }
    
    // Process text
    if (annotations.textAnnotations) {
      visualFeatures.textAnnotations = annotations.textAnnotations
        .slice(1) // Skip the first full text annotation
        .map((text: any) => text.description)
    }
    
    // Process logos
    if (annotations.logoAnnotations) {
      visualFeatures.logoAnnotations = annotations.logoAnnotations.map((logo: any) => ({
        description: logo.description,
        confidence: logo.score
      }))
    }
    
    // Process web entities for product identification
    if (annotations.webDetection?.webEntities) {
      visualFeatures.webEntities = annotations.webDetection.webEntities
        .filter((entity: any) => entity.score > 0.5)
        .map((entity: any) => ({
          entityId: entity.entityId,
          description: entity.description,
          confidence: entity.score
        }))
    }
    
    return visualFeatures
  }
  
  /**
   * Find products based on extracted visual features
   */
  private static async findProductsByVisualFeatures(
    features: VisualFeatures,
    budget?: { min: number, max: number }
  ): Promise<Product[]> {
    
    // Strategy 1: Use object detection results
    const objectBasedProducts = await this.searchByObjects(features.objects, budget)
    
    // Strategy 2: Use web entities (often contains product information)
    const entityBasedProducts = await this.searchByWebEntities(features.webEntities || [], budget)
    
    // Strategy 3: Use labels for category matching
    const labelBasedProducts = await this.searchByLabels(features.labels, budget)
    
    // Combine and deduplicate results
    const allProducts = [...objectBasedProducts, ...entityBasedProducts, ...labelBasedProducts]
    const uniqueProducts = this.deduplicateProducts(allProducts)
    
    // Score products based on visual feature matching
    const scoredProducts = uniqueProducts.map(product => ({
      ...product,
      visualMatchScore: this.calculateProductVisualScore(product, features)
    }))
    
    // Sort by visual match score and return top results
    return scoredProducts
      .sort((a, b) => b.visualMatchScore - a.visualMatchScore)
      .slice(0, 12)
      .map(({ visualMatchScore, ...product }) => product)
  }
  
  /**
   * Search products by detected objects
   */
  private static async searchByObjects(
    objects: VisualFeatures['objects'],
    budget?: { min: number, max: number }
  ): Promise<Product[]> {
    
    if (!objects.length) return []
    
    // Use the most confident object detection
    const primaryObject = objects.sort((a, b) => b.confidence - a.confidence)[0]
    
    console.log(`[RealVisualSearch] Searching by primary object: ${primaryObject.name}`)
    
    try {
      const { searchForProducts } = await import("@/lib/products-service")
      return await searchForProducts(primaryObject.name, 6, undefined, true)
    } catch (error) {
      console.error('[RealVisualSearch] Object-based search failed:', error)
      return []
    }
  }
  
  /**
   * Search products by web entities (often contains product names/brands)
   */
  private static async searchByWebEntities(
    webEntities: VisualFeatures['webEntities'],
    budget?: { min: number, max: number }
  ): Promise<Product[]> {
    
    if (!webEntities || !webEntities.length) return []
    
    const productEntities = webEntities
      .filter(entity => 
        entity.description && 
        entity.confidence > 0.6 &&
        !entity.description.toLowerCase().includes('image') &&
        !entity.description.toLowerCase().includes('photo')
      )
      .slice(0, 3) // Top 3 entities
    
    const results: Product[] = []
    
    for (const entity of productEntities) {
      try {
        console.log(`[RealVisualSearch] Searching by web entity: ${entity.description}`)
        
        const { searchForProducts } = await import("@/lib/products-service")
        const products = await searchForProducts(entity.description, 4, undefined, true)
        results.push(...products)
      } catch (error) {
        console.error(`[RealVisualSearch] Entity search failed for ${entity.description}:`, error)
      }
    }
    
    return results
  }
  
  /**
   * Search products by labels
   */
  private static async searchByLabels(
    labels: VisualFeatures['labels'],
    budget?: { min: number, max: number }
  ): Promise<Product[]> {
    
    if (!labels.length) return []
    
    // Filter for product-relevant labels
    const productLabels = labels
      .filter(label => 
        label.confidence > 0.7 &&
        this.isProductRelevantLabel(label.description)
      )
      .slice(0, 2) // Top 2 labels
    
    const results: Product[] = []
    
    for (const label of productLabels) {
      try {
        console.log(`[RealVisualSearch] Searching by label: ${label.description}`)
        
        const { searchForProducts } = await import("@/lib/products-service")
        const products = await searchForProducts(label.description, 4, undefined, true)
        results.push(...products)
      } catch (error) {
        console.error(`[RealVisualSearch] Label search failed for ${label.description}:`, error)
      }
    }
    
    return results
  }
  
  /**
   * Calculate how well a product matches the visual features
   */
  private static calculateProductVisualScore(product: Product, features: VisualFeatures): number {
    let score = 0
    
    const productText = `${product.title} ${product.category} ${product.description || ''}`.toLowerCase()
    
    // Object matching
    features.objects.forEach(obj => {
      if (productText.includes(obj.name.toLowerCase())) {
        score += obj.confidence * 30 // High weight for object matches
      }
    })
    
    // Web entity matching
    features.webEntities?.forEach(entity => {
      if (entity.description && productText.includes(entity.description.toLowerCase())) {
        score += entity.confidence * 25
      }
    })
    
    // Label matching
    features.labels.forEach(label => {
      if (productText.includes(label.description.toLowerCase())) {
        score += label.confidence * 15
      }
    })
    
    // Brand/logo matching
    features.logoAnnotations?.forEach(logo => {
      if (product.brand && product.brand.toLowerCase().includes(logo.description.toLowerCase())) {
        score += logo.confidence * 40 // Very high weight for brand matches
      }
    })
    
    return score
  }
  
  /**
   * Calculate overall matching criteria
   */
  private static calculateMatchingScore(features: VisualFeatures, products: Product[]) {
    const objectMatch = features.objects.length > 0 ? 
      Math.max(...features.objects.map(obj => obj.confidence)) * 100 : 0
    
    const colorMatch = features.colors.length > 0 ? 
      features.colors[0].percentage : 0
    
    const categoryMatch = features.labels.length > 0 ? 
      Math.max(...features.labels.map(label => label.confidence)) * 100 : 0
    
    const overallSimilarity = products.length > 0 ? 
      (objectMatch + categoryMatch) / 2 : 0
    
    return {
      objectMatch,
      colorMatch,
      categoryMatch,
      overallSimilarity
    }
  }
  
  /**
   * Fallback to reverse image search when Google Vision fails
   */
  private static async fallbackToReverseImageSearch(
    imageUrl: string,
    budget?: { min: number, max: number },
    userPreferences?: any
  ): Promise<VisualSearchResult> {
    
    console.log('[RealVisualSearch] Using fallback reverse image search')
    
    // This could integrate with TinEye, Bing Visual Search, etc.
    // For now, return empty result
    
    return {
      products: [],
      visualFeatures: {
        objects: [],
        colors: [],
        labels: [],
        categoryHints: ['unknown']
      },
      searchMethod: 'fallback',
      confidence: 0,
      matchingCriteria: {
        objectMatch: 0,
        colorMatch: 0,
        categoryMatch: 0,
        overallSimilarity: 0
      },
      timestamp: new Date().toISOString()
    }
  }
  
  /**
   * Helper functions
   */
  private static isProductRelevantLabel(label: string): boolean {
    const irrelevantLabels = [
      'human face', 'person', 'people', 'skin', 'finger', 'hand',
      'image', 'photo', 'picture', 'camera', 'photography',
      'indoor', 'outdoor', 'sky', 'cloud', 'tree', 'building'
    ]
    
    return !irrelevantLabels.some(irrelevant => 
      label.toLowerCase().includes(irrelevant)
    )
  }
  
  private static rgbToHex(rgb: any): string {
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    
    return `#${toHex(rgb.red || 0)}${toHex(rgb.green || 0)}${toHex(rgb.blue || 0)}`
  }
  
  private static rgbToColorName(rgb: any): string {
    // Simple color name mapping - could be enhanced with a proper color library
    const r = Math.round((rgb.red || 0) * 255)
    const g = Math.round((rgb.green || 0) * 255)
    const b = Math.round((rgb.blue || 0) * 255)
    
    if (r > 200 && g > 200 && b > 200) return 'white'
    if (r < 50 && g < 50 && b < 50) return 'black'
    if (r > g && r > b) return 'red'
    if (g > r && g > b) return 'green'
    if (b > r && b > g) return 'blue'
    if (r > 150 && g > 150 && b < 100) return 'yellow'
    if (r > 100 && g < 100 && b > 100) return 'purple'
    if (r > 100 && g > 100 && b > 100) return 'gray'
    
    return 'unknown'
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

export const realVisualSearchService = new RealVisualSearchService()
