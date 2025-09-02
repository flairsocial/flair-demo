import { NextResponse } from "next/server"
import type { Product } from "@/lib/types"

// Default search query for luxury men's business casual clothing
const DEFAULT_SEARCH_QUERY = "luxury mens business casual clothing premium designer"

// Expanded and diversified list of fashion queries
const preconfiguredFashionQueries = [
  // Luxury & Designer
  "luxury blue silk dress",
  "designer men's green suit",
  "Chanel classic flap bag new season",
  "Gucci Horsebit loafers men",
  "Prada Re-Nylon bomber jacket",
  "Saint Laurent Le 5 à 7 hobo bag",
  "Dior B23 high-top sneakers",
  "luxury cashmere turtleneck sweater",
  "Tom Ford sunglasses for women",
  "Valentino Garavani Rockstud pumps",
  "Fendi Baguette embroidered bag",
  "Celine Triomphe canvas tote",
  "Loewe Puzzle bag mini",
  "Burberry classic trench coat women",
  "Rolex Datejust watch",
  "Cartier Juste un Clou bracelet",
  "Bottega Veneta Cassette bag",
  "Balenciaga Speed Trainer",
  "Vivienne Westwood pearl necklace",
  "Alexander McQueen oversized sneakers",
  "Givenchy Antigona bag",
  "Moncler Maya down jacket",

  // Popular & Quality Contemporary Brands
  "Nike Air Force 1 white",
  "Adidas Ultraboost running shoes",
  "Zara oversized blazer women",
  "Lululemon Align leggings",
  "Patagonia Synchilla fleece jacket",
  "Dr. Martens 1460 boots",
  "Converse Chuck Taylor All Star high top",
  "Levi's 501 original fit jeans men",
  "Uniqlo Supima cotton t-shirt",
  "COS tailored wool trousers",
  "Everlane The Day Glove flats",
  "Reformation floral print dress",
  "Ganni seersucker check dress",
  "New Balance 550 sneakers",
  "Stone Island cargo pants",
  "Arc'teryx Beta AR jacket",

  // Specific Item Types with Quality/Luxury Hint
  "men's luxury athletic pants",
  "premium cotton t-shirt pack",
  "Italian leather Chelsea boots",
  "Japanese selvedge denim jeans",
  "women's silk blouse office wear",
  "technical fabric outdoor jacket",
  "minimalist leather sneakers",
  "organic cotton hoodie",
  "merino wool base layer",
  "sustainable fashion brands clothing",
]

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

  const { searchParams } = new URL(request.url)
  const userQuery = searchParams.get("query")
  const categoryParam = searchParams.get("category")
  const limit = Number.parseInt(searchParams.get("limit") || "40")

  let serperSearchQuery: string
  const qualityKeywords = "best quality stylish popular"

  if (userQuery) {
    serperSearchQuery = `${userQuery} ${qualityKeywords}`
    if (categoryParam && categoryParam !== "All") {
      serperSearchQuery = `${userQuery} ${categoryParam} ${qualityKeywords}`
    }
  } else if (categoryParam && categoryParam !== "All") {
    serperSearchQuery = `${categoryParam} ${getRandomElement(knownBrands)} ${qualityKeywords}`
  } else {
    // Use default luxury men's business casual search instead of random
    serperSearchQuery = DEFAULT_SEARCH_QUERY
  }
  console.log(`LOG: Using Serper query: "${serperSearchQuery}"`)

  const requestOptions = {
    method: "POST",
    headers: {
      "X-API-KEY": serperApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: serperSearchQuery,
      num: limit,
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
    if (rawShoppingResults.length > 0) {
      console.log("LOG: First raw Serper result:", JSON.stringify(rawShoppingResults[0], null, 2))
    }

    const categoriesForMocking = ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories", "Outerwear"]
    const descriptionsForMocking = [
      "A stylish and high-quality piece, perfect for a modern wardrobe.",
      "Crafted with attention to detail, offering both comfort and contemporary style.",
      "Versatile and chic, this item is a great addition to any collection.",
      "Features a contemporary design and is made from quality materials.",
    ]

    const minPrice = 75
    let priceFilteredCount = 0
    let imageFilteredCount = 0

    const products: Product[] = rawShoppingResults
      .map((item: any, index: number) => {
        const price = parsePrice(item.price)
        if (price < minPrice && !preconfiguredFashionQueries.some((q) => q.toLowerCase().includes("uniqlo"))) {
          priceFilteredCount++
          return null
        }

        const imageUrl = item.imageUrl
        // Slightly relaxed image filter for debugging
        if (
          !imageUrl ||
          imageUrl.includes("gstatic.com/images?q=tbn:ANd9GcR") || // Still filter the most generic placeholder
          !imageUrl.startsWith("https://")
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
      .filter((product: Product | null): product is Product => product !== null && product.price > 0 && product.image !== null)

    console.log(`LOG: Items filtered out by price (< $${minPrice}): ${priceFilteredCount}`)
    console.log(`LOG: Items filtered out by image URL: ${imageFilteredCount}`)
    console.log(`LOG: Final product count after all filtering: ${products.length}`)

    if (products.length === 0 && rawShoppingResults.length > 0) {
      console.warn(
        `WARN: All ${rawShoppingResults.length} Serper results were filtered out. Check price/image filters and Serper response details. Query: "${serperSearchQuery}"`,
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
