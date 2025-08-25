"use client"

import { motion } from "framer-motion"

interface CategoryFilterProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

export default function CategoryFilter({ activeCategory, onCategoryChange }: CategoryFilterProps) {
  const categories = ["All", "Tops", "Bottoms", "Dresses", "Shoes", "Accessories", "Outerwear"]

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex space-x-2 pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className="relative whitespace-nowrap px-3 py-1.5 rounded-full text-xs"
          >
            {activeCategory === category && (
              <motion.div
                layoutId="categoryBackground"
                className="absolute inset-0 bg-white rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className={`relative z-10 ${activeCategory === category ? "text-black" : "text-zinc-400"}`}>
              {category}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
