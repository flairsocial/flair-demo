"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Heart } from "lucide-react"
import type { Product } from "@/lib/types"

interface ProductCardProps {
  product: Product
  onClick: () => void
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const [liked, setLiked] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [isHovered, setIsHovered] = useState(false)

  const placeholderImage = "/placeholder.svg?height=600&width=400"
  const initialImageSrc = product.image || placeholderImage
  const [currentImageSrc, setCurrentImageSrc] = useState(initialImageSrc)

  useEffect(() => {
    // Reset image state when product prop changes
    setCurrentImageSrc(product.image || placeholderImage)
    setIsImageLoading(true)

    let isMounted = true

    const fetchHighResImage = async () => {
      if (product.link) {
        try {
          const response = await fetch(`/api/scrape-image?url=${encodeURIComponent(product.link)}`)
          if (!response.ok) {
            console.warn(
              `Failed to fetch high-res image for ${product.title}: Server responded with ${response.status}`,
            )
            // Fallback to original image is implicitly handled as currentImageSrc is already set to it.
            if (isMounted) setIsImageLoading(false) // Stop loading if API fails early
            return
          }
          const data = await response.json()
          if (isMounted && data.image && typeof data.image === "string") {
            // Preload the new image before setting it, to ensure onLoad fires correctly
            const img = new window.Image()
            img.src = data.image
            img.onload = () => {
              if (isMounted) {
                setCurrentImageSrc(data.image)
                setIsImageLoading(false) // Will be set by Image's onLoad, but good for safety
              }
            }
            img.onerror = () => {
              if (isMounted) {
                console.warn(`High-res image URL failed to load: ${data.image} for ${product.title}`)
                // Fallback to original image
                setCurrentImageSrc(product.image || placeholderImage)
                setIsImageLoading(false)
              }
            }
          } else {
            if (isMounted) setIsImageLoading(false) // No high-res image found or invalid
          }
        } catch (error) {
          if (isMounted) {
            console.error(`Error fetching high-res image for ${product.title}:`, error)
            // Fallback to original image is implicitly handled.
            setIsImageLoading(false)
          }
        }
      } else {
        if (isMounted) setIsImageLoading(false) // No link provided, cannot fetch high-res
      }
    }

    fetchHighResImage()

    return () => {
      isMounted = false
    }
  }, [product.link, product.image, product.title]) // Re-run if product link or initial image changes

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLiked(!liked)
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer group h-full"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-full bg-zinc-900">
        {isImageLoading && <div className="absolute inset-0 bg-zinc-900 animate-pulse rounded-xl" />}
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
            // If the currentImageSrc (attempted high-res) fails, fallback to the original product.image
            if (currentImageSrc !== (product.image || placeholderImage)) {
              setCurrentImageSrc(product.image || placeholderImage)
            }
            setIsImageLoading(false) // Ensure loading animation stops
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/70 opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 rounded-xl">
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

        <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-white hover:text-black transition-colors shadow-md"
            onClick={handleLike}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart className="w-4 h-4" fill={liked ? "currentColor" : "none"} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
