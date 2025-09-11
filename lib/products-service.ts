import type { Product } from "@/lib/types"

// Helper function to parse price string (e.g., "$23.74") to number
function parsePrice(priceString: string | null | undefined): number {
  if (!priceString) return 0
  const numberString = priceString.replace(/[^0-9.]/g, "")
  const price = Number.parseFloat(numberString)
  return isNaN(price) ? 0 : price
}

// Extract brand from title or source - keep it simple and accurate
function extractBrand(title: string, source: string): string {
  // First check if source is a known retailer domain
  const retailerDomains = ["amazon.com", "ebay.com", "walmart.com", "target.com", "etsy.com", "shopify.com", 
    "stockx.com", "goat.com", "grailed.com", "depop.com", "poshmark.com", "vestiaire.com", 
    "therealreal.com", "mercari.com", "offerup.com", "facebook.com", "craigslist.org"]
  
  // Always try to extract brand from title first (most reliable)
  const words = title.split(' ')
  const firstWord = words[0]?.trim()
  
  // If first word looks like a brand name (not too short/long, not a common word)
  if (firstWord && firstWord.length > 1 && firstWord.length < 20 && 
      !['the', 'a', 'an', 'new', 'used', 'vintage', 'original'].includes(firstWord.toLowerCase())) {
    return firstWord
  }
  
  // If title extraction failed and source is NOT a retailer, use source
  if (source && !retailerDomains.some(domain => source.toLowerCase().includes(domain))) {
    const cleanSource = source.replace(/\.(com|net|org|co\.uk)$/i, '').trim()
    if (cleanSource.length > 0 && cleanSource.length < 30) {
      return cleanSource
    }
  }
  
  // Fallback - try second word from title
  const secondWord = words[1]?.trim()
  if (secondWord && secondWord.length > 2 && secondWord.length < 20) {
    return secondWord
  }
  
  // Final fallback
  return "Brand"
}

// Extract product type from title (e.g., "Loro Piana Tennis Walk Suede" -> "tennis sneakers")
function extractProductType(title: string, category?: string): string {
  const titleLower = title.toLowerCase()
  
  // Define product type mappings
  const productTypes: Record<string, string[]> = {
    'sneakers': ['sneaker', 'tennis', 'walk', 'runner', 'trainer', 'athletic'],
    'loafers': ['loafer', 'slip-on', 'penny', 'moccasin', 'driving'],
    'boots': ['boot', 'ankle', 'combat', 'chelsea', 'hiking'],
    'dress shoes': ['oxford', 'derby', 'formal', 'dress', 'business'],
    'sandals': ['sandal', 'slide', 'flip-flop', 'thong'],
    'heels': ['heel', 'pump', 'stiletto', 'wedge'],
    'flats': ['flat', 'ballet', 'pointed'],
    'handbags': ['bag', 'handbag', 'purse', 'tote', 'satchel'],
    'backpacks': ['backpack', 'rucksack', 'daypack'],
    'wallets': ['wallet', 'billfold', 'cardholder'],
    'jackets': ['jacket', 'blazer', 'coat', 'outerwear'],
    'dresses': ['dress', 'gown', 'frock'],
    'shirts': ['shirt', 'blouse', 'top', 'tee'],
    'pants': ['pant', 'trouser', 'jean', 'chino'],
    'watches': ['watch', 'timepiece', 'chronograph']
  }
  
  // Find matching product type
  for (const [type, keywords] of Object.entries(productTypes)) {
    if (keywords.some(keyword => titleLower.includes(keyword))) {
      return type
    }
  }
  
  // Fallback to category if provided
  if (category && category.toLowerCase() !== 'product') {
    return category.toLowerCase()
  }
  
  // Final fallback - use first 2 words of title (remove brand name)
  const words = title.split(' ').slice(1, 3) // Skip first word (likely brand)
  return words.join(' ').toLowerCase() || 'product'
}

// Enhanced competitor/alternative product search function with VISUAL SEARCH
export async function searchForCompetitorProducts(
  originalProduct: Product,
  searchType: 'competitors' | 'alternatives' | 'similar',
  limit = 6,
  userId?: string,
  budget?: { min: number, max: number }
): Promise<Product[]> {
  try {
    console.log(`[ProductsService] Starting ${searchType} search for: ${originalProduct.title}`)
    if (budget) {
      console.log(`[ProductsService] Budget constraint: $${budget.min}-$${budget.max}`)
    }
    
    // PRIORITY 1: Use VISUAL SEARCH if product has image - this is the key improvement!
    if (originalProduct.image && originalProduct.image.startsWith('http')) {
      console.log(`[ProductsService] Using VISUAL SEARCH for competitors: ${originalProduct.image}`)
      
      try {
        const { ImageAnalysisService } = await import("@/lib/image-analysis-service")
        const visualSearchResult = await ImageAnalysisService.findVisuallySimilarProducts(
          originalProduct.image,
          null, // model not needed for this
          budget, // Pass budget constraint to visual search
          undefined  // user style
        )
        
        if (visualSearchResult && visualSearchResult.products && visualSearchResult.products.length > 0) {
          console.log(`[ProductsService] VISUAL search found ${visualSearchResult.products.length} visually similar products`)
          
          // Filter out the original brand for competitors/alternatives
          let filteredProducts = visualSearchResult.products
          if (searchType === 'competitors' || searchType === 'alternatives') {
            const originalBrand = originalProduct.brand?.toLowerCase()
            filteredProducts = visualSearchResult.products.filter((product: Product) => {
              const productBrand = product.brand?.toLowerCase()
              return !originalBrand || !productBrand || productBrand !== originalBrand
            })
            console.log(`[ProductsService] Filtered out original brand, ${filteredProducts.length} different brand alternatives found`)
          }
          
          // Apply budget filtering if specified
          if (budget) {
            filteredProducts = filteredProducts.filter((product: Product) => {
              const productPrice = product.price || 0
              return productPrice >= budget.min && productPrice <= budget.max
            })
            console.log(`[ProductsService] Budget filtered: ${filteredProducts.length} products within $${budget.min}-$${budget.max}`)
          }
          
          // Return visual search results (they're already similar visually!)
          return filteredProducts.slice(0, limit)
        }
      } catch (visualError) {
        console.error('[ProductsService] Visual search failed, falling back to text search:', visualError)
      }
    }
    
    // FALLBACK: Text-based search (only when visual search fails or no image)
    console.log(`[ProductsService] Using TEXT SEARCH fallback for competitors`)
    
    const serperApiKey = process.env.SERPER_API_KEY
    if (!serperApiKey) {
      console.error("[ProductsService] SERPER_API_KEY not available")
      return []
    }

    // IMPROVED: Better text-based search queries that focus on product type, not exact title
    let searchQuery = ""
    
    // Extract the product TYPE (not the exact model name)
    const productType = extractProductType(originalProduct.title, originalProduct.category)
    
    switch (searchType) {
      case 'competitors':
      case 'alternatives':
        // Search for the PRODUCT TYPE, exclude original brand, add budget constraint
        const excludeBrand = originalProduct.brand || ''
        let budgetTerm = budget ? `under $${budget.max} budget` : ''
        searchQuery = `${productType} alternatives -"${excludeBrand}" different brands ${budgetTerm}`.trim()
        break
      case 'similar':
        // Search for similar product types with budget
        let budgetConstraint = budget ? `under $${budget.max}` : ''
        searchQuery = `${productType} similar styles ${budgetConstraint}`.trim()
        break
    }
    
    console.log(`[ProductsService] Text-based competitor search: "${searchQuery}" (type: ${searchType})`)
    console.log(`[ProductsService] Extracted product type: "${productType}" from "${originalProduct.title}"`)

    const requestOptions = {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchQuery,
        num: Math.min(limit * 3, 60), // Get more results for better filtering
        gl: "us",
        hl: "en",
      }),
    }

    const response = await fetch("https://google.serper.dev/shopping", requestOptions)
    
    if (!response.ok) {
      console.log("[ProductsService] Serper API error:", response.status, response.statusText)
      return []
    }

    const data = await response.json()
    const rawShoppingResults = data.shopping || []
    console.log(`[ProductsService] Received ${rawShoppingResults.length} text-based competitor results from Serper`)

    let priceFilteredCount = 0
    let imageFilteredCount = 0
    let brandFilteredCount = 0
    let budgetFilteredCount = 0

    const products: Product[] = rawShoppingResults
      .map((item: any, index: number) => {
        const price = parsePrice(item.price)
        
        // Basic price filtering (remove very cheap items that are likely irrelevant)
        if (price < 5) {
          priceFilteredCount++
          return null
        }

        // Budget constraint filtering - only apply if budget is specified
        if (budget && budget.min !== undefined && budget.max !== undefined && price > 0) {
          if (price < budget.min || price > budget.max) {
            budgetFilteredCount++
            return null
          }
        }

        const imageUrl = item.imageUrl
        if (!imageUrl || !imageUrl.startsWith("http")) {
          imageFilteredCount++
          return null
        }

        const brandName = extractBrand(item.title, item.source)
        
        // For competitor/alternative searches, filter out the original brand
        if ((searchType === 'competitors' || searchType === 'alternatives') && 
            originalProduct.brand && 
            brandName.toLowerCase() === originalProduct.brand.toLowerCase()) {
          brandFilteredCount++
          return null
        }

        return {
          id: item.productId || item.link || `competitor-${index}`,
          image: imageUrl,
          title: item.title || "Alternative Product",
          price: price,
          brand: brandName,
          category: originalProduct.category || "Product", // Keep same category as original
          description: item.snippet || `Alternative to ${originalProduct.title}`,
          hasAiInsights: false, // Keep it simple
          saved: false,
          link: item.link || undefined,
        }
      })
      .filter((product: Product | null): product is Product => product !== null)
      .slice(0, limit)

    console.log(`[ProductsService] Text search filtering: price=${priceFilteredCount}, budget=${budgetFilteredCount}, image=${imageFilteredCount}, brand=${brandFilteredCount}`)
    console.log(`[ProductsService] Final competitor count: ${products.length}`)

    return products
  } catch (error) {
    console.error("[ProductsService] Error searching for competitor products:", error)
    return []
  }
}

// Main product search function - clean and simple
export async function searchForProducts(
  query: string, 
  limit = 6, 
  userId?: string, 
  isImageAnalysis = false,
  budgetRange?: { min: number, max: number } | null,
  measurements?: any
): Promise<Product[]> {
  try {
    console.log(`[ProductsService] Searching for products: "${query}"`)
    if (budgetRange) {
      console.log(`[ProductsService] Budget filter: $${budgetRange.min}-$${budgetRange.max}`)
    }
    if (measurements && Object.keys(measurements).length > 0) {
      console.log(`[ProductsService] Measurements filter:`, measurements)
    }
    
    const serperApiKey = process.env.SERPER_API_KEY
    if (!serperApiKey) {
      console.error("[ProductsService] SERPER_API_KEY not available")
      return []
    }

    const requestOptions = {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query, // Use the query directly - no manipulation
        num: Math.min(limit * 2, 40),
        gl: "us",
        hl: "en",
      }),
    }

    const response = await fetch("https://google.serper.dev/shopping", requestOptions)
    
    if (!response.ok) {
      console.log("[ProductsService] Serper API error:", response.status, response.statusText)
      const errorText = await response.text()
      console.log("[ProductsService] Error response:", errorText)
      return []
    }

    const data = await response.json()
    console.log(`[ProductsService] Full Serper response:`, JSON.stringify(data, null, 2).substring(0, 500))
    const rawShoppingResults = data.shopping || []
    console.log(`[ProductsService] Received ${rawShoppingResults.length} raw results from Serper`)

    let priceFilteredCount = 0
    let imageFilteredCount = 0
    let budgetFilteredCount = 0

    const products: Product[] = rawShoppingResults
      .map((item: any, index: number) => {
        const price = parsePrice(item.price)

        // Basic filtering - only remove obviously irrelevant items
        if (price < 5) {
          priceFilteredCount++
          return null
        }

        // Budget constraint filtering - only apply if budget is specified
        if (budgetRange && budgetRange.min !== undefined && budgetRange.max !== undefined && price > 0) {
          if (price < budgetRange.min || price > budgetRange.max) {
            budgetFilteredCount++
            return null
          }
        }

        const imageUrl = item.imageUrl
        if (!imageUrl || !imageUrl.startsWith("http")) {
          imageFilteredCount++
          return null
        }

        const brandName = extractBrand(item.title, item.source)

        return {
          id: item.productId || item.link || `product-${index}`,
          image: imageUrl,
          title: item.title || "Product",
          price: price,
          brand: brandName,
          category: "Product", // Let Gemini handle categorization in conversation
          description: item.snippet || `${item.title} from ${brandName}`,
          hasAiInsights: false,
          saved: false,
          link: item.link || undefined,
        }
      })
      .filter((product: Product | null): product is Product => product !== null)
      .slice(0, limit)

    console.log(`[ProductsService] Items filtered: price=${priceFilteredCount}, budget=${budgetFilteredCount}, image=${imageFilteredCount}`)
    console.log(`[ProductsService] Final product count: ${products.length}`)

    return products
  } catch (error) {
    console.error("[ProductsService] Error searching for products:", error)
    return []
  }
}
