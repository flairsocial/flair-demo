import type { Product } from "@/lib/types"

export interface VisualSearchResult {
  products: Product[]
  confidence: number
  searchMethod: string
  visualFeatures: {
    colors: string[]
    category: string
    style: string[]
    materials: string[]
    patterns: string[]
  }
  timestamp: string
}

export interface VisualFeatures {
  dominantColors: string[]
  category: string
  style: string[]
  materials: string[]
  patterns: string[]
  shape: string
  texture: string
  occasion: string
}

/**
 * Advanced Visual Search Service for image-based product discovery
 * Combines multiple AI models and visual comparison techniques for accurate "vibe shopping"
 */
export class VisualSearchService {
  
  /**
   * Main visual search method - finds products that visually resemble the input image
   */
  static async findVisuallySimilar(
    imageUrl: string, 
    model: any,
    budget?: { min: number, max: number },
    userStyle?: string[]
  ): Promise<VisualSearchResult> {
    
    console.log(`[VisualSearch] Starting comprehensive visual search for: ${imageUrl}`)
    
    try {
      // Step 1: Extract detailed visual features using enhanced Gemini Vision
      const visualFeatures = await this.extractVisualFeatures(imageUrl, model)
      console.log(`[VisualSearch] Extracted features:`, visualFeatures)
      
      // Step 2: Use multiple search strategies in parallel
      const searchResults = await Promise.all([
        this.visualFeatureSearch(visualFeatures, budget, userStyle),
        this.colorAndStyleSearch(visualFeatures, budget, userStyle),
        this.categorySpecificSearch(visualFeatures, budget, userStyle),
        this.reverseImageSearch(imageUrl, visualFeatures) // Future implementation
      ])
      
      // Step 3: Merge and rank results by visual similarity
      const mergedProducts = this.mergeAndRankResults(searchResults, visualFeatures, userStyle)
      
      // Step 4: Apply confidence scoring
      const confidence = this.calculateConfidence(visualFeatures, mergedProducts)
      
      return {
        products: mergedProducts.slice(0, 12), // Top 12 results
        confidence,
        searchMethod: "multi-modal-visual",
        visualFeatures: {
          colors: visualFeatures.dominantColors,
          category: visualFeatures.category,
          style: visualFeatures.style,
          materials: visualFeatures.materials,
          patterns: visualFeatures.patterns
        },
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`[VisualSearch] Error in visual search:`, error)
      
      // Fallback to enhanced text-based search
      return this.fallbackTextSearch(imageUrl, model, budget, userStyle)
    }
  }
  
  /**
   * Enhanced visual feature extraction using specialized prompts
   */
  private static async extractVisualFeatures(imageUrl: string, model: any): Promise<VisualFeatures> {
    
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) throw new Error(`Image not accessible: ${imageResponse.status}`)
    
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
    const dataUrl = `data:${mimeType};base64,${base64Image}`
    
    const { generateText } = await import("ai")
    
    const result = await generateText({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert fashion AI analyzing this image for visual similarity search. Extract detailed visual features in this EXACT JSON format:

{
  "dominantColors": ["color1", "color2", "color3"],
  "category": "specific category (dress, sneakers, jacket, etc.)",
  "style": ["style1", "style2", "style3"],
  "materials": ["material1", "material2"],
  "patterns": ["pattern1", "pattern2"],
  "shape": "silhouette description",
  "texture": "texture description",
  "occasion": "casual/formal/athletic/business"
}

Focus on:
- EXACT colors you see (navy blue, cream white, black, etc.)
- Specific item category (not just "clothing")
- Style descriptors (minimalist, vintage, oversized, fitted, etc.)
- Visible materials (leather, cotton, denim, knit, etc.)
- Patterns (solid, striped, floral, geometric, etc.)
- Overall shape/silhouette
- Texture appearance
- Appropriate occasion

Be precise and specific. This data will be used to find visually similar products.`
            },
            {
              type: "image",
              image: dataUrl
            }
          ]
        }
      ]
    })
    
    try {
      // Parse the JSON response
      const features = JSON.parse(result.text.trim())
      console.log(`[VisualSearch] Parsed visual features:`, features)
      return features
    } catch (parseError) {
      console.error(`[VisualSearch] Failed to parse visual features, using fallback`)
      
      // Fallback parsing from text response
      return this.parseVisualFeaturesFromText(result.text)
    }
  }
  
  /**
   * Search based on extracted visual features
   */
  private static async visualFeatureSearch(
    features: VisualFeatures, 
    budget?: { min: number, max: number },
    userStyle?: string[]
  ): Promise<Product[]> {
    
    // Build search query from visual features
    const searchTerms = [
      features.category,
      ...features.dominantColors.slice(0, 2), // Top 2 colors
      ...features.style.slice(0, 2), // Top 2 styles
      ...features.materials.slice(0, 1), // Top material
      features.occasion
    ].filter(Boolean).join(' ')
    
    console.log(`[VisualSearch] Feature-based search: "${searchTerms}"`)
    
    // Use existing search infrastructure
    return this.executeSearch(searchTerms, budget, 'visual-features')
  }
  
  /**
   * Color and style focused search
   */
  private static async colorAndStyleSearch(
    features: VisualFeatures,
    budget?: { min: number, max: number },
    userStyle?: string[]
  ): Promise<Product[]> {
    
    const colorQuery = features.dominantColors.slice(0, 2).join(' ')
    const styleQuery = features.style.slice(0, 2).join(' ')
    const searchTerms = `${colorQuery} ${styleQuery} ${features.category}`
    
    console.log(`[VisualSearch] Color/style search: "${searchTerms}"`)
    
    return this.executeSearch(searchTerms, budget, 'color-style')
  }
  
  /**
   * Category-specific detailed search
   */
  private static async categorySpecificSearch(
    features: VisualFeatures,
    budget?: { min: number, max: number },
    userStyle?: string[]
  ): Promise<Product[]> {
    
    // Create category-specific search terms
    const categoryKeywords = this.getCategoryKeywords(features.category)
    const searchTerms = `${features.category} ${categoryKeywords} ${features.dominantColors[0]} ${features.style[0]}`
    
    console.log(`[VisualSearch] Category-specific search: "${searchTerms}"`)
    
    return this.executeSearch(searchTerms, budget, 'category-specific')
  }
  
  /**
   * Reverse image search (placeholder for future Google Vision API integration)
   */
  private static async reverseImageSearch(
    imageUrl: string,
    features: VisualFeatures
  ): Promise<Product[]> {
    
    console.log(`[VisualSearch] Reverse image search not yet implemented`)
    
    // TODO: Implement Google Vision API Product Search
    // This would use Google's Vision API to find visually similar products
    // across indexed product databases
    
    return []
  }
  
  /**
   * Execute search using the products service
   */
  private static async executeSearch(
    query: string,
    budget?: { min: number, max: number },
    method?: string
  ): Promise<Product[]> {
    
    try {
      // Import and use the existing products service
      const { searchForProducts } = await import("@/lib/products-service")
      
      const products = await searchForProducts(query, 8, undefined, true)
      
      // Filter by budget if provided
      if (budget) {
        return products.filter(p => p.price >= budget.min && p.price <= budget.max)
      }
      
      return products
      
    } catch (error) {
      console.error(`[VisualSearch] Search execution failed for ${method}:`, error)
      return []
    }
  }
  
  /**
   * Merge and rank results from multiple search strategies
   */
  private static mergeAndRankResults(
    searchResults: Product[][],
    features: VisualFeatures,
    userStyle?: string[]
  ): Product[] {
    
    // Flatten all results
    const allProducts = searchResults.flat()
    
    // Remove duplicates
    const uniqueProducts = this.deduplicateProducts(allProducts)
    
    // Score each product based on visual similarity
    const scoredProducts = uniqueProducts.map(product => ({
      ...product,
      visualScore: this.calculateVisualSimilarity(product, features, userStyle)
    }))
    
    // Sort by visual similarity score
    return scoredProducts
      .sort((a, b) => b.visualScore - a.visualScore)
      .map(({ visualScore, ...product }) => product) // Remove score from final result
  }
  
  /**
   * Calculate visual similarity score between product and extracted features
   */
  private static calculateVisualSimilarity(
    product: Product,
    features: VisualFeatures,
    userStyle?: string[]
  ): number {
    
    let score = 0
    const productText = `${product.title} ${product.category} ${product.description || ''}`.toLowerCase()
    
    // Category match (highest weight)
    if (productText.includes(features.category.toLowerCase())) {
      score += 30
    }
    
    // Color matches
    features.dominantColors.forEach((color, index) => {
      if (productText.includes(color.toLowerCase())) {
        score += (10 - index * 2) // First color gets higher score
      }
    })
    
    // Style matches
    features.style.forEach((style, index) => {
      if (productText.includes(style.toLowerCase())) {
        score += (8 - index) // First style gets higher score
      }
    })
    
    // Material matches
    features.materials.forEach(material => {
      if (productText.includes(material.toLowerCase())) {
        score += 5
      }
    })
    
    // User style preference bonus
    if (userStyle) {
      userStyle.forEach(style => {
        if (productText.includes(style.toLowerCase())) {
          score += 3
        }
      })
    }
    
    // Occasion match
    if (productText.includes(features.occasion.toLowerCase())) {
      score += 4
    }
    
    return score
  }
  
  /**
   * Calculate confidence score for the overall search
   */
  private static calculateConfidence(features: VisualFeatures, products: Product[]): number {
    
    if (products.length === 0) return 0
    
    // Base confidence on feature completeness
    let confidence = 0
    
    if (features.category) confidence += 20
    if (features.dominantColors.length > 0) confidence += 20
    if (features.style.length > 0) confidence += 20
    if (features.materials.length > 0) confidence += 15
    if (features.patterns.length > 0) confidence += 10
    if (features.occasion) confidence += 15
    
    // Reduce confidence if few results found
    if (products.length < 3) confidence *= 0.7
    if (products.length < 6) confidence *= 0.85
    
    return Math.min(confidence, 100)
  }
  
  /**
   * Fallback text search when visual analysis fails
   */
  private static async fallbackTextSearch(
    imageUrl: string,
    model: any,
    budget?: { min: number, max: number },
    userStyle?: string[]
  ): Promise<VisualSearchResult> {
    
    console.log(`[VisualSearch] Using fallback text search`)
    
    try {
      // Simple image analysis for fallback
      const { generateText } = await import("ai")
      const imageResponse = await fetch(imageUrl)
      const imageBuffer = await imageResponse.arrayBuffer()
      const base64Image = Buffer.from(imageBuffer).toString('base64')
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'
      const dataUrl = `data:${mimeType};base64,${base64Image}`
      
      const result = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Describe this fashion item in 3-5 keywords for product search. Focus on: item type, main colors, style. Format: 'category color style material'"
              },
              {
                type: "image",
                image: dataUrl
              }
            ]
          }
        ]
      })
      
      const searchQuery = result.text.trim()
      const products = await this.executeSearch(searchQuery, budget, 'fallback')
      
      return {
        products: products.slice(0, 8),
        confidence: 60, // Lower confidence for fallback
        searchMethod: "fallback-text",
        visualFeatures: {
          colors: [],
          category: "fashion",
          style: [],
          materials: [],
          patterns: []
        },
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`[VisualSearch] Fallback search failed:`, error)
      
      return {
        products: [],
        confidence: 0,
        searchMethod: "failed",
        visualFeatures: {
          colors: [],
          category: "fashion",
          style: [],
          materials: [],
          patterns: []
        },
        timestamp: new Date().toISOString()
      }
    }
  }
  
  /**
   * Helper methods
   */
  private static parseVisualFeaturesFromText(text: string): VisualFeatures {
    // Fallback parsing if JSON parsing fails
    return {
      dominantColors: this.extractColorsFromText(text),
      category: this.extractCategoryFromText(text),
      style: this.extractStyleFromText(text),
      materials: this.extractMaterialsFromText(text),
      patterns: ["solid"],
      shape: "fitted",
      texture: "smooth",
      occasion: "casual"
    }
  }
  
  private static extractColorsFromText(text: string): string[] {
    const colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'brown', 'gray', 'navy', 'cream']
    return colors.filter(color => text.toLowerCase().includes(color))
  }
  
  private static extractCategoryFromText(text: string): string {
    const categories = ['dress', 'shirt', 'pants', 'shoes', 'jacket', 'skirt', 'top', 'sweater']
    return categories.find(cat => text.toLowerCase().includes(cat)) || 'clothing'
  }
  
  private static extractStyleFromText(text: string): string[] {
    const styles = ['casual', 'formal', 'vintage', 'modern', 'classic', 'trendy', 'minimalist']
    return styles.filter(style => text.toLowerCase().includes(style))
  }
  
  private static extractMaterialsFromText(text: string): string[] {
    const materials = ['cotton', 'leather', 'denim', 'silk', 'wool', 'polyester']
    return materials.filter(material => text.toLowerCase().includes(material))
  }
  
  private static getCategoryKeywords(category: string): string {
    const keywords: Record<string, string> = {
      'dress': 'midi maxi mini cocktail evening',
      'shoes': 'sneakers boots heels flats sandals',
      'shirt': 'button-up blouse casual formal',
      'jacket': 'blazer bomber leather denim',
      'pants': 'jeans chinos trousers casual',
      'sweater': 'pullover cardigan knit wool',
      'skirt': 'midi mini maxi pleated',
      'top': 'tank camisole crop fitted'
    }
    return keywords[category.toLowerCase()] || 'stylish fashionable'
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

export const visualSearchService = new VisualSearchService()
