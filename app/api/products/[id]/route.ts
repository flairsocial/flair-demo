import { NextResponse } from "next/server"
import type { Product } from "@/lib/types"

// Pexels API key
const PEXELS_API_KEY = "zyLNTRqx0I8nZWQSjBtOn0qXyoPyaayAE4qmGYwdlilOz9V1gpvwnCcH"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id

  try {
    // Fetch the specific photo from Pexels API
    const response = await fetch(`https://api.pexels.com/v1/photos/${id}`, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    })

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`)
    }

    const photo = await response.json()

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

    // Product has AI insights
    const hasAiInsights = true

    const product: Product = {
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
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 })
  }
}
