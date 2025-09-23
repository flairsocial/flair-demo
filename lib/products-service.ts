import type { Product } from "@/lib/types"
import { marketplaceService } from "./marketplace-service"
import type { ShoppingMode } from "./shopping-mode-context"

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

// Convert marketplace product to standard product format
function convertMarketplaceProduct(marketplaceProduct: any): Product {
  return {
    id: marketplaceProduct.id,
    image: marketplaceProduct.imageUrl,
    title: marketplaceProduct.title,
    price: marketplaceProduct.price,
    brand: marketplaceProduct.brand || extractBrand(marketplaceProduct.title, marketplaceProduct.provider),
    category: marketplaceProduct.category || "Product",
    description: marketplaceProduct.description || marketplaceProduct.title,
    hasAiInsights: false,
    saved: false,
    link: marketplaceProduct.url,
    marketplace: {
      provider: marketplaceProduct.provider,
      condition: marketplaceProduct.condition,
      seller: marketplaceProduct.seller
    }
  }
}

// Search marketplace products using marketplace service
async function searchMarketplaceProducts(
  query: string,
  limit: number,
  userId?: string
): Promise<Product[]> {
  try {
    console.log(`[ProductsService] Searching marketplace for: "${query}"`)
    
    const searchParams = {
      query,
      limit,
      sortBy: 'relevance' as const
    }
    
    const results = await marketplaceService.searchMultipleProviders(searchParams)
    
    if (!results.products.length) {
      console.log(`[ProductsService] No marketplace results found for: "${query}"`)
      return []
    }
    
    const products = results.products
      .slice(0, limit)
      .map(convertMarketplaceProduct)
    
    console.log(`[ProductsService] Converted ${products.length} marketplace products`)
    return products
  } catch (error) {
    console.error("[ProductsService] Error searching marketplace products:", error)
    return []
  }
}

// Enhanced competitor/alternative product search function
export async function searchForCompetitorProducts(
  originalProduct: Product,
  searchType: 'competitors' | 'alternatives' | 'similar',
  limit = 6,
  userId?: string,
  shoppingMode: ShoppingMode = 'default'
): Promise<Product[]> {
  try {
    const serperApiKey = process.env.SERPER_API_KEY
    if (!serperApiKey) {
      console.error("[ProductsService] SERPER_API_KEY not available")
      return []
    }

    // If marketplace mode, search marketplace first
    if (shoppingMode === 'marketplace') {
      // For competitors, try marketplace search with adjusted query
      let searchQuery = ""
      switch (searchType) {
        case 'competitors':
        case 'alternatives':
          const mainKeywords = originalProduct.title.split(' ').slice(0, 3).join(' ')
          searchQuery = `${mainKeywords} alternatives`
          break
        case 'similar':
          searchQuery = `${originalProduct.title} similar`
          break
      }
      
      const marketplaceResults = await searchMarketplaceProducts(searchQuery, limit, userId)
      if (marketplaceResults.length > 0) {
        return marketplaceResults
      }
      // Fall through to default search if marketplace returns no results
    }

    let searchQuery = ""
    
    switch (searchType) {
      case 'competitors':
      case 'alternatives':
        // Search for alternatives but exclude the original brand
        const mainKeywords = originalProduct.title.split(' ').slice(0, 3).join(' ') // First 3 words
        const excludeBrand = originalProduct.brand || ''
        searchQuery = `${mainKeywords} alternatives -"${excludeBrand}"`
        break
      case 'similar':
        // Search for similar products including the same brand
        searchQuery = `${originalProduct.title} similar`
        break
    }
    
    console.log(`[ProductsService] Competitor search: "${searchQuery}" (type: ${searchType})`)
    console.log(`[ProductsService] Original product: ${originalProduct.title} by ${originalProduct.brand}`)

    const requestOptions = {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchQuery,
        num: Math.min(limit * 2, 40), // Get more results to account for filtering
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
    console.log(`[ProductsService] Received ${rawShoppingResults.length} competitor results from Serper`)

    let priceFilteredCount = 0
    let imageFilteredCount = 0
    let brandFilteredCount = 0

    const products: Product[] = rawShoppingResults
      .map((item: any, index: number) => {
        const price = parsePrice(item.price)
        
        // Basic price filtering (remove very cheap items that are likely irrelevant)
        if (price < 5) {
          priceFilteredCount++
          return null
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

    console.log(`[ProductsService] Competitor filtering: price=${priceFilteredCount}, image=${imageFilteredCount}, brand=${brandFilteredCount}`)
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
  shoppingMode: ShoppingMode = 'default'
): Promise<Product[]> {
  try {
    console.log(`[ProductsService] Searching for products: "${query}" (mode: ${shoppingMode})`)
    
    // If marketplace mode, use marketplace service
    if (shoppingMode === 'marketplace') {
      return await searchMarketplaceProducts(query, limit, userId)
    }
    
    // Default mode - use existing Serper API logic
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
      return []
    }

    const data = await response.json()
    const rawShoppingResults = data.shopping || []
    console.log(`[ProductsService] Received ${rawShoppingResults.length} raw results from Serper`)

    let priceFilteredCount = 0
    let imageFilteredCount = 0

    const products: Product[] = rawShoppingResults
      .map((item: any, index: number) => {
        const price = parsePrice(item.price)

        // Basic filtering - only remove obviously irrelevant items
        if (price < 5) {
          priceFilteredCount++
          return null
        }

        const imageUrl = item.imageUrl
        if (!imageUrl || !imageUrl.startsWith("http")) {
          imageFilteredCount++
          return null
        }

        const brandName = extractBrand(item.title, item.source)

       

        // Extract store information from source
        const source = item.source || ''
        let storeLink = item.link || undefined
        let storeName = source

        // Try to create direct store links for known retailers
        if (source) {
          const sourceLower = source.toLowerCase()

          // For major retailers, try to create direct search links
          if (sourceLower.includes('amazon')) {
            storeName = 'Amazon'
            // Keep the Google Shopping link as Amazon links are complex
          } else if (sourceLower.includes('target')) {
            storeName = 'Target'
            // Keep Google Shopping link for Target too
          } else if (sourceLower.includes('walmart')) {
            storeName = 'Walmart'
            // Keep Google Shopping link
          } else if (sourceLower.includes('etsy')) {
            storeName = 'Etsy'
            // Keep Google Shopping link
          } else if (sourceLower.includes('ebay')) {
            storeName = 'eBay'
            // Keep Google Shopping link
          } else {
            // For other stores, try to extract domain
            const domainMatch = source.match(/https?:\/\/([^\/]+)/)
            if (domainMatch) {
              storeName = domainMatch[1].replace('www.', '')
            }
          }
        }

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
          link: storeLink,
          source: storeName, // Store the source/store name
        }
      })
      .filter((product: Product | null): product is Product => product !== null)
      .slice(0, limit)

    console.log(`[ProductsService] Items filtered: price=${priceFilteredCount}, image=${imageFilteredCount}`)
    console.log(`[ProductsService] Final product count: ${products.length}`)

    return products
  } catch (error) {
    console.error("[ProductsService] Error searching for products:", error)
    return []
  }
}
