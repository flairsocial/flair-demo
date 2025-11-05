"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import MasonryProductGrid from "@/components/MasonryProductGrid"
import SearchAndCategories from "@/components/SearchAndCategories"
import ProductDetail from "@/components/ProductDetail"
import { useProfile } from "@/lib/profile-context"
import { useCredits } from "@/lib/credit-context"
import { useProfileEnhancedSearch } from "@/hooks/use-profile-enhanced-search"
import { useShoppingMode } from "@/lib/shopping-mode-context"
import { showOutOfCreditsModal } from "@/components/CreditGuard"
import { useProducts } from "@/lib/react-query-hooks"
import type { Product } from "@/lib/types"
import { useFeed } from "@/lib/hooks/useFeed"
import { useAnalytics } from "@/lib/hooks/useAnalytics"

export default function Home() {
  // UI State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [isHeaderSticky, setIsHeaderSticky] = useState(false)
  
  // Product state management - keep all existing state
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const [lastQuery, setLastQuery] = useState("")
  const [lastCategory, setLastCategory] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Refs for infinite scroll and request management
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadingRef = useRef<HTMLDivElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Get profile context for personalized product search
  const { getSearchContext, profile, isLoaded: profileLoaded } = useProfile()
  const { useCredits: consumeCredits, checkCreditsAvailable } = useCredits()
  const { mode: shoppingMode } = useShoppingMode()
  const { 
    getDiscoverQuery, 
    isProfileConfigured,
    currentStyle,
    hasMultipleStyles,
    hasGender 
  } = useProfileEnhancedSearch()

  // React Query hooks for caching only - use when available
  const { data: cachedProducts, isLoading: cacheLoading } = useProducts(searchQuery, selectedCategory, page)
  // Disabled until API endpoints exist:
  // const { data: trending } = useTrendingProducts()
  // const { data: categories } = useCategories()
  
  // Phase 1 Recommendation System hooks
  const { impression_id, session_id, items: feedItems, generateFeed, loading: feedLoading } = useFeed()
  const { trackClick, trackSave, trackUnsave, trackChatOpen } = useAnalytics()

  // Track sticky header state
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 64
      setIsHeaderSticky(scrolled)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    fetchInitialProducts()
    
    // Generate feed for Phase 1 recommendation system
    console.log('[Discovery] Generating recommendation feed')
    generateFeed('discovery', 20).catch((error) => {
      console.error('[Discovery] Feed generation failed:', error)
    })

    const urlParams = new URLSearchParams(window.location.search)
    const productId = urlParams.get("product")

    if (productId) {
      fetchProductById(productId)
    }
  }, [])

  // Reset pagination when search query or category changes
  useEffect(() => {
    if (hasInitialLoad && (searchQuery !== lastQuery || selectedCategory !== lastCategory)) {
      setProducts([])
      setPage(1)
      setHasMore(true)
      setLastQuery(searchQuery)
      setLastCategory(selectedCategory)
      fetchProducts(searchQuery, selectedCategory, 1, true)
    }
  }, [searchQuery, selectedCategory, hasInitialLoad]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (loading || !hasMore) return

    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && !loadingMore && hasMore) {
          loadMoreProducts()
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '200px' // Start loading 200px before reaching the bottom
      }
    )

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loading, loadingMore, hasMore, page])

  const buildQueryForDiscovery = useCallback((query: string, category: string, isRefresh: boolean = false) => {
    let enhancedQuery = query

    // For "All" category with no search query, use HIGH-QUALITY designer products by default
    if (!query && category === "All") {
      // Premium, high-end fashion keywords - no trending/fast fashion
      const highQualityQueries = [
        "designer fashion high-end",
        "best old money fashion",
        "premium designer clothing",
        "high-end fashion designer pieces",
        "fashion limited run",
        "signature designer collection timeless",
        "high quality fashion"
      ]

      // Use profile-enhanced query only if user has configured preferences
      if (isProfileConfigured && profileLoaded && profile) {
        enhancedQuery = getDiscoverQuery(isRefresh)
        console.log('[Discover] Using profile-enhanced query:', enhancedQuery, {
          isRefresh,
          currentStyle,
          isProfileConfigured,
          profileLoaded
        })
      } else {
        // Default to high-quality products for new users
        const queryIndex = isRefresh ? Math.floor(Math.random() * highQualityQueries.length) : 0
        enhancedQuery = highQualityQueries[queryIndex]
        console.log('[Discover] Using high-quality default query:', enhancedQuery, {
          isRefresh,
          isProfileConfigured,
          profileLoaded,
          hasProfile: !!profile
        })
      }
    }

    return enhancedQuery
  }, [getDiscoverQuery, currentStyle, isProfileConfigured, profileLoaded, profile])

  const fetchProducts = useCallback(async (
    query = "", 
    category = "All", 
    pageNum = 1, 
    isReset = false,
    isRefresh = false
  ) => {
    // Check cache first if available
    if (cachedProducts && !isRefresh && pageNum === 1) {
      setProducts(cachedProducts as Product[])
      setHasInitialLoad(true)
      return
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    abortControllerRef.current = new AbortController()

    // Check credits before making any request (except initial load)
    if ((query || category !== "All" || isRefresh || pageNum > 1) && !checkCreditsAvailable(1)) {
      showOutOfCreditsModal()
      return
    }
    
    if (isRefresh) {
      setIsRefreshing(true)
    } else if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    
    try {
      let url = "/api/products"
      const params = new URLSearchParams()

      const enhancedQuery = buildQueryForDiscovery(query, category, isRefresh)

      if (enhancedQuery) params.append("query", enhancedQuery)
      if (category !== "All") params.append("category", category)
      if (shoppingMode !== "default") params.append("shoppingMode", shoppingMode)
      
      // Optimize batch sizes: smaller initial load, larger subsequent loads
      const limit = pageNum === 1 ? 20 : 15
      params.append("limit", limit.toString())
      params.append("page", pageNum.toString())
      
      // Add variety to subsequent pages by slightly modifying the query (no trending)
      if (pageNum > 1 && enhancedQuery) {
        const variations = [
          enhancedQuery + " collection",
          enhancedQuery + " pieces",
          enhancedQuery + " exclusive",
          enhancedQuery + " premium",
          enhancedQuery + " designer"
        ]
        const variation = variations[(pageNum - 2) % variations.length]
        params.set("query", variation)
      }
      
      // Add a timestamp to force fresh data on refresh
      if (isRefresh) params.append("t", Date.now().toString())

      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Check if credits were used and deduct them
      const creditsUsedHeader = response.headers.get('X-Credits-Used')
      if (creditsUsedHeader) {
        const creditsUsed = parseInt(creditsUsedHeader)
        if (!consumeCredits(creditsUsed)) {
          showOutOfCreditsModal()
          return
        }
      }
      
      // Ensure we always get an array
      const newProducts = Array.isArray(data) ? data : []
      
      if (isReset || pageNum === 1) {
        setProducts(newProducts)
      } else {
        // Filter out duplicates when appending
        setProducts(prevProducts => {
          const existingIds = new Set(prevProducts.map(p => p.id))
          const uniqueNewProducts = newProducts.filter(p => !existingIds.has(p.id))
          return [...prevProducts, ...uniqueNewProducts]
        })
      }
      
      // Update pagination state
      setPage(pageNum + 1)
      setHasMore(newProducts.length > 0)
      setHasInitialLoad(true)
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted')
        return
      }
      console.error("Error fetching products:", error)
      setHasInitialLoad(true)
      if (pageNum === 1) {
        setProducts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setIsRefreshing(false)
    }
  }, [buildQueryForDiscovery, checkCreditsAvailable, shoppingMode, cachedProducts])

  const fetchInitialProducts = useCallback(() => {
    // Force high-quality query for initial load
    const highQualityQuery = "luxury designer fashion boutique exclusive"
    console.log('[Discover] Initial load with high-quality query:', highQualityQuery)
    fetchProducts(highQualityQuery, "All", 1, true)
  }, [fetchProducts])

  const loadMoreProducts = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchProducts(searchQuery, selectedCategory, page, false)
    }
  }, [fetchProducts, loadingMore, hasMore, loading, searchQuery, selectedCategory, page])

  const handleRefresh = useCallback(() => {
    console.log('[Discover] Refreshing with style rotation')
    setProducts([])
    setPage(1)
    setHasMore(true)
    fetchProducts(searchQuery, selectedCategory, 1, true, true)
  }, [searchQuery, selectedCategory, fetchProducts])

  const fetchProductById = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`)
      if (response.ok) {
        const product = await response.json()
        setSelectedProduct(product)
      }
    } catch (error) {
      console.error("Error fetching product:", error)
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
    
    // Track product click for Phase 1
    console.log('[Discovery] Product clicked:', { product_id: product.id, impression_id, session_id })
    trackClick(product.id, impression_id, session_id)
  }

  const handleCloseDetail = () => {
    setSelectedProduct(null)
    const url = new URL(window.location.href)
    url.searchParams.delete("product")
    window.history.replaceState({}, "", url)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  return (
    <div className="min-h-screen w-full">
      {/* Search and categories - sticky component */}
      <SearchAndCategories
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        loading={loading}
        isRefreshing={isRefreshing}
        onSearch={handleSearch}
        onCategoryChange={handleCategoryChange}
        onRefresh={handleRefresh}
      />

      {/* Style rotation indicator - only show for All category with no search and profile configured */}
      {!searchQuery && selectedCategory === "All" && isProfileConfigured && (currentStyle || hasGender) && (
        <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/50">
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
            <span>Personalized for:</span>
            {hasGender && (
              <>
                <span className="text-white font-medium">{profile.gender}</span>
                {currentStyle && <span>•</span>}
              </>
            )}
            {currentStyle && (
              <span className="text-white font-medium">{currentStyle}</span>
            )}
            {hasMultipleStyles && (
              <>
                <span>•</span>
                <span>Tap refresh to rotate styles</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content area - add padding when header is fixed */}
      <div className={`w-full ${isHeaderSticky ? 'pt-[120px]' : ''} transition-all duration-200`}>
        {loading && products.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="w-full">
            <MasonryProductGrid products={products} onProductClick={handleProductClick} />
            
            {/* Infinite scroll loading indicator */}
            {hasMore && (
              <div 
                ref={loadingRef}
                className="flex justify-center items-center h-20 py-4"
              >
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
                    <span className="text-sm">Loading more products...</span>
                  </div>
                ) : (
                  <div className="text-zinc-500 text-sm">Scroll to load more</div>
                )}
              </div>
            )}
            
            {/* End of results indicator */}
            {!hasMore && products.length > 0 && (
              <div className="flex justify-center items-center h-20 py-4">
                <div className="text-zinc-500 text-sm">You've reached the end! 🎉</div>
              </div>
            )}
            
            {/* Empty state */}
            {!loading && products.length === 0 && (
              <div className="flex flex-col justify-center items-center h-64 text-center px-4">
                <div className="text-zinc-400 text-lg mb-2">No products found</div>
                <div className="text-zinc-500 text-sm">Try adjusting your search or category filters</div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedProduct && <ProductDetail product={selectedProduct} onClose={handleCloseDetail} />}
    </div>
  )
}
