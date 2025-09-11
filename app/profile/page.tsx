"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Settings,
  Grid,
  Heart,
  Filter,
  SlidersHorizontal,
  X,
  LogOut,
  Lock,
  Bell,
  Moon,
  HelpCircle,
  Package,
  Clock,
  CheckCircle,
  Truck,
  Calendar,
  Sparkles,
  Search,
  Share2,
  MoreHorizontal,
  Trash2,
  FolderPlus,
  Check as CheckIcon,
  MessageCircle,
  Edit3,
  Plus,
} from "lucide-react"
import ProductDetail from "@/components/ProductDetail"
import CollectionModal from "@/components/CollectionModal"
import CollectionDetailModal from "@/components/CollectionDetailModal"
import CreateCollectionModal from "@/components/CreateCollectionModal"
import BulkAddToCollectionModal from "@/components/BulkAddToCollectionModal"
import type { Product } from "@/lib/types"
import type { Collection, SavedItemWithMetadata } from "@/lib/profile-storage"
import { useMobile } from "@/hooks/use-mobile"
import { useSavedItems } from "@/lib/saved-items-context"
import Link from "next/link"

// Define a SavedItem type that extends Product with additional saved-specific properties
interface SavedItem extends Product {
  savedAt: string
  notes?: string
  collectionIds?: string[]
}

export default function ProfilePage() {
  // Use the saved items context with lazy loading
  const { savedItems, savedItemsWithMetadata, isLoading: loadingSavedItems, hasLoaded, loadSavedItems } = useSavedItems()
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false) // Prevent multiple simultaneous calls
  const [activeTab, setActiveTab] = useState("saved")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [sortOption, setSortOption] = useState("recent")
  const [showFilterOptions, setShowFilterOptions] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<(Collection & { items: Product[] }) | null>(null)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const [showCreateCollection, setShowCreateCollection] = useState(false)
  const [showBulkAddModal, setShowBulkAddModal] = useState(false)
  const isMobile = useMobile()

  // Mock purchases data
  const purchases = [
    {
      id: "order-123",
      date: "May 15, 2023",
      status: "Delivered",
      total: 189.99,
      items: [
        {
          id: "item-1",
          name: "Premium Black Shirt",
          price: 89.99,
          image: "/placeholder.svg?key=4u6vd",
          quantity: 1,
        },
        {
          id: "item-2",
          name: "Minimalist White Sneakers",
          price: 100.0,
          image: "/white-sneakers.png",
          quantity: 1,
        },
      ],
    },
    {
      id: "order-456",
      date: "April 28, 2023",
      status: "Delivered",
      total: 149.5,
      items: [
        {
          id: "item-3",
          name: "Designer Jeans",
          price: 149.5,
          image: "/placeholder.svg?key=yshio",
          quantity: 1,
        },
      ],
    },
    {
      id: "order-789",
      date: "March 12, 2023",
      status: "Delivered",
      total: 235.97,
      items: [
        {
          id: "item-4",
          name: "Leather Jacket",
          price: 199.99,
          image: "/classic-leather-jacket.png",
          quantity: 1,
        },
        {
          id: "item-5",
          name: "Cashmere Scarf",
          price: 35.98,
          image: "/cashmere-scarf.png",
          quantity: 1,
        },
      ],
    },
  ]

  // Mock saved items with high-quality images and proper data structure
  const mockSavedItems: SavedItem[] = [
    {
      id: "saved-1",
      image: "/placeholder.svg?key=iu3uu",
      title: "Premium Black Shirt",
      price: 89.99,
      brand: "Maison Noir",
      category: "Tops",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-05-15T14:30:00Z",
      collectionIds: ["col-2", "col-5"],
    },
    {
      id: "saved-2",
      image: "/placeholder.svg?key=l9idz",
      title: "Minimalist White Sneakers",
      price: 120,
      brand: "Essentials",
      category: "Shoes",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-05-10T09:15:00Z",
      collectionIds: ["col-1", "col-3"],
    },
    {
      id: "saved-3",
      image: "/placeholder.svg?key=xpfph",
      title: "Designer Slim Jeans",
      price: 149.5,
      brand: "Modern Atelier",
      category: "Bottoms",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-05-08T16:45:00Z",
      collectionIds: ["col-3"],
    },
    {
      id: "saved-4",
      image: "/placeholder.svg?key=cibkz",
      title: "Classic Leather Jacket",
      price: 199.99,
      brand: "Quartz Collection",
      category: "Outerwear",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-05-05T11:20:00Z",
      notes: "Perfect for fall weather",
      collectionIds: ["col-3", "col-4"],
    },
    {
      id: "saved-5",
      image: "/placeholder.svg?key=tvvgb",
      title: "Luxury Cashmere Scarf",
      price: 79.99,
      brand: "Minimalist",
      category: "Accessories",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-05-03T13:10:00Z",
      collectionIds: ["col-2", "col-4"],
    },
    {
      id: "saved-6",
      image: "/saved-items/dress-shirt.png",
      title: "Elegant Dress Shirt",
      price: 95,
      brand: "Maison Noir",
      category: "Tops",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-05-01T10:05:00Z",
      collectionIds: ["col-2"],
    },
    {
      id: "saved-7",
      image: "/saved-items/summer-dress.png",
      title: "Floral Summer Dress",
      price: 125,
      brand: "Modern Atelier",
      category: "Dresses",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-04-28T15:30:00Z",
      collectionIds: ["col-1", "col-4"],
    },
    {
      id: "saved-8",
      image: "/saved-items/watch.png",
      title: "Minimalist Chronograph Watch",
      price: 250,
      brand: "Essentials",
      category: "Accessories",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-04-25T09:45:00Z",
      collectionIds: ["col-5"],
    },
    {
      id: "saved-9",
      image: "/saved-items/sunglasses.png",
      title: "Designer Sunglasses",
      price: 175,
      brand: "Quartz Collection",
      category: "Accessories",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-04-22T14:20:00Z",
      collectionIds: ["col-1", "col-5"],
    },
    {
      id: "saved-10",
      image: "/saved-items/boots.png",
      title: "Premium Leather Boots",
      price: 220,
      brand: "Minimalist",
      category: "Shoes",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-04-20T11:15:00Z",
      collectionIds: ["col-2", "col-3"],
    },
    {
      id: "saved-11",
      image: "/saved-items/blazer.png",
      title: "Tailored Wool Blazer",
      price: 275,
      brand: "Maison Noir",
      category: "Outerwear",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-04-18T16:30:00Z",
      collectionIds: ["col-2", "col-4"],
    },
    {
      id: "saved-12",
      image: "/saved-items/handbag.png",
      title: "Structured Leather Handbag",
      price: 320,
      brand: "Modern Atelier",
      category: "Accessories",
      hasAiInsights: true,
      saved: true,
      savedAt: "2023-04-15T13:40:00Z",
      collectionIds: ["col-2", "col-4", "col-5"],
    },
  ]

  // Set loading state based on context
  useEffect(() => {
    setLoading(loadingSavedItems)
  }, [loadingSavedItems])

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0)

    console.log('[Profile] Component mounted, loading data...')

    // Load collections from API
    loadCollections()
    
    // LAZY LOAD saved items when profile page loads (Instagram-style)
    if (!hasLoaded && !loadingSavedItems) {
      console.log('[Profile] Triggering lazy load of saved items...')
      loadSavedItems()
    }
  }, []) // 🔥 FIXED: Empty dependency array prevents infinite loop

  const loadCollections = async () => {
    try {
      const response = await fetch('/api/collections')
      if (response.ok) {
        const collectionsData = await response.json()
        setCollections(collectionsData)
      } else {
        console.error('Failed to load collections')
      }
    } catch (error) {
      console.error('Error loading collections:', error)
    }
  }

  // Add this useEffect to handle mobile viewport height issues
  useEffect(() => {
    // Fix for mobile viewport height issues
    const setVh = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }

    setVh()
    window.addEventListener("resize", setVh)

    return () => {
      window.removeEventListener("resize", setVh)
    }
  }, [])

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleCloseDetail = () => {
    setSelectedProduct(null)
  }

  const tabs = [
    { id: "saved", label: "Saved", icon: Heart },
    { id: "purchases", label: "Purchases", icon: Package },
    { id: "collections", label: "Collections", icon: Grid },
  ]

  // Filter saved items based on category and search query
  const filteredItems = savedItemsWithMetadata.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Sort filtered items based on selected option
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortOption === "price-low") {
      return a.price - b.price
    } else if (sortOption === "price-high") {
      return b.price - a.price
    } else if (sortOption === "recent") {
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    }
    return 0
  })

  // Get status color based on order status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Delivered":
        return "text-green-400"
      case "Shipped":
        return "text-blue-400"
      case "Processing":
        return "text-yellow-400"
      case "Cancelled":
        return "text-red-400"
      default:
        return "text-zinc-400"
    }
  }

  // Get status icon based on order status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Delivered":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "Shipped":
        return <Truck className="w-4 h-4 text-blue-400" />
      case "Processing":
        return <Clock className="w-4 h-4 text-yellow-400" />
      case "Cancelled":
        return <X className="w-4 h-4 text-red-400" />
      default:
        return <Package className="w-4 h-4 text-zinc-400" />
    }
  }

  // Handle item selection for bulk actions
  const toggleItemSelection = (itemId: string) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter((id) => id !== itemId))
    } else {
      setSelectedItems([...selectedItems, itemId])
    }
  }

  // Check if all items are selected
  const allItemsSelected = sortedItems.length > 0 && selectedItems.length === sortedItems.length

  // Toggle selection of all items
  const toggleSelectAll = () => {
    if (allItemsSelected) {
      setSelectedItems([])
    } else {
      setSelectedItems(sortedItems.map((item) => item.id))
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      // Remove items from saved list via API
      for (const itemId of selectedItems) {
        const item = savedItems.find(item => item.id === itemId)
        if (item) {
          await fetch('/api/saved', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'remove',
              item: item
            })
          })
        }
      }
      
      // Refresh saved items from context
      await loadSavedItems()
      setSelectedItems([])
      setShowBulkActions(false)
    } catch (error) {
      console.error('Error deleting items:', error)
    }
  }

  // Format date for display
  const formatSavedDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  // Get collection color by ID
  const getCollectionColor = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId)
    return collection ? collection.color : "bg-zinc-500"
  }

  // Get collection name by ID
  const getCollectionName = (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId)
    return collection ? collection.name : ""
  }

  // Handle clicking on a collection to view its contents
  const handleCollectionClick = async (collection: Collection) => {
    try {
      const response = await fetch(`/api/collections/${collection.id}`)
      if (response.ok) {
        const items = await response.json()
        setSelectedCollection({
          ...collection,
          items: items
        })
      } else {
        console.error('Failed to load collection items')
      }
    } catch (error) {
      console.error('Error loading collection items:', error)
    }
  }

  // Close collection view
  const handleCloseCollection = () => {
    setSelectedCollection(null)
  }

  // Handle adding item to collection
  const handleAddToCollection = (product: Product) => {
    setCurrentProduct(product)
    setShowCollectionModal(true)
  }

  // Handle creating new collection
  const handleCreateNewCollection = (product?: Product) => {
    setCurrentProduct(product || null)
    setShowCreateCollection(true)
  }

  // Handle collection created
  const handleCollectionCreated = (newCollection: Collection) => {
    setCollections([newCollection, ...collections])
    loadCollections() // Refresh collections from server
  }

  // Handle collection updated
  const handleCollectionUpdated = (updatedCollection: Collection) => {
    setCollections(collections.map(col => 
      col.id === updatedCollection.id ? updatedCollection : col
    ))
    if (selectedCollection && selectedCollection.id === updatedCollection.id) {
      setSelectedCollection({
        ...updatedCollection,
        items: selectedCollection.items
      })
    }
  }

  // Handle collection deleted
  const handleCollectionDeleted = (collectionId: string) => {
    setCollections(collections.filter(col => col.id !== collectionId))
    if (selectedCollection && selectedCollection.id === collectionId) {
      setSelectedCollection(null)
    }
  }

  // Handle bulk add to collection
  const handleBulkAddToCollection = () => {
    if (selectedItems.length === 0) return
    const itemsToAdd = savedItems.filter(item => selectedItems.includes(item.id))
    setShowBulkAddModal(true)
  }

  // Handle bulk add completed
  const handleBulkAddCompleted = () => {
    setSelectedItems([])
    setShowBulkAddModal(false)
    loadCollections() // Refresh collections
  }

  return (
    <div className="min-h-screen pb-20" style={{ minHeight: "calc(var(--vh, 1vh) * 100)" }}>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-900 mr-3 sm:mr-4 overflow-hidden">
            <Image src="/flair-logo.png" alt="Profile" width={80} height={80} className="object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-medium truncate">Flair Dev</h2>
            <p className="text-zinc-400 text-xs sm:text-sm">@flairdev</p>
            <p className="text-xs sm:text-sm mt-1 truncate">shopping addict and reseller</p>
          </div>
          <Link
            href="/settings"
            className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors ml-2 touch-manipulation"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-white" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="flex space-x-6 mb-6">
          <div className="text-center">
            <p className="font-medium text-base sm:text-lg">124</p>
            <p className="text-zinc-400 text-[10px] sm:text-xs">Items</p>
          </div>
          <div className="text-center">
            <p className="font-medium text-base sm:text-lg">36</p>
            <p className="text-zinc-400 text-[10px] sm:text-xs">Orders</p>
          </div>
          <div className="text-center">
            <p className="font-medium text-base sm:text-lg">18</p>
            <p className="text-zinc-400 text-[10px] sm:text-xs">Lists</p>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-900 max-w-6xl mx-auto">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 relative flex flex-col items-center touch-manipulation ${
                  activeTab === tab.id ? "text-white" : "text-zinc-500"
                }`}
              >
                <Icon className="w-5 h-5 mb-1" strokeWidth={1.5} />
                <span className="text-xs">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32 max-w-6xl mx-auto">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          {activeTab === "saved" && (
            <div className="saved-items-container">
              {/* Search and Filter Bar */}
              <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-zinc-900">
                {/* Mobile-optimized search and filter bar */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search saved items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-900 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="appearance-none bg-zinc-900 rounded-full px-3 py-2 pr-8 text-xs sm:text-sm focus:outline-none touch-manipulation"
                        >
                          <option value="All">All Categories</option>
                          <option value="Tops">Tops</option>
                          <option value="Bottoms">Bottoms</option>
                          <option value="Dresses">Dresses</option>
                          <option value="Outerwear">Outerwear</option>
                          <option value="Shoes">Shoes</option>
                          <option value="Accessories">Accessories</option>
                        </select>
                        <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-400" />
                      </div>

                      <div className="relative">
                        <select
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value)}
                          className="appearance-none bg-zinc-900 rounded-full px-3 py-2 pr-8 text-xs sm:text-sm focus:outline-none touch-manipulation"
                        >
                          <option value="recent">Recent</option>
                          <option value="price-low">Price: Low-High</option>
                          <option value="price-high">Price: High-Low</option>
                        </select>
                        <SlidersHorizontal className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none text-zinc-400" />
                      </div>
                    </div>

                    <div className="flex bg-zinc-900 rounded-full p-0.5">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded-full touch-manipulation ${viewMode === "grid" ? "bg-zinc-800" : ""}`}
                        aria-label="Grid view"
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 rounded-full touch-manipulation ${viewMode === "list" ? "bg-zinc-800" : ""}`}
                        aria-label="List view"
                      >
                        <div className="w-4 h-4 flex flex-col justify-between">
                          <div className="h-[2px] w-full bg-current"></div>
                          <div className="h-[2px] w-full bg-current"></div>
                          <div className="h-[2px] w-full bg-current"></div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collection filters - mobile optimized */}
                <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs touch-manipulation ${
                      selectedCategory === "All" ? "bg-white text-black" : "bg-zinc-900 text-zinc-300"
                    }`}
                  >
                    All Items ({savedItems.length})
                  </button>
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs bg-zinc-900 text-zinc-300 flex items-center touch-manipulation`}
                    >
                      <span className={`w-2 h-2 rounded-full ${collection.color} mr-1.5`}></span>
                      {collection.name}
                    </button>
                  ))}
                </div>

                {/* Mobile-optimized bulk actions bar */}
                {selectedItems.length > 0 && (
                  <div className="px-4 py-2 bg-zinc-800 flex flex-wrap items-center justify-between gap-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={allItemsSelected}
                        onChange={toggleSelectAll}
                        className="mr-2 rounded-sm bg-zinc-700 border-zinc-600 touch-manipulation"
                      />
                      <span className="text-xs sm:text-sm">{selectedItems.length} selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center text-xs bg-red-900/50 hover:bg-red-900 text-red-300 px-2 py-1 rounded transition-colors touch-manipulation"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </button>
                      <button 
                        onClick={handleBulkAddToCollection}
                        className="flex items-center text-xs bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded transition-colors touch-manipulation"
                      >
                        <FolderPlus className="w-3 h-3 mr-1" />
                        Add to Collection
                      </button>
                      <button
                        onClick={() => setSelectedItems([])}
                        className="flex items-center text-xs bg-zinc-700 hover:bg-zinc-600 px-2 py-1 rounded transition-colors touch-manipulation"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {sortedItems.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-zinc-700" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">No saved items yet</h3>
                  <p className="text-zinc-400 mb-6">Items you save will appear here</p>
                  <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-white text-black rounded-lg font-medium touch-manipulation"
                  >
                    Discover Items
                  </Link>
                </div>
              ) : viewMode === "grid" ? (
                // Grid View - Mobile Optimized
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {sortedItems.map((item, index) => (
                    <div key={`${item.id}-${index}-${item.savedAt || ''}`} className="relative group">
                      <div
                        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-full border touch-manipulation ${
                          selectedItems.includes(item.id)
                            ? "bg-white border-white"
                            : "bg-black/50 border-zinc-500 group-hover:border-white"
                        } flex items-center justify-center`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleItemSelection(item.id)
                        }}
                      >
                        {selectedItems.includes(item.id) && <CheckIcon className="w-3 h-3 text-black" />}
                      </div>

                      <div
                        className="bg-zinc-900 rounded-lg overflow-hidden cursor-pointer h-full touch-manipulation group relative"
                        onClick={() => handleProductClick(item)}
                      >
                        <div className="aspect-[3/4] relative">
                          <Image
                            src={item.image || "/placeholder.svg"}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                            priority={sortedItems.indexOf(item) < 6} // Prioritize loading first 6 images
                          />
                          {item.hasAiInsights && (
                            <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full p-1.5 shadow-md">
                              <Sparkles className="w-3 h-3 text-white" strokeWidth={2} />
                            </div>
                          )}
                          
                          {/* Action overlay - appears on hover */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddToCollection(item)
                              }}
                              className="bg-white/90 hover:bg-white text-black px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center"
                            >
                              <FolderPlus className="w-4 h-4 mr-1" />
                              Add to Collection
                            </button>
                          </div>
                        </div>
                        <div className="p-2 sm:p-3">
                          <h3 className="text-xs sm:text-sm font-medium truncate">{item.title}</h3>
                          <p className="text-[10px] sm:text-xs text-zinc-400 truncate">{item.brand}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs sm:text-sm font-medium">${item.price}</p>
                            <p className="text-[10px] sm:text-xs text-zinc-500">{formatSavedDate(item.savedAt)}</p>
                          </div>
                          {item.collectionIds && item.collectionIds.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {item.collectionIds.slice(0, 2).map((colId) => (
                                <div
                                  key={colId}
                                  className={`w-2 h-2 rounded-full ${getCollectionColor(colId)}`}
                                  title={getCollectionName(colId)}
                                ></div>
                              ))}
                              {item.collectionIds.length > 2 && (
                                <div className="w-2 h-2 rounded-full bg-zinc-400 flex items-center justify-center text-[8px] text-black">
                                  +{item.collectionIds.length - 2}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute top-2 right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100">
                        <button className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-white hover:text-black transition-colors touch-manipulation">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-white hover:text-black transition-colors touch-manipulation">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // List View - Mobile Optimized
                <div className="p-4 space-y-3">
                  {sortedItems.map((item, index) => (
                    <div
                      key={`${item.id}-${index}-list-${item.savedAt || ''}`}
                      className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex">
                        <div className="flex items-center pl-2 sm:pl-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="rounded-sm bg-zinc-800 border-zinc-700 touch-manipulation"
                          />
                        </div>
                        <div
                          className="flex flex-1 cursor-pointer touch-manipulation"
                          onClick={() => handleProductClick(item)}
                        >
                          <div className="w-16 h-16 sm:w-24 sm:h-24 relative">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 64px, 96px"
                              priority={sortedItems.indexOf(item) < 4} // Prioritize loading first 4 images
                            />
                          </div>
                          <div className="p-2 sm:p-3 flex-1 min-w-0">
                            <div className="flex justify-between">
                              <div className="min-w-0 flex-1 pr-2">
                                <h3 className="text-xs sm:text-sm font-medium truncate">{item.title}</h3>
                                <p className="text-[10px] sm:text-xs text-zinc-400 truncate">{item.brand}</p>
                                <p className="text-xs sm:text-sm font-medium mt-1">${item.price}</p>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <p className="text-[10px] sm:text-xs text-zinc-500">{formatSavedDate(item.savedAt)}</p>
                                {item.category && (
                                  <span className="inline-block mt-1 text-[8px] sm:text-[10px] bg-zinc-800 text-zinc-300 px-1.5 sm:px-2 py-0.5 rounded-full">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.collectionIds && item.collectionIds.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.collectionIds.slice(0, isMobile ? 1 : 3).map((colId) => (
                                  <div
                                    key={colId}
                                    className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] ${getCollectionColor(
                                      colId,
                                    )} bg-opacity-20 text-white truncate max-w-[80px] sm:max-w-none`}
                                  >
                                    {getCollectionName(colId)}
                                  </div>
                                ))}
                                {isMobile && item.collectionIds.length > 1 && (
                                  <div className="px-1.5 py-0.5 rounded-full text-[8px] bg-zinc-700 text-zinc-300">
                                    +{item.collectionIds.length - 1}
                                  </div>
                                )}
                                {!isMobile && item.collectionIds.length > 3 && (
                                  <div className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-700 text-zinc-300">
                                    +{item.collectionIds.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col justify-center pr-2 sm:pr-3 space-y-2">
                          <button className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors touch-manipulation">
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors touch-manipulation">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "purchases" && (
            <div className="p-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Your Orders</h3>
                <p className="text-xs sm:text-sm text-zinc-400">View and track your recent purchases</p>
              </div>

              <div className="space-y-4">
                {purchases.map((order) => (
                  <div key={order.id} className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
                    <div className="p-3 sm:p-4 border-b border-zinc-800 flex justify-between items-center">
                      <div>
                        <div className="flex items-center">
                          <Calendar className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-zinc-400 mr-1.5 sm:mr-2" />
                          <span className="text-xs sm:text-sm text-zinc-300">{order.date}</span>
                        </div>
                        <div className="flex items-center mt-1">
                          <Package className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-zinc-400 mr-1.5 sm:mr-2" />
                          <span className="text-[10px] sm:text-xs text-zinc-400">Order #{order.id}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center">
                          {getStatusIcon(order.status)}
                          <span className={`text-xs sm:text-sm ml-1.5 ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-medium mt-1">${order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="p-3 sm:p-4">
                      <div className="space-y-3">
                        {order.items.map((item, itemIndex) => (
                          <div key={`${item.id}-order-${itemIndex}`} className="flex items-center">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-800 rounded-lg overflow-hidden relative mr-2 sm:mr-3">
                              <Image
                                src={item.image || "/placeholder.svg"}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-medium truncate">{item.name}</h4>
                              <p className="text-[10px] sm:text-xs text-zinc-400">Qty: {item.quantity}</p>
                              <p className="text-xs sm:text-sm">${item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex space-x-2">
                              <button className="text-[10px] sm:text-xs text-zinc-400 hover:text-white transition-colors touch-manipulation">
                                Buy Again
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 bg-zinc-800/50 flex flex-wrap gap-2 justify-between items-center">
                      <button className="text-xs sm:text-sm text-zinc-300 hover:text-white transition-colors touch-manipulation">
                        View Details
                      </button>
                      <div className="flex space-x-2">
                        <button className="text-[10px] sm:text-xs bg-zinc-800 hover:bg-zinc-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors touch-manipulation">
                          Track Order
                        </button>
                        <button className="text-[10px] sm:text-xs bg-white text-black px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg touch-manipulation">
                          Leave Review
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <button className="text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors touch-manipulation">
                  View All Orders
                </button>
              </div>
            </div>
          )}

          {activeTab === "collections" && (
            <div className="p-4">
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-lg font-medium">Your Collections</h3>
                <button 
                  onClick={() => handleCreateNewCollection()}
                  className="bg-zinc-900 hover:bg-zinc-800 text-sm px-3 py-1.5 rounded-lg transition-colors touch-manipulation"
                >
                  + New Collection
                </button>
              </div>

              {collections.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FolderPlus className="w-8 h-8 text-zinc-700" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">No collections yet</h3>
                  <p className="text-zinc-400 mb-6">Create collections to organize your favorite items</p>
                  <button
                    onClick={() => handleCreateNewCollection()}
                    className="inline-block px-6 py-3 bg-white text-black rounded-lg font-medium touch-manipulation"
                  >
                    Create Your First Collection
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections.map((collection) => (
                    <div
                      key={collection.id}
                      className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer touch-manipulation group"
                      onClick={() => handleCollectionClick(collection)}
                    >
                      {/* Collection Banner */}
                      <div className="h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
                        {collection.customBanner ? (
                          // Show custom banner if available
                          <Image
                            src={collection.customBanner}
                            alt={collection.name}
                            fill
                            className="object-cover"
                          />
                        ) : collection.itemIds.length > 0 ? (
                          // Show product images as fallback
                          <div className="grid grid-cols-2 h-full">
                            {savedItems
                              .filter((item) => collection.itemIds.includes(item.id))
                              .slice(0, 4)
                              .map((item, index) => (
                                <div key={`${item.id}-collection-preview-${index}`} className="relative">
                                  <Image
                                    src={item.image || "/placeholder.svg"}
                                    alt={item.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ))}
                          </div>
                        ) : (
                          // Show default icon if no banner and no items
                          <div className="flex items-center justify-center h-full">
                            <div className={`w-12 h-12 rounded-full ${collection.color} flex items-center justify-center`}>
                              <FolderPlus className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        )}
                        
                        {/* Collection overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        
                        {/* Collection info */}
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="flex items-center mb-1">
                            <div className={`w-2 h-2 rounded-full ${collection.color} mr-2`} />
                            <h4 className="text-sm font-medium text-white truncate">{collection.name}</h4>
                          </div>
                          <p className="text-xs text-zinc-300">
                            {collection.itemIds.length} item{collection.itemIds.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Collection Actions */}
                      <div className="p-3 flex justify-between items-center">
                        <span className="text-xs text-zinc-400">
                          Click to view collection
                        </span>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors touch-manipulation"
                            onClick={(e) => {
                              e.stopPropagation()
                              // Handle ask chat about this collection
                              const collectionSummary = {
                                name: collection.name,
                                description: "",
                                totalItems: collection.itemIds.length,
                                items: savedItems
                                  .filter(item => collection.itemIds.includes(item.id))
                                  .map(item => ({
                                    id: item.id,
                                    title: item.title,
                                    brand: item.brand,
                                    price: item.price,
                                    category: item.category,
                                    image: item.image,
                                    description: item.description
                                  }))
                              }
                              const collectionData = encodeURIComponent(JSON.stringify(collectionSummary))
                              window.open(`/chat?collection=${collectionData}`, '_blank')
                            }}
                            title="Ask Chat about this collection"
                          >
                            <MessageCircle className="w-3 h-3 text-zinc-400" />
                          </button>
                          <button 
                            className="p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors touch-manipulation"
                            onClick={(e) => e.stopPropagation()}
                            title="Collection settings"
                          >
                            <MoreHorizontal className="w-3 h-3 text-zinc-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50 text-center">
                <Grid className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <h4 className="text-sm font-medium mb-1">Create Custom Collections</h4>
                <p className="text-xs text-zinc-400 mb-3">Organize your favorite items into themed collections</p>
                <button 
                  onClick={() => handleCreateNewCollection()}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors touch-manipulation"
                >
                  Get Started
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        product={currentProduct!}
      />

      <CollectionDetailModal
        collection={selectedCollection}
        isOpen={!!selectedCollection}
        onClose={handleCloseCollection}
        onUpdate={handleCollectionUpdated}
        onDelete={handleCollectionDeleted}
      />

      <CreateCollectionModal
        isOpen={showCreateCollection}
        onClose={() => setShowCreateCollection(false)}
        onCollectionCreated={handleCollectionCreated}
        preselectedItem={currentProduct}
      />

      <BulkAddToCollectionModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        selectedItems={savedItems.filter(item => selectedItems.includes(item.id))}
        onItemsAdded={handleBulkAddCompleted}
      />

      {selectedProduct && <ProductDetail product={selectedProduct} onClose={handleCloseDetail} />}
    </div>
  )
}
