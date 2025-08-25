"use client"
import { motion } from "framer-motion"
import ProductCard from "@/components/ProductCard"
import type { Product } from "@/lib/types"

// Add a className prop to allow custom styling
interface ProductGridProps {
  products: Product[]
  onProductClick: (product: Product) => void
  className?: string
}

export default function ProductGrid({ products, onProductClick, className = "" }: ProductGridProps) {
  return (
    <div className={`px-4 pt-4 pb-20 md:pb-8 ${className}`}>
      <div className="product-grid">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="h-full"
          >
            <ProductCard product={product} onClick={() => onProductClick(product)} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
