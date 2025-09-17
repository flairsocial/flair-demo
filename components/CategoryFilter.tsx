"use client"

import { motion } from "framer-motion"
import { useMobile } from "@/hooks/use-mobile"

interface CategoryFilterProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

export default function CategoryFilter({ activeCategory, onCategoryChange }: CategoryFilterProps) {
  const isMobile = useMobile()
  const categories = [
    "All", 
    "Tops", 
    "Bottoms", 
    "Dresses", 
    "Shoes", 
    "Accessories", 
    "Outerwear",
    "Beauty",
    "Tech"
  ]

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className={`flex pb-2 ${isMobile ? 'space-x-2 min-w-max' : 'space-x-2'}`}>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`relative whitespace-nowrap rounded-full flex-shrink-0 ${isMobile ? 'px-4 py-2 text-xs' : 'px-3 py-1.5 text-xs'}`}
          >
            {activeCategory === category && (
              <motion.div
                layoutId="categoryBackground"
                className="absolute inset-0 bg-white rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className={`relative z-10 font-medium ${activeCategory === category ? "text-black" : "text-zinc-400"}`}>
              {category}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
