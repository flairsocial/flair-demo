import { NextResponse } from "next/server"
import type { Product } from "@/lib/types"
import { auth } from '@clerk/nextjs/server'
import { searchForProducts } from "@/lib/products-service"

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
  const limit = Number.parseInt(searchParams.get("limit") || "100") // Default to 100 for discovery

  // For discovery page, always fetch extensive results
  const isDiscoveryPage = !userQuery && !chatContext && !imageAnalysis
  const effectiveLimit = isDiscoveryPage ? Math.max(limit, 120) : limit

  // Generate search query with proper category filtering and profile integration
  // If we have image analysis from Gemini Vision, use that instead of chat context
  const searchQuery = imageAnalysis || chatContext || userQuery

  console.log(`LOG: Using search query: "${searchQuery || 'discovery mode'}"`)
  console.log(`LOG: Image analysis used: ${imageAnalysis ? 'yes' : 'no'}`)
  console.log(`LOG: Category filter: ${categoryParam || 'none'}`)
  console.log(`LOG: Discovery page: ${isDiscoveryPage ? 'yes' : 'no'}`)
  console.log(`LOG: Fetching ${effectiveLimit} items`)

  try {
    // Use the shared products service
    const products = await searchForProducts(
      searchQuery || `${categoryParam || 'fashion'} trending`, 
      effectiveLimit, 
      userId || undefined, 
      !!imageAnalysis
    )

    console.log(`LOG: Final product count: ${products.length}`)

    return NextResponse.json(products)
  } catch (error: any) {
    console.error(
      `CRITICAL: Error in product fetching route:`,
      error.message,
      error.stack,
    )
    return NextResponse.json([], { status: 200 })
  }
}
