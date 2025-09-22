"use client"

import { useSavedItems } from "@/lib/saved-items-context"
import ProductCard from "./ProductCard"
import { useRouter } from "next/navigation"

export default function SavedItemsGrid() {
  const { savedItems, isLoading } = useSavedItems()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
      </div>
    )
  }

  if (savedItems.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 text-lg mb-2">No saved items yet</p>
        <p className="text-zinc-500 text-sm">Start exploring and save items you love!</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
        >
          Explore Products
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {savedItems.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => router.push(`/products/${product.id}`)}
        />
      ))}
    </div>
  )
}
