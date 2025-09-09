"use client"

import React, { useState } from "react"
import Image from "next/image"
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
      
      // Call API to analyze URL and extract product information
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      })
      
      if (response.ok) {
        const productData = await response.json()
        return productData
      }
      
      return null
    } catch (error) {
      console.error('Error processing URL:', error)
      return null
    } finally {
      setIsProcessingUrl(false)
    }
  }

  // Handle click on attachment
  const handleClick = async () => {
    if (!clickable) return
    
    if (file.type === 'product' && file.metadata) {
      // Open product detail directly
      setShowProductDetail(true)
    } else if (file.type === 'url' && file.url) {
      // Process URL and open as product
      const productData = await processUrlAsProduct(file.url)
      if (productData) {
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
        // Fallback - open URL in new tab
        window.open(file.url, '_blank', 'noopener,noreferrer')
      }
    } else if (file.type === 'image' && file.url) {
      // For images, create a basic product-like structure for viewing
      const imageProduct: Product = {
        id: file.id,
        title: file.name,
        image: file.url || file.preview || '/placeholder.svg',
        price: 0,
        brand: 'Unknown',
        category: 'Image',
        description: 'Uploaded image for analysis',
        hasAiInsights: true,
        saved: false
      }
      file.metadata = imageProduct
      setShowProductDetail(true)
    }
  }

  // Convert file to product format for ProductDetail
  const getProductFromFile = (): Product | null => {
    if (file.metadata && file.type === 'product') {
      return file.metadata as Product
    }
    
    if (file.type === 'image' && file.metadata) {
      return file.metadata as Product
    }
    
    if (file.type === 'url' && file.metadata) {
      return file.metadata as Product
    }
    
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
        onClick={handleClick}
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
          {/* For URL attachments, try to show product image if processed */}
          {file.type === 'url' && file.metadata?.image && file.metadata.image !== '/placeholder.svg' ? (
            <Image
              src={file.metadata.image}
              alt={file.metadata.title || file.name}
              fill
              className="object-cover"
            />
          ) : file.preview || (file.type !== 'url' && file.url) ? (
            <Image
              src={file.preview || file.url}
              alt={file.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {getFileIcon()}
            </div>
          )}
          
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

      {/* Product Detail Modal */}
      {showProductDetail && getProductFromFile() && (
        <ProductDetail
          product={getProductFromFile()!}
          onClose={() => setShowProductDetail(false)}
        />
      )}
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
