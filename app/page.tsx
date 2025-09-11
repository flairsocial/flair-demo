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
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0) // For style rotation

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
    } else if (hasInitialLoad && !searchQuery && selectedCategory === "All") {
      // When search is cleared, fetch random products
      console.log('[Discover] Search cleared, fetching random products')
      fetchProducts("", "All")
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

      // Enhanced query building with comprehensive profile context
      let enhancedQuery = query
      
      // For "All" category with no search query, use profile preferences to enhance search
      if (!query && category === "All" && profileLoaded && profile) {
        console.log('[Discover] Building profile-aware search query')
        
        // Apply gender-specific search (except for Beauty, Tech, Collectables)
        const genderNeutralCategories = ['Beauty', 'Tech', 'Collectables']
        const useGenderFilter = !genderNeutralCategories.includes(category)
        
        let genderTerm = ""
        if (useGenderFilter && profile.gender && profile.gender !== "Prefer not to say") {
          genderTerm = profile.gender.toLowerCase() === "male" ? "men" : 
                     profile.gender.toLowerCase() === "female" ? "women" : ""
        }
        
        // Rotate through style preferences on refresh for variety
        let styleTerm = ""
        if (profile.style && profile.style.length > 0) {
          if (isRefresh) {
            // Advance to next style in rotation
            const nextIndex = (currentStyleIndex + 1) % profile.style.length
            setCurrentStyleIndex(nextIndex)
            styleTerm = profile.style[nextIndex]
          } else {
            styleTerm = profile.style[currentStyleIndex] || profile.style[0]
          }
        }
        
        // Build the search query with profile context
        const searchParts = []
        if (genderTerm) searchParts.push(genderTerm)
        if (styleTerm) searchParts.push(styleTerm)
        
        // Add appropriate product category based on gender and style
        if (genderTerm && styleTerm) {
          const productTypes = ['clothing', 'apparel', 'fashion', 'outfit', 'wear']
          const randomType = productTypes[Math.floor(Math.random() * productTypes.length)]
          searchParts.push(randomType)
        } else if (styleTerm) {
          searchParts.push('fashion')
        } else {
          // Fallback to general trending items
          searchParts.push('trending', 'popular')
        }
        
        enhancedQuery = searchParts.join(' ')
        console.log(`[Discover] Enhanced query: "${enhancedQuery}" (gender: ${genderTerm}, style: ${styleTerm})`)
      }

      if (enhancedQuery) params.append("query", enhancedQuery)
      if (category !== "All") params.append("category", category)
      params.append("limit", "50")
      
      // Pass profile context for budget/measurement filtering
      if (profileLoaded && profile) {
        const profileContext = getSearchContext()
        if (profileContext) {
          params.append("profileContext", profileContext)
        }
      }
      
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
            <SearchBar onSearch={handleSearch} initialValue={searchQuery} />
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
