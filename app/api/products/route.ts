import { NextResponse } from "next/server"
import type { Product } from "@/lib/types"
import { auth } from '@clerk/nextjs/server'
import { searchForProducts } from "@/lib/products-service"
import { marketplaceService } from "@/lib/marketplace-service"

// Credit tracking for API usage
function trackCreditUsage(request: Request) {
  // Product search uses 1 credit (so 10-15 searches = 10-15 credits, consumes 10 after accumulation)
  const creditsUsed = 1
  
  // Add credit usage header for frontend to track
  return creditsUsed
}

export async function GET(request: Request) {
  const serperApiKey = process.env.SERPER_API_KEY
  if (!serperApiKey) {
    console.error("CRITICAL: SERPER_API_KEY environment variable is not set.")
    return NextResponse.json([], { status: 200 })
  }
  console.log("LOG: SERPER_API_KEY is present.")

  // Get user authentication for personalized search
  const { userId } = await auth()

  const { searchParams } = new URL(request.url)
  const userQuery = searchParams.get("query")
  const categoryParam = searchParams.get("category")
  const chatContext = searchParams.get("chatContext") // New parameter for chat context
  const imageAnalysis = searchParams.get("imageAnalysis") // New parameter for image analysis results
  const shoppingMode = searchParams.get("shoppingMode") || "default" // Shopping mode parameter
  const limit = Number.parseInt(searchParams.get("limit") || "100") // Default to 100 for discovery

  // For discovery page, always fetch extensive results
  const isDiscoveryPage = !userQuery && !chatContext && !imageAnalysis
  const effectiveLimit = isDiscoveryPage ? Math.max(limit, 120) : limit

  // Generate search query with proper category filtering and profile integration
  // If we have image analysis from Gemini Vision, use that instead of chat context
  const searchQuery = imageAnalysis || chatContext || userQuery

  console.log(`LOG: Using search query: "${searchQuery || 'discovery mode'}"`)
  console.log(`LOG: Shopping mode: ${shoppingMode}`)
  console.log(`LOG: Image analysis used: ${imageAnalysis ? 'yes' : 'no'}`)
  console.log(`LOG: Category filter: ${categoryParam || 'none'}`)
  console.log(`LOG: Discovery page: ${isDiscoveryPage ? 'yes' : 'no'}`)
  console.log(`LOG: Fetching ${effectiveLimit} items`)

  try {
    // Track credit usage
    const creditsUsed = trackCreditUsage(request)

    let products: Product[]

    // Use marketplace search when in marketplace mode
    if (shoppingMode === 'marketplace') {
      console.log(`LOG: Using marketplace search for query: "${searchQuery || 'general search'}"`)

      const marketplaceResult = await marketplaceService.searchMultipleProviders({
        query: searchQuery || 'fashion',
        limit: effectiveLimit
      })

      // Convert marketplace products to the expected Product format
      products = marketplaceResult.products.map(mp => {
        console.log(`Products API: Mapping marketplace product ${mp.title} with URL: ${mp.url}`)

        return {
          id: mp.id,
          image: mp.imageUrl, // Map imageUrl to image field
          title: mp.title,
          price: mp.price,
          brand: mp.brand || 'Unknown',
          category: mp.category || 'marketplace',
          description: mp.description,
          link: mp.url, // This maps mp.url to product.link
          // Add marketplace-specific data
          marketplace: {
            provider: mp.provider,
            condition: mp.condition,
            seller: mp.seller ? {
              name: mp.seller.name,
              rating: mp.seller.rating,
              verified: mp.seller.verified
            } : undefined
          },
          // Add default values for other required fields
          hasAiInsights: false,
          saved: false
        }
      })

      console.log(`LOG: Marketplace search completed - ${products.length} products from ${marketplaceResult.successfulProviders.length} providers`)
    } else {
      // Use regular product search for default mode
      products = await searchForProducts(
        searchQuery || `${categoryParam || 'fashion'} trending`,
        effectiveLimit,
        userId || undefined,
        !!imageAnalysis
      )
    }

    console.log(`LOG: Final product count: ${products.length}`)

    // Return products with credit usage info
    const response = NextResponse.json(products)
    response.headers.set('X-Credits-Used', creditsUsed.toString())
    return response
  } catch (error: any) {
    console.error(
      `CRITICAL: Error in product fetching route:`,
      error.message,
      error.stack,
    )
    return NextResponse.json([], { status: 200 })
  }
}
