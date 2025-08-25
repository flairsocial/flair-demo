"use client"

import { useState, useEffect } from "react"
import MasonryProductGrid from "@/components/MasonryProductGrid"
import CategoryFilter from "@/components/CategoryFilter"
import SearchBar from "@/components/SearchBar"
import ProductDetail from "@/components/ProductDetail"
import type { Product } from "@/lib/types"
// Removed Sparkles and motion as AI banner is removed

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  // Removed showAIBanner state
  const [hasInitialLoad, setHasInitialLoad] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchProducts()

    const urlParams = new URLSearchParams(window.location.search)
    const productId = urlParams.get("product")

    if (productId) {
      fetchProductById(productId)
    }
  }, [])

  useEffect(() => {
    if (hasInitialLoad && (searchQuery || selectedCategory !== "All")) {
      fetchProducts(searchQuery, selectedCategory)
    }
  }, [searchQuery, selectedCategory, hasInitialLoad])

  const fetchProducts = async (query = "", category = "All") => {
    setLoading(true)
    try {
      let url = "/api/products"
      const params = new URLSearchParams()

      if (query) params.append("query", query)
      if (category !== "All") params.append("category", category)
      params.append("limit", "50")

      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url)
      const data = await response.json()
      setProducts(data)
      setHasInitialLoad(true)
    } catch (error) {
      console.error("Error fetching products:", error)
      setHasInitialLoad(true)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductById = async (id: string) => {
    try {
      const response = await fetch(`/api/products/${id}`)
      if (response.ok) {
        const product = await response.json()
        setSelectedProduct(product)
      }
    } catch (error) {
      console.error("Error fetching product by ID:", error)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleCloseDetail = () => {
    setSelectedProduct(null)
    const url = new URL(window.location.href)
    url.searchParams.delete("product")
    window.history.replaceState({}, "", url)
  }

  return (
    <div className="min-h-screen w-full">
      <div className="sticky top-0 z-10 bg-black pt-0 pb-2 px-3 sm:px-4 border-b border-zinc-900">
        <div className="py-3">
          <SearchBar onSearch={handleSearch} />
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <CategoryFilter activeCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
        </div>
      </div>

      {/* AI Analysis Banner Removed */}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="w-full">
          <MasonryProductGrid products={products} onProductClick={handleProductClick} />
        </div>
      )}

      {selectedProduct && <ProductDetail product={selectedProduct} onClose={handleCloseDetail} />}
    </div>
  )
}
