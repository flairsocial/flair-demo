"use client"

import { motion } from "framer-motion"
import ProductCard from "@/components/ProductCard"
import type { Product } from "@/lib/types"
import { useEffect, useState, useMemo, useRef } from "react"

interface MasonryProductGridProps {
  products: Product[]
  onProductClick: (product: Product) => void
}

interface PositionedProduct extends Product {
  uniqueKey: string
  x: number
  y: number
  height: number
  columnWidth: number
  isNew?: boolean
}

export default function MasonryProductGrid({ products, onProductClick }: MasonryProductGridProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [positionedProducts, setPositionedProducts] = useState<PositionedProduct[]>([])
  const [containerHeight, setContainerHeight] = useState(0)
  const previousProductsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Memoize unique products to prevent unnecessary re-filtering and fix duplicate key errors
  const uniqueProducts = useMemo(() => {
    // Ensure products is an array before filtering
    if (!Array.isArray(products)) {
      console.warn('Products prop is not an array:', products)
      return []
    }

    // Filter out duplicate products by ID and ensure each product has a unique key
    const seenIds = new Set()
    const filtered = products.filter((product, index) => {
      if (!product || !product.id || seenIds.has(product.id)) {
        return false
      }
      seenIds.add(product.id)
      return true
    })

    // Add a unique key combining id and index to prevent React key conflicts
    return filtered.map((product, index) => ({
      ...product,
      uniqueKey: `${product.id}-${index}`
    }))
  }, [products])

  // Get random height for masonry layout - smaller on mobile to prevent horizontal scroll
  const getRandomHeight = (index: number) => {
    if (isMobile) {
      // Smaller, more consistent heights on mobile
      const heights = [140, 160, 180, 200]
      return heights[index % heights.length]
    }

    if (window.innerWidth >= 640 && window.innerWidth < 1024) {
      const heights = [180, 220, 260, 300]
      return heights[index % heights.length]
    }

    // Desktop
    const heights = [220, 260, 300, 340, 380]
    return heights[index % heights.length]
  }

  // Calculate masonry positions
  useEffect(() => {
    if (!uniqueProducts.length) {
      setPositionedProducts([])
      setContainerHeight(0)
      previousProductsRef.current.clear()
      return
    }

    const columns = isMobile ? 2 : window.innerWidth >= 1024 ? 5 : 4
    const gap = 12 // gap between items
    const padding = isMobile ? 24 : 32 // px-3 = 12px each side on mobile, px-4 = 16px each side on desktop
    const sidebarWidth = isMobile ? 0 : 64 // md:ml-16 = 64px sidebar offset on desktop
    const containerWidth = window.innerWidth - padding - sidebarWidth
    const columnWidth = (containerWidth - (gap * (columns - 1))) / columns

    // Initialize column heights
    const columnHeights = new Array(columns).fill(0)
    const newPositioned: PositionedProduct[] = []

    // Track which products are new
    const currentProductIds = new Set(uniqueProducts.map(p => p.uniqueKey))
    const previousProductIds = previousProductsRef.current

    uniqueProducts.forEach((product, index) => {
      const height = getRandomHeight(index)
      
      // Find the shortest column
      let shortestColumnIndex = 0
      let shortestColumnHeight = columnHeights[0]
      
      for (let i = 1; i < columns; i++) {
        if (columnHeights[i] < shortestColumnHeight) {
          shortestColumnHeight = columnHeights[i]
          shortestColumnIndex = i
        }
      }

      // Calculate position
      const x = shortestColumnIndex * (columnWidth + gap)
      const y = columnHeights[shortestColumnIndex]

      // Mark as new if not in previous products
      const isNew = !previousProductIds.has(product.uniqueKey)

      newPositioned.push({
        ...product,
        x,
        y,
        height,
        columnWidth, // Store the column width for rendering
        isNew
      })

      // Update column height
      columnHeights[shortestColumnIndex] += height + gap
    })

    // Update container height to the tallest column
    const maxHeight = Math.max(...columnHeights)
    setContainerHeight(maxHeight)
    setPositionedProducts(newPositioned)

    // Update previous products ref
    previousProductsRef.current = currentProductIds
  }, [uniqueProducts, isMobile])

  return (
    <div className="px-3 pt-3 pb-20 md:pb-8 w-full overflow-x-hidden masonry-container">
      <div 
        className="relative w-full"
        style={{ height: `${containerHeight}px` }}
      >
        {positionedProducts.map((product, index) => (
          <motion.div
            key={product.uniqueKey}
            initial={product.isNew ? { opacity: 0, y: 20 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={product.isNew ? { delay: 0.1, duration: 0.3 } : { duration: 0 }}
            className="absolute"
            style={{
              left: `${product.x}px`,
              top: `${product.y}px`,
              width: `${product.columnWidth}px`,
              height: `${product.height}px`
            }}
          >
            <ProductCard product={product} onClick={() => onProductClick(product)} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
