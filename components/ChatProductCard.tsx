"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart, Plus, Share2, LinkIcon } from "lucide-react"
import type { Product } from "@/lib/types"
import CollectionModal from "./CollectionModal"
import { useSavedItems } from "@/lib/saved-items-context"

interface ChatProductCardProps {
  product: Product
}

export default function ChatProductCard({ product }: ChatProductCardProps) {
  // Use context instead of direct API calls
  const { isSaved, toggleSaved } = useSavedItems()
  const [showCollectionModal, setShowCollectionModal] = useState(false)

  const handleSaveToSaved = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      const success = await toggleSaved(product)
      if (success) {
        console.log(`Product ${isSaved(product.id) ? 'removed from' : 'added to'} saved successfully`)
      } else {
        console.error('Failed to update saved status')
      }
    } catch (error) {
      console.error('Error updating saved status:', error)
    }
  }

  const handleAddToCollection = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCollectionModal(true)
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (product.link) {
      window.open(product.link, '_blank', 'noopener,noreferrer')
    } else {
      console.log('No link available for this product')
    }
  }

  const handleProductClick = () => {
    if (product.link) {
      window.open(product.link, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <>
      <div
        className="bg-zinc-800 p-2 rounded-lg hover:bg-zinc-700 transition-colors group cursor-pointer relative"
        onClick={handleProductClick}
      >
        {/* Action buttons - positioned absolutely */}
        <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            className="p-1 rounded-full bg-black/60 backdrop-blur-sm hover:bg-white hover:text-black transition-colors"
            onClick={handleSaveToSaved}
            aria-label={isSaved(product.id) ? "Remove from saved" : "Save item"}
          >
            <Heart className="w-3 h-3" fill={isSaved(product.id) ? "currentColor" : "none"} strokeWidth={2} />
          </button>
          <button
            className="p-1 rounded-full bg-black/60 backdrop-blur-sm hover:bg-white hover:text-black transition-colors"
            onClick={handleAddToCollection}
            aria-label="Add to collection"
          >
            <Plus className="w-3 h-3" strokeWidth={2} />
          </button>
          <button
            className="p-1 rounded-full bg-black/60 backdrop-blur-sm hover:bg-white hover:text-black transition-colors"
            onClick={handleShare}
            aria-label="Share product"
          >
            <Share2 className="w-3 h-3" strokeWidth={2} />
          </button>
        </div>

        <div className="w-full aspect-square bg-zinc-700 rounded overflow-hidden relative mb-1.5">
          <Image
            src={product.image || "/placeholder.svg?width=96&height=80&query=fashion+item"}
            alt={product.title}
            fill
            className="object-cover"
          />
        </div>
        <p className="text-[10px] text-white font-medium line-clamp-2 group-hover:underline mb-1">
          {product.title}
        </p>
        <div className="flex flex-col">
          {product.price && product.price > 0 && (
            <p className="text-[10px] text-zinc-300">${product.price.toFixed(0)}</p>
          )}
          <div className="flex items-center justify-between mt-1">
            <LinkIcon className="w-2.5 h-2.5 text-zinc-500 group-hover:text-white" />
            <span className="text-[8px] text-zinc-500 group-hover:text-white">
              {product.link ? 'View' : 'No Link'}
            </span>
          </div>
        </div>
      </div>
      
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        product={product}
      />
    </>
  )
}
