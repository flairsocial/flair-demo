"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Heart, Share2, Sparkles, MessageCircle, X, Plus } from "lucide-react"
import type { Product } from "@/lib/types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AnalyzeWithAIButton from "./AnalyzeWithAIButton"
import AIAnalysis from "./AIAnalysis"
import CollectionModal from "./CollectionModal"
import { useFiles } from "@/lib/file-context"
import { useAnalytics } from "@/lib/hooks/useAnalytics"

interface ProductDetailProps {
  product: Product
  onClose: () => void
}

export default function ProductDetail({ product, onClose }: ProductDetailProps) {
  const [liked, setLiked] = useState(false)
  const [selectedSize, setSelectedSize] = useState("")
  const [showAiInsights, setShowAiInsights] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const [isFromUrlOrImage, setIsFromUrlOrImage] = useState(false)
  const router = useRouter()
  const { addProductAsFile } = useFiles()
  const { trackChatOpen } = useAnalytics()

  const additionalImages = [
    product.image,
    `/placeholder.svg?height=600&width=400&query=fashion model wearing ${product.category} side view`,
    `/placeholder.svg?height=600&width=400&query=fashion model wearing ${product.category} back view`,
  ]

  useEffect(() => {
    document.body.style.overflow = "hidden"
    
    // Check if product is already saved/liked
    checkIfSaved()
    
    // Check if this product is from URL or image attachment
    const fromUrlOrImage = (product.id?.startsWith('url-') || false) || 
                          product.category === 'Image' || 
                          product.category === 'Link' ||
                          (product.description?.includes('Uploaded image') || false) ||
                          (product.description?.includes('from http') || false)
    
    setIsFromUrlOrImage(fromUrlOrImage)
    
    // Auto-add product to file context if it's from URL or image
    // This ensures the chat system can reference it for similar product searches
    if (fromUrlOrImage) {
      console.log('[ProductDetail] Auto-adding URL/image product to file context:', product.title)
      addProductAsFile(product)
    }
    
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [product, addProductAsFile])

  const checkIfSaved = async () => {
    try {
      const response = await fetch('/api/saved')
      if (response.ok) {
        const savedItems = await response.json()
        const isProductSaved = savedItems.some((item: Product) => item.id === product.id)
        setLiked(isProductSaved)
      }
    } catch (error) {
      console.error('Error checking saved status:', error)
    }
  }

  const handleLike = async () => {
    try {
      const action = liked ? 'remove' : 'add'
      const response = await fetch('/api/saved', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          item: product
        })
      })

      if (response.ok) {
        setLiked(!liked)
        console.log(`Product ${action}ed successfully`)
      } else {
        console.error('Failed to update saved status')
      }
    } catch (error) {
      console.error('Error updating saved status:', error)
    }
  }

  const handleAddToCollection = () => {
    setShowCollectionModal(true)
  }

  const handleShare = () => {
    const productLink = product.link || (product as any).url
    if (productLink) {
      // Open the product link in a new tab
      window.open(productLink, '_blank', 'noopener,noreferrer')
    } else {
      console.log('No link available for this product')
    }
  }

  const toggleAiInsights = () => {
    setShowAiInsights(!showAiInsights)
  }

  const handleAnalyzeWithAI = () => {
    setShowAIAnalysis(true)
  }

  const handleAskAIAboutItem = () => {
    console.log('[ProductDetail] Ask AI about item clicked - adding product to files')
    // Track chat open for Phase 1
    console.log('[ProductDetail] Chat opened for product:', product.id)
    trackChatOpen(product.id)
    
    // Add product as file attachment first
    addProductAsFile(product)
    
    // Close the product detail modal
    onClose()
    
    // Small delay to ensure file context is updated, then navigate
    setTimeout(() => {
      console.log('[ProductDetail] Navigating to chat')
      router.push('/chat')
    }, 100)
  }

  const handleAskAIAnalysis = () => {
    console.log('[ProductDetail] Ask AI analysis clicked - adding product to files')
    // Track chat open for Phase 1
    console.log('[ProductDetail] Chat opened for product:', product.id)
    trackChatOpen(product.id)
    
    // Add product as file attachment first
    addProductAsFile(product)
    
    // Close the product detail modal
    onClose()
    
    // Small delay to ensure file context is updated, then navigate
    setTimeout(() => {
      console.log('[ProductDetail] Navigating to chat with auto-message')
      router.push('/chat?autoMessage=' + encodeURIComponent('Is this worth it? Please show me similar competitors and analyze this product for value and quality.'))
    }, 100)
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-black w-full max-w-md h-full overflow-y-auto md:h-auto md:max-h-[90vh] md:rounded-xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <div className="sticky top-0 z-10 w-full p-4 flex justify-between items-center bg-black/70 backdrop-blur-md">
              <button onClick={onClose} className="p-2 rounded-full bg-black/40 backdrop-blur-sm" aria-label="Close">
                <X className="w-5 h-5 text-white" strokeWidth={1.5} />
              </button>

              <div className="flex space-x-2">
                <button
                  className="p-2 rounded-full bg-black/40 backdrop-blur-sm"
                  onClick={handleLike}
                  aria-label={liked ? "Remove from saved" : "Save item"}
                >
                  <Heart className="w-5 h-5 text-white" fill={liked ? "white" : "none"} strokeWidth={1.5} />
                </button>
                <button
                  className="p-2 rounded-full bg-black/40 backdrop-blur-sm"
                  onClick={handleAddToCollection}
                  aria-label="Add to collection"
                >
                  <Plus className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>
                <button 
                  className="p-2 rounded-full bg-black/40 backdrop-blur-sm" 
                  onClick={handleShare}
                  aria-label="Share product"
                >
                  <Share2 className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="px-2">
              <div className="relative aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden">
                <Image
                  src={additionalImages[selectedImage] || "/placeholder.svg"}
                  alt={product.title || "Fashion item"}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute bottom-4 right-4">
                  <AnalyzeWithAIButton onClick={handleAnalyzeWithAI} variant="floating" size="md" />
                </div>
              </div>

              {/* Ask AI about this item button - directly below image */}
              <div className="mt-3 mb-2">
                <button
                  onClick={handleAskAIAboutItem}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-zinc-900 border border-zinc-700 rounded-lg text-white hover:bg-zinc-800 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-sm font-medium">Ask AI about this item</span>
                </button>
              </div>

              <div className="flex justify-center mt-2 space-x-2">
                {additionalImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-12 h-12 rounded-md overflow-hidden border-2 ${
                      selectedImage === index ? "border-white" : "border-transparent"
                    }`}
                  >
                    <div className="relative w-full h-full">
                      <Image src={img || "/placeholder.svg"} alt={`View ${index + 1}`} fill className="object-cover" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h2 className="text-xl font-medium">{product.title}</h2>
                  {isFromUrlOrImage && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 mt-1 text-xs bg-purple-500/20 text-purple-300 rounded-md border border-purple-500/30">
                      <Sparkles className="w-3 h-3" />
                      From {product.category === 'Image' ? 'Image' : 'URL'} • Click "Find Similar" below
                    </span>
                  )}
                </div>
                <p className="text-lg font-medium text-white">${product.price}</p>
              </div>

              <p className="text-zinc-400 mb-1">{product.brand}</p>

              <div className="flex items-center mb-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-xs text-zinc-400 ml-1">4.8 (120 reviews)</p>
              </div>

              <p className="text-sm text-zinc-300 mb-4">{product.description || "No description available."}</p>

              {product.hasAiInsights && (
                <button
                  onClick={toggleAiInsights}
                  className="flex items-center justify-center w-full py-2 px-4 mb-4 bg-zinc-900 border border-zinc-800 rounded-lg text-white hover:bg-zinc-800 transition-colors"
                >
                  <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  {showAiInsights ? "Hide AI Insights" : "Show AI Insights"}
                </button>
              )}

              {showAiInsights && (
                <div className="mb-4 p-3 bg-zinc-900/20 border border-zinc-900/20 rounded-lg">
                  <h3 className="text-sm font-medium text-white mb-2 flex items-center">
                    <Sparkles className="w-4 h-4 mr-1" strokeWidth={1.5} />
                    Flair AI Insights
                  </h3>
                  <p className="text-sm text-zinc-300 mb-3">
                    This {product.category?.toLowerCase()} features a minimalist design with clean lines and a modern
                    silhouette. The neutral color palette makes it versatile for various styling options. Based on your
                    previous preferences, this would complement your existing wardrobe and pair well with items you've
                    saved.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={handleAskAIAnalysis}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                      <span className="text-sm font-medium">Is this worth it? Show competitors</span>
                    </button>
                    <AnalyzeWithAIButton onClick={handleAnalyzeWithAI} variant="secondary" size="sm" className="w-full" />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Select Size</p>
                <div className="flex flex-wrap gap-2">
                  {["XS", "S", "M", "L", "XL"].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                        selectedSize === size
                          ? "bg-white text-black"
                          : "bg-zinc-900 text-zinc-300 border border-zinc-800"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {isFromUrlOrImage && (
                <button
                  onClick={handleAskAIAnalysis}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium text-sm mb-3 hover:from-purple-500 hover:to-blue-500 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Find Similar Items
                </button>
              )}

              {/* See Options button - uses Google Shopping redirect link */}
              <button
                onClick={() => {
                  const productLink = product.link || (product as any).url
                  if (productLink) {
                    // Use the Google Shopping redirect link directly
                    // This is the full redirect URL from Google Shopping API
                    window.open(productLink, '_blank', 'noopener,noreferrer')
                  } else {
                    // Fallback: Create a Google Shopping search
                    const searchQuery = `${product.brand || ''} ${product.title || ''}`.trim()
                    const googleShoppingUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=shop`
                    window.open(googleShoppingUrl, '_blank', 'noopener,noreferrer')
                  }
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium text-sm hover:from-blue-500 hover:to-purple-500 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                See Options
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {showAIAnalysis && <AIAnalysis product={product} onClose={() => setShowAIAnalysis(false)} />}
      
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        product={product}
      />
    </>
  )
}
