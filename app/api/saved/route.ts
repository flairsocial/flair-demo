import { NextResponse } from "next/server"
import type { Product } from "@/lib/types"

// Pexels API key
const PEXELS_API_KEY = "zyLNTRqx0I8nZWQSjBtOn0qXyoPyaayAE4qmGYwdlilOz9V1gpvwnCcH"

export async function GET() {
  try {
    // Fetch from Pexels API - using specific clothing queries
    const response = await fetch(
      "https://api.pexels.com/v1/search?query=clothing+fashion+apparel+isolated+white+background&per_page=15",
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform Pexels photos to our Product format
    const products: Product[] = data.photos.map((photo: any, index: number) => {
      // Generate random price between $20 and $200
      const price = Math.floor(Math.random() * 180) + 20

      // Assign a random category
      const categories = ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories", "Outerwear"]
      const category = categories[Math.floor(Math.random() * categories.length)]

      // Generate a brand name
      const brands = ["Maison Noir", "Quartz Collection", "Monochrome", "Minimalist", "Modern Atelier", "Essentials"]
      const brand = brands[Math.floor(Math.random() * brands.length)]

      // Generate a product title
      const adjectives = ["Premium", "Modern", "Minimalist", "Elegant", "Contemporary", "Refined"]
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
      const title = `${adjective} ${category} by ${brand}`

      // Random description
      const descriptions = [
        "Crafted from premium materials with a focus on minimalist design and comfort.",
        "Clean lines and modern silhouette make this piece versatile for any occasion.",
        "Contemporary design with attention to detail and exceptional craftsmanship.",
        "Timeless addition to your wardrobe, designed for versatility and style.",
      ]
      const description = descriptions[Math.floor(Math.random() * descriptions.length)]

      // All saved products have AI insights
      const hasAiInsights = true

      return {
        id: photo.id.toString(),
        image: photo.src.medium,
        title,
        price,
        brand,
        category,
        description,
        width: photo.width,
        height: photo.height,
        photographer: photo.photographer,
        photographer_url: photo.photographer_url,
        hasAiInsights,
        saved: true,
      }
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching from Pexels:", error)
    return NextResponse.json({ error: "Failed to fetch saved products" }, { status: 500 })
  }
}
