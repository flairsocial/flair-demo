import { NextResponse } from "next/server"
import type { Product } from "@/lib/types"
import { auth } from '@clerk/nextjs/server'
import { searchForProducts } from "@/lib/products-service"

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
  const profileContext = searchParams.get("profileContext") // New parameter for profile-based filtering
  const limit = Number.parseInt(searchParams.get("limit") || "100") // Default to 100 for discovery

  // For discovery page, always fetch extensive results
  const isDiscoveryPage = !userQuery && !chatContext && !imageAnalysis
  const effectiveLimit = isDiscoveryPage ? Math.max(limit, 120) : limit

  // Generate search query with proper category filtering and profile integration
  // If we have image analysis from Gemini Vision, use that instead of chat context
  const searchQuery = imageAnalysis || chatContext || userQuery

  // Parse profile context for filtering
  let budgetRange: { min: number, max: number } | null = null
  let userGender: string | null = null
  let measurements: any = {}
  
  if (profileContext) {
    // Extract budget range
    const budgetMatch = profileContext.match(/Budget: ([^.]+)/)
    if (budgetMatch) {
      const budgetStr = budgetMatch[1]
      const ranges = budgetStr.split(',').map(r => r.trim())
      if (ranges.length > 0) {
        // Parse ranges like "$0-50", "$50-100", etc.
        const minRange = ranges[0].match(/\$?(\d+)-(\d+)/)
        const maxRange = ranges[ranges.length - 1].match(/\$?(\d+)-(\d+)/)
        
        if (minRange && maxRange) {
          budgetRange = {
            min: parseInt(minRange[1]),
            max: parseInt(maxRange[2])
          }
        }
      }
    }
    
    // Extract gender
    const genderMatch = profileContext.match(/Gender: ([^.]+)/)
    if (genderMatch && genderMatch[1] !== "Prefer not to say") {
      userGender = genderMatch[1].toLowerCase()
    }
    
    // Extract measurements for size filtering
    const waistMatch = profileContext.match(/Waist: ([^.]+)/)
    const chestMatch = profileContext.match(/Chest\/Bust: ([^.]+)/)
    const shoeMatch = profileContext.match(/Shoe size: ([^.]+)/)
    
    if (waistMatch) measurements.waist = waistMatch[1]
    if (chestMatch) measurements.chest = chestMatch[1]
    if (shoeMatch) measurements.shoe = shoeMatch[1]
  }

  console.log(`LOG: Using search query: "${searchQuery || 'discovery mode'}"`)
  console.log(`LOG: Image analysis used: ${imageAnalysis ? 'yes' : 'no'}`)
  console.log(`LOG: Category filter: ${categoryParam || 'none'}`)
  console.log(`LOG: Discovery page: ${isDiscoveryPage ? 'yes' : 'no'}`)
  console.log(`LOG: Budget range: ${budgetRange ? `$${budgetRange.min}-$${budgetRange.max}` : 'none'}`)
  console.log(`LOG: User gender: ${userGender || 'none'}`)
  console.log(`LOG: Fetching ${effectiveLimit} items`)

  try {
    // Track credit usage
    const creditsUsed = trackCreditUsage(request)
    
    // Use the shared products service with profile filtering
    const products = await searchForProducts(
      searchQuery || `${categoryParam || 'fashion'} trending`, 
      effectiveLimit, 
      userId || undefined, 
      !!imageAnalysis,
      budgetRange,
      measurements
    )

    // Additional client-side filtering for discovery page
    let filteredProducts = products
    
    if (budgetRange && budgetRange.max > 0) {
      filteredProducts = filteredProducts.filter(product => {
        const price = parseFloat(product.price?.toString() || '0')
        return price >= budgetRange.min && price <= budgetRange.max
      })
      console.log(`LOG: Budget filtered: ${filteredProducts.length}/${products.length} products`)
    }

    console.log(`LOG: Final product count: ${filteredProducts.length}`)

    // Return products with credit usage info
    const response = NextResponse.json(filteredProducts)
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
