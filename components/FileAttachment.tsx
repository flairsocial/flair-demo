"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { createPortal } from "react-dom"
import { X, FileText, Link as LinkIcon, ShoppingBag, ImageIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { ChatFile } from "@/lib/file-context"
import ProductDetail from "./ProductDetail"
import type { Product } from "@/lib/types"

interface FileAttachmentProps {
  file: ChatFile
  onRemove?: (fileId: string) => void
  showRemove?: boolean
  size?: "sm" | "md" | "lg"
  clickable?: boolean // New prop to enable clicking
}

export default function FileAttachment({ 
  file, 
  onRemove, 
  showRemove = true,
  size = "md",
  clickable = false
}: FileAttachmentProps) {
  const [showProductDetail, setShowProductDetail] = useState(false)
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component is mounted (client-side) before using portals
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24", 
    lg: "w-32 h-32"
  }

  const getFileIcon = () => {
    switch (file.type) {
      case "product":
        return <ShoppingBag className="w-5 h-5 text-blue-400" />
      case "image": 
        return <ImageIcon className="w-5 h-5 text-green-400" />
      case "url":
        return <LinkIcon className="w-5 h-5 text-purple-400" />
      case "document":
        return <FileText className="w-5 h-5 text-yellow-400" />
      default:
        return <FileText className="w-5 h-5 text-gray-400" />
    }
  }

  const getTypeColor = () => {
    switch (file.type) {
      case "product": return "border-blue-500/30 bg-blue-500/10"
      case "image": return "border-green-500/30 bg-green-500/10" 
      case "url": return "border-purple-500/30 bg-purple-500/10"
      case "document": return "border-yellow-500/30 bg-yellow-500/10"
      default: return "border-gray-500/30 bg-gray-500/10"
    }
  }

  // Convert URL to product for display
  const processUrlAsProduct = async (url: string): Promise<Product | null> => {
    try {
      setIsProcessingUrl(true)
      
      console.log('[FileAttachment] Processing URL:', url)
      
      // Call API to analyze URL and extract product information
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, includeRealTimeData: true })
      })
      
      if (response.ok) {
        const productData = await response.json()
        console.log('[FileAttachment] Received product data:', {
          title: productData.title,
          image: productData.image ? 'Found' : 'Missing',
          price: productData.price
        })
        return productData
      } else {
        console.error('[FileAttachment] API error:', response.status, response.statusText)
      }
      
      return null
    } catch (error) {
      console.error('[FileAttachment] Error processing URL:', error)
      return null
    } finally {
      setIsProcessingUrl(false)
    }
  }

  // Handle click on attachment
  const handleClick = async (e?: React.MouseEvent) => {
    if (!clickable) return
    
    // Prevent event bubbling
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    console.log('[FileAttachment] Handling click on file:', {
      type: file.type,
      name: file.name,
      url: file.url,
      hasMetadata: !!file.metadata
    })
    
    if (file.type === 'product' && file.metadata) {
      // Open product detail directly
      console.log('[FileAttachment] Opening product detail for product file')
      setShowProductDetail(true)
    } else if (file.type === 'url' && file.url) {
      // Process URL and open as product
      console.log('[FileAttachment] Processing URL for product data:', file.url)
      
      // If already processed, open directly
      if (file.metadata?.title && file.metadata?.price !== undefined) {
        console.log('[FileAttachment] URL already processed, opening ProductDetail')
        setShowProductDetail(true)
        return
      }
      
      const productData = await processUrlAsProduct(file.url)
      if (productData) {
        console.log('[FileAttachment] Successfully processed URL, got product:', {
          title: productData.title,
          image: productData.image,
          price: productData.price
        })
        
        // Update file metadata with processed product data
        file.metadata = {
          title: productData.title,
          price: productData.price,
          brand: productData.brand,
          description: productData.description,
          category: productData.category,
          link: productData.link,
          productId: productData.id,
          image: productData.image // Store the extracted image
        }
        setShowProductDetail(true)
      } else {
        console.log('[FileAttachment] Could not process URL as product, opening in new tab')
        // Fallback - open URL in new tab
        window.open(file.url, '_blank', 'noopener,noreferrer')
      }
    } else if (file.type === 'image' && file.url) {
      // For images, try to create a product-like structure if metadata exists
      console.log('[FileAttachment] Handling image file click')
      
      if (file.metadata && (file.metadata.title || file.metadata.price)) {
        // Image has product metadata, treat as product
        console.log('[FileAttachment] Image has product metadata, opening as product')
        setShowProductDetail(true)
      } else {
        // Basic image viewing - but also try to make it more product-like
        console.log('[FileAttachment] Creating basic product structure for image')
        file.metadata = {
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          description: 'Uploaded image - ask AI to analyze this item or find similar products',
          category: 'Image Analysis',
          image: file.preview || file.url,
          link: file.url
        }
        setShowProductDetail(true)
      }
    } else {
      console.log('[FileAttachment] Unsupported file type or missing URL:', file.type)
    }
  }

  // Convert file to product format for ProductDetail
  const getProductFromFile = (): Product | null => {
    console.log('[FileAttachment] Converting file to product:', {
      type: file.type,
      hasMetadata: !!file.metadata,
      name: file.name,
      url: file.url,
      preview: file.preview
    })

    // First check if metadata already contains a complete product
    if (file.metadata && typeof file.metadata === 'object') {
      const metadata = file.metadata as any
      if (metadata.id || metadata.title) {
        const product: Product = {
          id: metadata.id || file.id,
          title: metadata.title || file.name,
          image: metadata.image || file.preview || file.url || '/placeholder-product.jpg',
          price: metadata.price || 0,
          brand: metadata.brand || 'Unknown',
          category: metadata.category,
          description: metadata.description,
          link: metadata.link || file.url,
          reviews: metadata.reviews ? {
            rating: metadata.reviews.rating || 0,
            count: metadata.reviews.count || 0
          } : undefined,
          availability: {
            inStock: true,
            shipping: 'Standard',
            delivery: 'Available'
          },
          realTimeData: {
            lastUpdated: new Date().toISOString(),
            sourceUrl: file.url,
            confidence: 0.8,
            extractedAt: new Date().toISOString()
          }
        }
        
        console.log('[FileAttachment] Built product from metadata:', {
          title: product.title,
          image: product.image,
          price: product.price
        })
        
        return product
      }
    }
    
    // For product files, build product from file properties and metadata
    if (file.type === 'product' || file.type === 'url') {
      const metadata = (file.metadata || {}) as any
      
      const product: Product = {
        id: file.id,
        title: metadata.title || file.name,
        image: metadata.image || file.preview || file.url || '/placeholder-product.jpg',
        price: metadata.price || 0,
        brand: metadata.brand || 'Unknown',
        category: metadata.category || (file.type === 'url' ? 'Web Product' : 'Product'),
        description: metadata.description || 'Product found via URL analysis. Click "Ask AI about this item" or "Find Similar Items" below for more insights.',
        link: metadata.link || file.url,
        hasAiInsights: true, // Enable AI insights for URL-sourced products
        reviews: metadata.reviews ? {
          rating: metadata.reviews.rating || 0,
          count: metadata.reviews.count || 0
        } : {
          rating: 4.2,
          count: 50
        },
        availability: {
          inStock: true,
          shipping: 'Standard',
          delivery: 'Available'
        },
        realTimeData: {
          lastUpdated: new Date().toISOString(),
          sourceUrl: file.url,
          confidence: 0.8,
          extractedAt: new Date().toISOString()
        }
      }

      console.log('[FileAttachment] Built product from file:', {
        title: product.title,
        image: product.image,
        price: product.price,
        type: file.type,
        hasAiInsights: product.hasAiInsights
      })

      return product
    }
    
    // For image files that might represent products
    if (file.type === 'image') {
      const metadata = (file.metadata || {}) as any
      
      const product: Product = {
        id: file.id,
        title: metadata.title || file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        image: file.preview || file.url || '/placeholder-product.jpg',
        price: metadata.price || 0,
        brand: metadata.brand || 'Unknown',
        category: metadata.category || 'Image Analysis',
        description: metadata.description || 'Uploaded image for analysis. Click "Ask AI about this item" to get product insights and find similar items.',
        link: metadata.link || file.url,
        hasAiInsights: true, // Enable AI insights for image analysis
        reviews: {
          rating: 4.0,
          count: 25
        },
        availability: {
          inStock: true,
          shipping: 'Standard',
          delivery: 'Available'
        },
        realTimeData: {
          lastUpdated: new Date().toISOString(),
          sourceUrl: file.url,
          confidence: 0.6,
          extractedAt: new Date().toISOString()
        }
      }

      console.log('[FileAttachment] Built product from image file:', {
        title: product.title,
        image: product.image,
        hasAiInsights: product.hasAiInsights
      })

      return product
    }
    
    console.log('[FileAttachment] Could not convert file to product - unsupported type:', file.type)
    return null
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`relative ${sizeClasses[size]} rounded-lg border-2 ${getTypeColor()} overflow-hidden group ${
          clickable ? 'cursor-pointer hover:scale-105 transition-transform' : ''
        } ${isProcessingUrl ? 'opacity-50' : ''}`}
        onClick={(e) => handleClick(e)}
      >
        {/* Remove button */}
        {showRemove && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(file.id)
            }}
            className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        )}

        {/* File preview */}
        <div className="w-full h-full relative">
          {/* Smart image display logic */}
          {(() => {
            // For URL attachments, prioritize processed product image
            if (file.type === 'url' && file.metadata?.image && 
                file.metadata.image !== '/placeholder.svg' && 
                file.metadata.image !== '/placeholder-product.jpg') {
              console.log('[FileAttachment] Displaying URL product image:', file.metadata.image)
              return (
                <Image
                  src={file.metadata.image}
                  alt={file.metadata.title || file.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    console.log('[FileAttachment] Failed to load metadata image:', file.metadata?.image)
                    // Fallback to icon display
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )
            }
            
            // For product files, use metadata image
            if (file.type === 'product' && file.metadata?.image &&
                file.metadata.image !== '/placeholder.svg' && 
                file.metadata.image !== '/placeholder-product.jpg') {
              console.log('[FileAttachment] Displaying product image:', file.metadata.image)
              return (
                <Image
                  src={file.metadata.image}
                  alt={file.metadata.title || file.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    console.log('[FileAttachment] Failed to load product image:', file.metadata?.image)
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )
            }
            
            // For image files or files with previews
            if (file.preview || (file.type === 'image' && file.url)) {
              const imageSrc = file.preview || file.url
              console.log('[FileAttachment] Displaying preview/image:', imageSrc)
              return (
                <Image
                  src={imageSrc}
                  alt={file.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    console.log('[FileAttachment] Failed to load preview image:', imageSrc)
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )
            }
            
            // Fallback to icon
            console.log('[FileAttachment] No suitable image found, showing icon for:', file.type)
            return (
              <div className="w-full h-full flex items-center justify-center">
                {getFileIcon()}
              </div>
            )
          })()}
          
          {/* Loading overlay for URL processing */}
          {isProcessingUrl && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          
          {/* Overlay with file info */}
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
            <div className="flex items-center space-x-1 mb-1">
              {getFileIcon()}
              <span className="text-xs font-medium text-white truncate">
                {file.type.charAt(0).toUpperCase() + file.type.slice(1)}
              </span>
            </div>
            <p className="text-xs text-white/80 truncate">
              {file.name}
            </p>
            {file.metadata?.price && (
              <p className="text-xs text-green-400 font-medium">
                ${file.metadata.price}
              </p>
            )}
            {clickable && (
              <p className="text-xs text-blue-400 font-medium mt-1">
                Click to view
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Product Detail Modal - Rendered at document body level using portal */}
      {showProductDetail && getProductFromFile() && isMounted && 
        createPortal(
          <ProductDetail
            product={getProductFromFile()!}
            onClose={() => {
              console.log('[FileAttachment] Closing ProductDetail modal')
              setShowProductDetail(false)
            }}
          />,
          document.body
        )
      }
    </>
  )
}

interface FileAttachmentListProps {
  files: ChatFile[]
  onRemove?: (fileId: string) => void
  showRemove?: boolean
  size?: "sm" | "md" | "lg"
  maxDisplay?: number
  clickable?: boolean // New prop
}

export function FileAttachmentList({ 
  files, 
  onRemove, 
  showRemove = true, 
  size = "md",
  maxDisplay,
  clickable = false
}: FileAttachmentListProps) {
  const displayFiles = maxDisplay ? files.slice(0, maxDisplay) : files
  const remainingCount = maxDisplay && files.length > maxDisplay ? files.length - maxDisplay : 0

  if (files.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence>
        {displayFiles.map((file) => (
          <FileAttachment
            key={file.id}
            file={file}
            onRemove={onRemove}
            showRemove={showRemove}
            size={size}
            clickable={clickable}
          />
        ))}
      </AnimatePresence>
      
      {remainingCount > 0 && (
        <div className={`${size === "sm" ? "w-16 h-16" : size === "md" ? "w-24 h-24" : "w-32 h-32"} rounded-lg border-2 border-dashed border-zinc-600 flex items-center justify-center`}>
          <span className="text-xs text-zinc-400">+{remainingCount}</span>
        </div>
      )}
    </div>
  )
}
