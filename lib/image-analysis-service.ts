import type { Product } from "@/lib/types"
import { ComprehensiveVisualSearchService, type ImageSearchResult } from "@/lib/comprehensive-visual-search-service"

// Real visual search service using multiple providers for actual visual understanding  
export class ImageAnalysisService {
  
  // NEW: Comprehensive visual search using multiple providers (Google Vision, Bing, etc.)
  static async findVisuallySimilarProducts(
    imageUrl: string, 
    model: any,
    budget?: { min: number, max: number },
    userStyle?: string[]
  ): Promise<any> { // Using any for backward compatibility
    try {
      console.log(`[ImageAnalysis] Starting COMPREHENSIVE visual search for: ${imageUrl}`)
      
      // Use comprehensive visual search with multiple providers
      const searchResult = await ComprehensiveVisualSearchService.searchByImage(
        imageUrl, 
        budget, 
        { style: userStyle }
      )
      
      console.log(`[ImageAnalysis] Visual search completed:`)
      console.log(`  - Search method: ${searchResult.searchMethod}`)
      console.log(`  - Objects detected: ${JSON.stringify(searchResult.detectedObjects)}`)
      console.log(`  - Products found: ${searchResult.products.length}`)
      console.log(`  - Overall confidence: ${searchResult.confidence}%`)
      
      // Convert to backward-compatible format
      return {
        products: searchResult.products,
        visualFeatures: {
          objects: searchResult.detectedObjects.map(name => ({ name, confidence: 0.8 })),
          labels: searchResult.detectedObjects.map(name => ({ description: name, confidence: 0.8 })),
          colors: [],
          webEntities: []
        },
        searchMethod: searchResult.searchMethod,
        confidence: searchResult.confidence,
        matchingCriteria: {
          objectMatch: searchResult.confidence,
          colorMatch: 0,
          categoryMatch: searchResult.confidence,
          overallSimilarity: searchResult.confidence
        },
        timestamp: searchResult.timestamp
      }
      
    } catch (error) {
      console.error('[ImageAnalysis] Comprehensive visual search failed:', error)
      
      // Ultimate fallback to simple text analysis
      console.log('[ImageAnalysis] Using ultimate text fallback')
      try {
        const textAnalysisQuery = await this.analyzeWithGemini(imageUrl, model)
        if (textAnalysisQuery) {
          const { searchForProducts } = await import("@/lib/products-service")
          const products = await searchForProducts(textAnalysisQuery, 8, undefined, true)
          
          return {
            products,
            visualFeatures: {
              objects: [{ name: textAnalysisQuery, confidence: 0.5 }],
              colors: [],
              labels: [{ description: textAnalysisQuery, confidence: 0.5 }],
              categoryHints: ['unknown']
            },
            searchMethod: 'fallback',
            confidence: 30,
            matchingCriteria: {
              objectMatch: 30,
              colorMatch: 0,
              categoryMatch: 50,
              overallSimilarity: 30
            },
            timestamp: new Date().toISOString()
          }
        }
      } catch (fallbackError) {
        console.error('[ImageAnalysis] Ultimate fallback also failed:', fallbackError)
      }
      
      return null
    }
  }
  
  // Enhanced text-based analysis with detailed visual understanding
  static async analyzeWithGemini(imageUrl: string, model: any): Promise<string | null> {
    try {
      console.log(`[ImageAnalysis] Using ENHANCED Gemini visual analysis for: ${imageUrl}`)
      
      // Fetch and convert image to base64
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`Image not accessible: ${imageResponse.status}`)
      }
      
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
                text: `Analyze this image in extreme detail and identify EXACTLY what product is shown. Be incredibly specific about:

1. EXACT PRODUCT TYPE: What is this? (e.g., "leather bomber jacket", "luxury dress watch", "wireless headphones", "desk lamp")

2. VISUAL CHARACTERISTICS:
   - Materials: leather, metal, fabric, plastic, etc.
   - Colors: primary and secondary colors
   - Style/Design: modern, vintage, minimalist, ornate, etc.
   - Brand elements: logos, distinctive design features
   - Texture and finish: matte, glossy, brushed, etc.

3. PRODUCT CATEGORY: Fashion, electronics, furniture, accessories, etc.

4. DISTINCTIVE FEATURES: What makes this product unique or recognizable?

5. SEARCH TERMS: What 3-4 search terms would help find VISUALLY SIMILAR products?

Format your response as: "[Product Type] [Material] [Color] [Style] [Distinctive Feature]"

Example outputs:
- "leather bomber jacket brown vintage aviator style"
- "luxury dress watch gold rose metal classic dial"
- "wireless bluetooth headphones black over-ear modern"
- "modern desk lamp metal adjustable arm"

Be extremely specific and focus on VISUAL characteristics that would help find similar-looking products.`
              },
              {
                type: "image",
                image: dataUrl
              }
            ]
          }
        ]
      })
      
      if (result?.text) {
        const enhancedQuery = result.text.trim()
        console.log(`[ImageAnalysis] Enhanced Gemini analysis result: "${enhancedQuery}"`)
        return enhancedQuery
      }
      
      return null
    } catch (error) {
      console.error('[ImageAnalysis] Enhanced Gemini analysis failed:', error)
      return null
    }
  }
  
  // Legacy method for backwards compatibility
  static async analyzeImage(
    imageUrl: string, 
    productMetadata: any, 
    model: any
  ): Promise<string> {
    // Try the real visual search first
    const visualResult = await this.findVisuallySimilarProducts(imageUrl, model)
    
    if (visualResult && visualResult.visualFeatures.objects.length > 0) {
      // Use the primary detected object
      return visualResult.visualFeatures.objects[0].name
    }
    
    // Fall back to text analysis
    const textResult = await this.analyzeWithGemini(imageUrl, model)
    if (textResult) {
      return textResult
    }
    
    // Final fallback to metadata
    if (productMetadata?.category && productMetadata?.title) {
      return `${productMetadata.category} similar to ${productMetadata.title}`
    }
    
    return "unknown product"
  }
}
