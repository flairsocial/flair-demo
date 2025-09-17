"use client"

import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"
import MasonryProductGrid from "@/components/MasonryProductGrid"
import CategoryFilter from "@/components/CategoryFilter"
import SearchBar from "@/components/SearchBar"
import ProductDetail from "@/components/ProductDetail"
import { useProfile } from "@/lib/profile-context"
import { useCredits } from "@/lib/credit-context"
import { showOutOfCreditsModal } from "@/components/CreditGuard"
import type { Product } from "@/lib/types"

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Get profile context for personalized product search
  const { getSearchContext, profile, isLoaded: profileLoaded } = useProfile()
  const { useCredits: consumeCredits, checkCreditsAvailable } = useCredits()

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchProducts()

    const urlParams = new URLSearchParams(window.location.search)
    const productId = urlParams.get("product")

    if (productId) {
      fetchProductById(productId)
    }
  }, [])

  // Refresh products when profile changes (for better personalization)
  useEffect(() => {
    if (profileLoaded && hasInitialLoad && selectedCategory === "All" && !searchQuery) {
      console.log('[Discover] Profile changed, refreshing products for better personalization')
      fetchProducts("", "All")
    }
  }, [profile, profileLoaded, hasInitialLoad])

  useEffect(() => {
    if (hasInitialLoad && (searchQuery || selectedCategory !== "All")) {
      fetchProducts(searchQuery, selectedCategory)
    }
  }, [searchQuery, selectedCategory, hasInitialLoad])

  const fetchProducts = async (query = "", category = "All", isRefresh = false) => {
    // Check credits before making any request (except initial load)
    if ((query || category !== "All" || isRefresh) && !checkCreditsAvailable(1)) {
      showOutOfCreditsModal()
      return
    }
    
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    
    try {
      let url = "/api/products"
      const params = new URLSearchParams()

      // Enhanced query building with profile context
      let enhancedQuery = query
      
      // For "All" category with no search query, use profile preferences to enhance search
      if (!query && category === "All") {
        const profileContext = getSearchContext()
        if (profileContext) {
          // Extract style preferences from profile context
          const styleMatch = profileContext.match(/Style preferences: ([^.]+)/)
          const budgetMatch = profileContext.match(/Budget: ([^.]+)/)
          
          if (styleMatch && styleMatch[1]) {
            enhancedQuery = styleMatch[1].split(',')[0].trim() + " fashion clothing"
          }
          
          console.log('[Discover] Enhanced query for "All" tab with profile:', enhancedQuery)
        }
      }

      if (enhancedQuery) params.append("query", enhancedQuery)
      if (category !== "All") params.append("category", category)
      params.append("limit", "50")
      
      // Add a timestamp to force fresh data on refresh
      if (isRefresh) params.append("t", Date.now().toString())

      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url)
      const data = await response.json()
      
      // Check if credits were used and deduct them
      const creditsUsedHeader = response.headers.get('X-Credits-Used')
      if (creditsUsedHeader) {
        const creditsUsed = parseInt(creditsUsedHeader)
        // Product searches consume 1 credit each (builds up to 10 after 10-15 searches)
        if (!consumeCredits(creditsUsed)) {
          showOutOfCreditsModal()
          return // Exit early if not enough credits
        }
      }
      
      // Ensure we always set an array to products state
      if (Array.isArray(data)) {
        setProducts(data)
      } else {
        console.error("Invalid products data received:", data)
        setProducts([])
      }
      setHasInitialLoad(true)
    } catch (error) {
      console.error("Error fetching products:", error)
      setHasInitialLoad(true)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchProducts(searchQuery, selectedCategory, true)
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
        <div className="py-3 flex items-center gap-3">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Refresh products"
          >
            <RefreshCw 
              className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} 
              strokeWidth={1.5} 
            />
          </button>
        </div>
        <div className="overflow-x-auto scrollbar-hide px-1">
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
