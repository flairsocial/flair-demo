"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Heart, Plus, Share2 } from "lucide-react"
import type { Product } from "@/lib/types"
import CollectionModal from "./CollectionModal"
import { useSavedItems } from "@/lib/saved-items-context"
import { useAnalytics } from "@/lib/hooks/useAnalytics"

interface ProductCardProps {
  product: Product
  onClick: () => void
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const { checkIfSaved, addSavedItem, removeSavedItem } = useSavedItems()
  const { trackClick, trackSave, trackUnsave } = useAnalytics()
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)

  const placeholderImage = "/placeholder.svg?height=600&width=400"
  const initialImageSrc = product.image || placeholderImage
  const [currentImageSrc, setCurrentImageSrc] = useState(initialImageSrc)

  // Check if saved using context (no API call needed!)
  const isSaved = checkIfSaved(product.id)

  useEffect(() => {
    // Reset image state when product prop changes
    setCurrentImageSrc(product.image || placeholderImage)
    setIsImageLoading(false) // No automatic scraping, so loading is false
  }, [product.image, product.id])

  const handleSaveToSaved = async (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('[ProductCard] Save clicked:', product.id)
    
    try {
      if (isSaved) {
        console.log('[ProductCard] Unsaving product:', product.id)
        await removeSavedItem(product.id)
        trackUnsave(product.id)
      } else {
        console.log('[ProductCard] Saving product:', product.id)
        await addSavedItem(product)
        trackSave(product.id, product)
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
      // Open the product link in a new tab
      window.open(product.link, '_blank', 'noopener,noreferrer')
    } else {
      console.log('No link available for this product')
    }
  }

  const handleCardClick = () => {
    console.log('[ProductCard] Clicked:', product.id)
    trackClick(product.id)
    onClick()
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer group h-full"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-full bg-zinc-900">
        <Image
          key={currentImageSrc} // Force re-render if src changes, especially on error fallback
          src={currentImageSrc || "/placeholder.svg"}
          alt={product.title || "Fashion item"}
          fill
          sizes="(max-width: 480px) 140px, (max-width: 640px) 160px, (max-width: 768px) 180px, (max-width: 1024px) 200px, (max-width: 1280px) 220px, 240px"
          className="object-cover rounded-xl"
          onLoad={() => {
            setIsImageLoading(false)
          }}
          onError={() => {
            // If the current image fails, fallback to placeholder
            if (currentImageSrc !== placeholderImage) {
              setCurrentImageSrc(placeholderImage)
            }
            setIsImageLoading(false)
          }}
        />

  <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/70 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none sm:group-hover:pointer-events-auto">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-white text-sm font-medium truncate">{product.title}</p>
            <div className="flex justify-between items-center mt-1">
              <p className="text-zinc-300 text-xs">{product.brand}</p>
              <p className="text-white text-xs font-medium">${product.price}</p>
            </div>
            {product.category && (
              <div className="mt-1.5">
                <span className="text-[10px] bg-zinc-800/80 text-zinc-300 px-2 py-0.5 rounded-full">
                  {product.category}
                </span>
              </div>
            )}
          </div>
        </div>

  <div className="absolute top-2 right-2 flex flex-col space-y-1.5 sm:space-y-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
          <button
            className="p-1 sm:p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-white hover:text-black transition-colors shadow-md flex items-center justify-center"
            onClick={handleSaveToSaved}
            aria-label={isSaved ? "Remove from saved" : "Save item"}
          >
            <Heart className="w-3 h-3 sm:w-4 sm:h-4" fill={isSaved ? "currentColor" : "none"} strokeWidth={2} />
          </button>
          <button
            className="p-1 sm:p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-white hover:text-black transition-colors shadow-md flex items-center justify-center"
            onClick={handleAddToCollection}
            aria-label="Add to collection"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2} />
          </button>
          <button
            className="p-1 sm:p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-white hover:text-black transition-colors shadow-md flex items-center justify-center"
            onClick={handleShare}
            aria-label="Share product"
          >
            <Share2 className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
      
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        product={product}
      />
    </div>
  )
}
