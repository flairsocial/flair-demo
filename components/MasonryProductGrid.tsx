"use client"

import { motion } from "framer-motion"
import ProductCard from "@/components/ProductCard"
import type { Product } from "@/lib/types"
import { useEffect, useState } from "react"

interface MasonryProductGridProps {
  products: Product[]
  onProductClick: (product: Product) => void
}

export default function MasonryProductGrid({ products, onProductClick }: MasonryProductGridProps) {
  const [uniqueProducts, setUniqueProducts] = useState<Product[]>([])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    // Ensure products is an array before filtering
    if (!Array.isArray(products)) {
      console.warn('Products prop is not an array:', products)
      setUniqueProducts([])
      return
    }

    // Filter out duplicate products by ID
    const seenIds = new Set()
    const filtered = products.filter((product) => {
      if (!product || !product.id || seenIds.has(product.id)) {
        return false
      }
      seenIds.add(product.id)
      return true
    })

    setUniqueProducts(filtered)
  }, [products])

  // Assign heights for masonry layout - smaller on mobile to prevent horizontal scroll
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

  return (
    <div className="px-3 pt-3 pb-20 md:pb-8 w-full overflow-x-hidden">
      <div className="masonry-grid w-full">
        {uniqueProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="masonry-item w-full"
            style={{ height: `${getRandomHeight(index)}px` }}
          >
            <ProductCard product={product} onClick={() => onProductClick(product)} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
