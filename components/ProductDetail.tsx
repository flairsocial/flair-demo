"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Heart, Share2, Sparkles, MessageCircle, X } from "lucide-react"
import type { Product } from "@/lib/types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AnalyzeWithAIButton from "./AnalyzeWithAIButton"
import AIAnalysis from "./AIAnalysis"
import { useFiles } from "@/lib/file-context"

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
  const router = useRouter()
  const { addProductAsFile } = useFiles()

  const additionalImages = [
    product.image,
    `/placeholder.svg?height=600&width=400&query=fashion model wearing ${product.category} side view`,
    `/placeholder.svg?height=600&width=400&query=fashion model wearing ${product.category} back view`,
  ]

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [])

  const handleLike = () => {
    setLiked(!liked)
  }

  const toggleAiInsights = () => {
    setShowAiInsights(!showAiInsights)
  }

  const handleAnalyzeWithAI = () => {
    setShowAIAnalysis(true)
  }

  const handleAskAIAboutItem = () => {
    console.log('[ProductDetail] Ask AI about item clicked - adding product to files')
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
                  aria-label={liked ? "Unlike" : "Like"}
                >
                  <Heart className="w-5 h-5 text-white" fill={liked ? "white" : "none"} strokeWidth={1.5} />
                </button>
                <button className="p-2 rounded-full bg-black/40 backdrop-blur-sm" aria-label="Share">
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
                <h2 className="text-xl font-medium">{product.title}</h2>
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

              <AnalyzeWithAIButton onClick={handleAnalyzeWithAI} variant="primary" size="lg" className="w-full" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {showAIAnalysis && <AIAnalysis product={product} onClose={() => setShowAIAnalysis(false)} />}
    </>
  )
}
