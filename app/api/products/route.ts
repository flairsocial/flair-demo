import { NextResponse } from "next/server"
import type { Product } from "@/lib/types"
import { auth } from '@clerk/nextjs/server'
import { getProfile } from "@/lib/profile-storage"

// Function to get user profile directly from shared storage
async function getUserProfile(userId?: string) {
  try {
    const savedProfile = getProfile(userId || undefined)
    
    if (savedProfile && Object.keys(savedProfile).length > 0) {
      console.log('[Products] Found user profile in storage:', userId || 'anonymous')
      return savedProfile
    }
    
    console.log('[Products] No profile found in storage for:', userId || 'anonymous')
    return null
  } catch (error) {
    console.error('[Products] Error accessing profile storage:', error)
    return null
  }
}

// Parse budget ranges from user profile
function getBudgetRange(userProfile: any): { min: number, max: number } {
  if (!userProfile?.budgetRange?.length) {
    return { min: 0, max: Infinity }
  }
  
  const budgets = userProfile.budgetRange
  let budgetRanges: number[] = []
  
  budgets.forEach((budget: string) => {
    if (budget === "Under $50") budgetRanges.push(0, 50)
    else if (budget === "$50-$100") budgetRanges.push(50, 100)
    else if (budget === "$100-$250") budgetRanges.push(100, 250)
    else if (budget === "$250-$500") budgetRanges.push(250, 500)
    else if (budget === "$500+") budgetRanges.push(500, 2000)
    else if (budget === "No limit") budgetRanges.push(0, Infinity)
  })
  
  if (budgetRanges.length === 0) {
    return { min: 0, max: Infinity }
  }
  
  const min = Math.min(...budgetRanges.filter((_, i) => i % 2 === 0))
  const max = Math.max(...budgetRanges.filter((_, i) => i % 2 === 1))
  
  return { min, max }
}

// Expanded and diversified list of fashion queries for users without profiles
const preconfiguredFashionQueries = [
  // TOPS - Shirts, Blouses, Sweaters, T-shirts
  "luxury silk blouse women",
  "men's cotton dress shirt",
  "cashmere turtleneck sweater",
  "premium cotton t-shirt pack",
  "designer cropped blazer",
  "oversized hoodie streetwear",
  "wool pullover sweater",
  "linen button-up shirt",
  "graphic tee vintage style",
  "merino wool cardigan",

  // BOTTOMS - Jeans, Pants, Trousers, Shorts
  "Japanese selvedge denim jeans",
  "tailored wool trousers men",
  "high-waisted wide leg pants",
  "luxury athleisure leggings",
  "cargo pants streetwear",
  "pleated midi skirt",
  "chino pants casual",
  "leather mini skirt",
  "palazzo pants wide leg",
  "denim shorts high waisted",

  // SHOES - Sneakers, Boots, Dress Shoes, Sandals
  "Italian leather Chelsea boots",
  "minimalist white sneakers",
  "luxury dress shoes men",
  "comfortable walking sandals",
  "high-top canvas sneakers",
  "ankle boots women",
  "running shoes premium",
  "loafers leather casual",
  "platform heels designer",
  "hiking boots waterproof",

  // OUTERWEAR - Jackets, Coats, Blazers
  "wool pea coat classic",
  "leather bomber jacket",
  "trench coat luxury",
  "puffer jacket designer",
  "denim jacket vintage",
  "blazer structured tailored",
  "cardigan oversized cozy",
  "windbreaker technical",
  "fur coat faux luxury",
  "varsity jacket vintage",

  // ACCESSORIES - Bags, Watches, Jewelry, Belts
  "leather tote bag designer",
  "luxury watch men stainless steel",
  "gold jewelry minimalist",
  "silk scarf designer",
  "leather belt luxury",
  "sunglasses aviator classic",
  "backpack leather premium",
  "statement earrings gold",
  "crossbody bag chain strap",
  "pearl necklace classic",

  // DRESSES - Formal, Casual, Party
  "midi dress silk floral",
  "cocktail dress black elegant",
  "maxi dress bohemian",
  "shirt dress casual cotton",
  "evening gown formal",
  "wrap dress jersey",
  "slip dress satin",
  "sweater dress knit",
  "bodycon dress stretchy",
  "sundress summer cotton",

  // LUXURY & DESIGNER SPECIFIC
  "Chanel classic flap bag new season",
  "Gucci Horsebit loafers men",
  "Prada Re-Nylon bomber jacket",
  "Saint Laurent Le 5 à 7 hobo bag",
  "Dior B23 high-top sneakers",
  "Tom Ford sunglasses for women",
  "Valentino Garavani Rockstud pumps",
  "Fendi Baguette embroidered bag",
  "Bottega Veneta Cassette bag",
  "Balenciaga Speed Trainer",

  // POPULAR CONTEMPORARY BRANDS
  "Nike Air Force 1 white",
  "Adidas Ultraboost running shoes",
  "Lululemon Align leggings",
  "Patagonia Synchilla fleece jacket",
  "Dr. Martens 1460 boots",
  "Converse Chuck Taylor All Star",
  "Levi's 501 original fit jeans",
  "Uniqlo Supima cotton t-shirt",
  "Everlane The Day Glove flats",
  "New Balance 550 sneakers"
]

// Simple function to select search query with proper category filtering and profile integration
function selectSearchQuery(searchQuery?: string, categoryParam?: string, userProfile?: any): string {
  // Build profile context if available
  const profileContext = userProfile ? 
    `${userProfile.gender || ''} ${userProfile.style?.[0] || ''} ${userProfile.age ? (userProfile.age < 30 ? 'young' : userProfile.age < 50 ? 'contemporary' : 'classic') : ''}`.trim() : ''
  
  // If we have a search query (from image analysis, chat context, or user input)
  if (searchQuery) {
    const finalQuery = profileContext ? `${searchQuery} ${profileContext}` : searchQuery
    console.log(`[Products] Using search query with profile: "${finalQuery}"`)
    return finalQuery
  }
  
  // If category is specified, use STRICT category filtering
  if (categoryParam && categoryParam !== "All") {
    const categoryLower = categoryParam.toLowerCase()
    
    // Filter queries that STRICTLY match the category
    let categoryQueries: string[] = []
    
    if (categoryLower === "tops") {
      categoryQueries = preconfiguredFashionQueries.filter(query => 
        query.includes('blouse') || query.includes('shirt') || query.includes('sweater') || 
        query.includes('t-shirt') || query.includes('blazer') || query.includes('hoodie') || 
        query.includes('cardigan') || query.includes('pullover') || query.includes('turtleneck')
      )
    } else if (categoryLower === "bottoms") {
      categoryQueries = preconfiguredFashionQueries.filter(query => 
        query.includes('jeans') || query.includes('pants') || query.includes('trousers') || 
        query.includes('shorts') || query.includes('skirt') || query.includes('leggings') || 
        query.includes('chino') || query.includes('cargo') || query.includes('palazzo')
      )
    } else if (categoryLower === "shoes") {
      categoryQueries = preconfiguredFashionQueries.filter(query => 
        query.includes('boots') || query.includes('sneakers') || query.includes('shoes') || 
        query.includes('loafers') || query.includes('sandals') || query.includes('heels') || 
        query.includes('pumps') || query.includes('trainers') || query.includes('flats')
      )
    } else if (categoryLower === "accessories") {
      categoryQueries = preconfiguredFashionQueries.filter(query => 
        query.includes('bag') || query.includes('watch') || query.includes('jewelry') || 
        query.includes('belt') || query.includes('sunglasses') || query.includes('scarf') || 
        query.includes('necklace') || query.includes('earrings') || query.includes('bracelet')
      )
    } else if (categoryLower === "outerwear") {
      categoryQueries = preconfiguredFashionQueries.filter(query => 
        query.includes('coat') || query.includes('jacket') || query.includes('blazer') || 
        query.includes('trench') || query.includes('puffer') || query.includes('bomber') || 
        query.includes('cardigan') || query.includes('windbreaker') || query.includes('fleece')
      )
    } else if (categoryLower === "dresses") {
      categoryQueries = preconfiguredFashionQueries.filter(query => 
        query.includes('dress') || query.includes('gown') || query.includes('midi') || 
        query.includes('maxi') || query.includes('cocktail') || query.includes('evening')
      )
    }
    
    // If no category-specific queries found, create one
    if (categoryQueries.length === 0) {
      const baseQuery = `${categoryLower} fashion`
      return profileContext ? `${baseQuery} ${profileContext}` : baseQuery
    }
    
    // Select random from category-specific queries and add profile context
    const selectedQuery = getRandomElement(categoryQueries)
    const finalQuery = profileContext ? `${selectedQuery} ${profileContext}` : selectedQuery
    console.log(`[Products] Using category-specific query for ${categoryParam}: "${finalQuery}"`)
    return finalQuery
  }
  
  // For discover page - use random selection with profile context
  const selectedQuery = getRandomElement(preconfiguredFashionQueries)
  const finalQuery = profileContext ? `${selectedQuery} ${profileContext}` : selectedQuery
  console.log(`[Products] Using random preconfigured query with profile: "${finalQuery}"`)
  return finalQuery
}

// Helper function to parse price string (e.g., "$23.74") to number
function parsePrice(priceString: string | null | undefined): number {
  if (!priceString) return 0
  const numberString = priceString.replace(/[^0-9.]/g, "")
  const price = Number.parseFloat(numberString)
  return isNaN(price) ? 0 : price
}

// Helper function to select a random item from an array
function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// List of known high-quality/luxury/popular brands for better brand extraction
const knownBrands = [
  "Chanel",
  "Gucci",
  "Hermès",
  "Prada",
  "Saint Laurent",
  "Dior",
  "Rolex",
  "Cartier",
  "Bottega Veneta",
  "Balenciaga",
  "Tom Ford",
  "Valentino",
  "Fendi",
  "Celine",
  "Loewe",
  "Burberry",
  "Vivienne Westwood",
  "Alexander McQueen",
  "Givenchy",
  "Moncler",
  "Nike",
  "Adidas",
  "Zara",
  "Lululemon",
  "Patagonia",
  "Dr. Martens",
  "Converse",
  "Levi's",
  "Uniqlo",
  "COS",
  "Everlane",
  "Reformation",
  "Ganni",
  "New Balance",
  "Stone Island",
  "Arc'teryx",
  "Maison Margiela",
  "Off-White",
  "Comme des Garçons",
  "Acne Studios",
  "Isabel Marant",
  "Jacquemus",
  "Fear of God",
  "A.P.C.",
]

function extractBrand(title: string, source: string): string {
  const titleLower = title.toLowerCase()
  for (const brand of knownBrands) {
    if (titleLower.includes(brand.toLowerCase())) {
      return brand
    }
  }
  if (
    source &&
    !["amazon.com", "ebay.com", "walmart.com", "target.com", "google.com"].some((m) => source.toLowerCase().includes(m))
  ) {
    return source.split(" ")[0]
  }
  return getRandomElement(["Curated", "Designer", "Modern Style"])
}

export async function GET(request: Request) {
  const serperApiKey = process.env.SERPER_API_KEY
  if (!serperApiKey) {
    console.error("CRITICAL: SERPER_API_KEY environment variable is not set.")
    return NextResponse.json([], { status: 200 })
  }
  console.log("LOG: SERPER_API_KEY is present.")

  // Get user authentication and profile for budget filtering
  const { userId } = await auth()
  const userProfile = await getUserProfile(userId || undefined)
  const budgetRange = getBudgetRange(userProfile)
  
  console.log(`LOG: Budget range for filtering: $${budgetRange.min}-${budgetRange.max === Infinity ? '∞' : budgetRange.max}`)

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
  const serperSearchQuery = selectSearchQuery(searchQuery || undefined, categoryParam || undefined, userProfile)
  
  console.log(`LOG: Using search query: "${serperSearchQuery}"`)
  console.log(`LOG: Image analysis used: ${imageAnalysis ? 'yes' : 'no'}`)
  console.log(`LOG: Profile integrated: ${userProfile ? 'yes' : 'no'} - styles=${userProfile?.style?.length || 0}, gender=${userProfile?.gender || 'not set'}`)
  console.log(`LOG: Category filter: ${categoryParam || 'none'}`)
  console.log(`LOG: Discovery page: ${isDiscoveryPage ? 'yes' : 'no'}`)
  console.log(`LOG: Fetching ${effectiveLimit} items`)

  const requestOptions = {
    method: "POST",
    headers: {
      "X-API-KEY": serperApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: serperSearchQuery,
      num: effectiveLimit, // Use effective limit for extensive discovery results
      gl: "us",
      hl: "en",
    }),
  }

  try {
    const response = await fetch("https://google.serper.dev/shopping", requestOptions)
    console.log(`LOG: Serper API response status: ${response.status}`)

    if (!response.ok) {
      const errorData = await response.text()
      console.error(
        `CRITICAL: Serper API error: ${response.status} for query "${serperSearchQuery}". Response: ${errorData}`,
      )
      return NextResponse.json([], { status: 200 })
    }

    const data = await response.json()
    const rawShoppingResults = data.shopping || []
    console.log(`LOG: Received ${rawShoppingResults.length} raw results from Serper.`)

    const categoriesForMocking = ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories", "Outerwear"]
    const descriptionsForMocking = [
      "A stylish and high-quality piece, perfect for a modern wardrobe.",
      "Crafted with attention to detail, offering both comfort and contemporary style.",
      "Versatile and chic, this item is a great addition to any collection.",
      "Features a contemporary design and is made from quality materials.",
    ]

    // Only apply restrictive filtering for targeted searches, not discovery
    const isTargetedSearch = userQuery || chatContext || imageAnalysis
    let priceFilteredCount = 0
    let budgetFilteredCount = 0
    let imageFilteredCount = 0

    const products: Product[] = rawShoppingResults
      .map((item: any, index: number) => {
        const price = parsePrice(item.price)
        
        // For discovery page - NO price filtering, show everything
        // For targeted searches - light filtering only
        if (isTargetedSearch && price < 25) { // Much lower threshold for targeted searches
          priceFilteredCount++
          return null
        }
        
        // ONLY apply budget filtering if user has VERY specific budget preferences
        if (isTargetedSearch && userProfile?.budgetRange?.length > 0 && userProfile.budgetRange.every((range: string) => range !== "No limit")) {
          if (price < budgetRange.min || price > budgetRange.max) {
            budgetFilteredCount++
            return null
          }
        }

        const imageUrl = item.imageUrl
        // Very relaxed image filter - only filter completely broken URLs
        if (
          !imageUrl ||
          !imageUrl.startsWith("http")
        ) {
          imageFilteredCount++
          return null
        }

        let productCategory =
          categoryParam && categoryParam !== "All" ? categoryParam : getRandomElement(categoriesForMocking)

        if (categoryParam === "All" || !categoryParam) {
          const titleLower = item.title.toLowerCase()
          const foundCategory = categoriesForMocking.find((cat) => titleLower.includes(cat.toLowerCase().slice(0, -1)))
          if (foundCategory) {
            productCategory = foundCategory
          }
        }

        const brandName = extractBrand(item.title, item.source)

        return {
          id: item.productId || item.link || `${serperSearchQuery}-${index}-${price}`,
          image: imageUrl,
          title: item.title || "Fashion Item",
          price: price,
          brand: brandName,
          category: productCategory,
          description:
            item.snippet ||
            `A notable ${productCategory.toLowerCase()} from ${brandName}. ${getRandomElement(descriptionsForMocking)}`,
          hasAiInsights: Math.random() > 0.4,
          saved: false,
        }
      })
      .filter((product: Product | null): product is Product => product !== null && product.image !== null)

    console.log(`LOG: Items filtered out by price (targeted search only, min $25): ${priceFilteredCount}`)
    console.log(`LOG: Items filtered out by user budget range (targeted search only): ${budgetFilteredCount}`)
    console.log(`LOG: Items filtered out by image URL: ${imageFilteredCount}`)
    console.log(`LOG: Final product count after filtering: ${products.length}`)
    console.log(`LOG: Search type: ${isTargetedSearch ? 'Targeted (with filtering)' : 'Discovery (no filtering)'}`)

    if (products.length === 0 && rawShoppingResults.length > 0) {
      console.warn(
        `WARN: All ${rawShoppingResults.length} Serper results were filtered out. Query: "${serperSearchQuery}". Search type: ${isTargetedSearch ? 'Targeted' : 'Discovery'}`,
      )
    } else if (rawShoppingResults.length === 0) {
      console.warn(`WARN: No shopping results from Serper for query: "${serperSearchQuery}"`)
    }

    return NextResponse.json(products)
  } catch (error: any) {
    console.error(
      `CRITICAL: Error in product fetching route for query "${serperSearchQuery}":`,
      error.message,
      error.stack,
    )
    return NextResponse.json([], { status: 200 })
  }
}
