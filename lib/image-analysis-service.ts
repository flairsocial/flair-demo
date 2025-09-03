import type { Product } from "@/lib/types"

// Enhanced image analysis service with multiple fallback methods
export class ImageAnalysisService {
  
  // Method 1: Direct Gemini Vision Analysis (primary)
  static async analyzeWithGemini(imageUrl: string, model: any): Promise<string | null> {
    try {
      console.log(`[ImageAnalysis] Attempting Gemini Vision analysis for: ${imageUrl}`)
      
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
                text: `You are a fashion expert analyzing this product image. Provide a detailed description focusing on:

1. ITEM TYPE: Specific product category (sneakers, dress, jacket, etc.)
2. COLORS: Exact colors you see (navy blue, cream white, burgundy, etc.)
3. MATERIALS: Visible textures (leather, cotton, denim, knit, etc.)
4. STYLE DETAILS: Cut, fit, patterns, special features
5. OCCASION: Casual, formal, athletic, etc.

Create a search-friendly description that would help find visually similar items. Focus only on what you can see, not brand names.

Format: "[item type] [colors] [materials] [style details] [occasion]"
Example: "white leather sneakers minimal design casual athletic"`
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
        console.log(`[ImageAnalysis] Gemini analysis successful: "${result.text}"`)
        return result.text.trim()
      }
      
      return null
    } catch (error) {
      console.error('[ImageAnalysis] Gemini analysis failed:', error)
      return null
    }
  }
  
  // Method 2: Enhanced product metadata analysis (fallback)
  static analyzeFromMetadata(productMetadata: any): string {
    console.log(`[ImageAnalysis] Using enhanced metadata analysis`)
    
    const categoryKeywords: Record<string, string> = {
      'Shoes': 'shoes footwear sneakers boots sandals heels flats',
      'Tops': 'top shirt blouse sweater t-shirt tank hoodie',
      'Bottoms': 'pants jeans shorts skirt trousers leggings',
      'Dresses': 'dress gown midi maxi mini cocktail',
      'Outerwear': 'jacket coat blazer cardigan bomber',
      'Accessories': 'bag purse belt jewelry watch sunglasses'
    }
    
    const category = productMetadata.category as string
    const title = productMetadata.title as string || ''
    
    // Get category-specific keywords
    const categoryTerms = categoryKeywords[category] || category || 'fashion item'
    
    // Extract meaningful words from title
    const titleWords = title
      .toLowerCase()
      .split(' ')
      .filter((word: string) => 
        word.length > 2 &&
        !['men\'s', 'women\'s', 'new', 'sale', 'best', 'top', 'item', 'product'].includes(word)
      )
      .slice(0, 3)
      .join(' ')
    
    // Create search query
    const searchQuery = `${categoryTerms} ${titleWords} similar style alternatives`.trim()
    
    console.log(`[ImageAnalysis] Enhanced metadata query: "${searchQuery}"`)
    return searchQuery
  }
  
  // Method 3: Google Reverse Image Search (future implementation)
  static async reverseImageSearch(imageUrl: string): Promise<string | null> {
    // This could be implemented using Google's Custom Search API
    // For now, return null to indicate not implemented
    console.log(`[ImageAnalysis] Reverse image search not yet implemented`)
    return null
  }
  
  // Main analysis method that tries multiple approaches
  static async analyzeImage(
    imageUrl: string, 
    productMetadata: any, 
    model: any
  ): Promise<string> {
    // Try Gemini Vision first
    const geminiResult = await this.analyzeWithGemini(imageUrl, model)
    if (geminiResult) {
      return geminiResult
    }
    
    // Try reverse image search (future)
    const reverseResult = await this.reverseImageSearch(imageUrl)
    if (reverseResult) {
      return reverseResult
    }
    
    // Fall back to enhanced metadata analysis
    return this.analyzeFromMetadata(productMetadata)
  }
}
