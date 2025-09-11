"use client"

import React, { useRef, useState, useEffect } from "react"
import { Paperclip, Upload, Link as LinkIcon, ImageIcon, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useFiles, type ChatFile } from "@/lib/file-context"

interface FileUploadProps {
  onFileAdded?: (file: ChatFile) => void
}

export default function FileUpload({ onFileAdded }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)
  const { addFile } = useFiles()

  // Handle click outside to close options
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowOptions(false)
        setShowUrlInput(false)
        setUrlInput("")
      }
    }

    if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showOptions])

  const handleToggleOptions = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowOptions(!showOptions)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(async (file) => {
      const fileUrl = URL.createObjectURL(file)
      
      const chatFile: ChatFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type.startsWith("image/") ? "image" : "document",
        url: fileUrl,
        size: file.size,
        preview: file.type.startsWith("image/") ? fileUrl : undefined
      }

      addFile(chatFile)
      onFileAdded?.(chatFile)
    })

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setShowOptions(false)
  }

  const handleUrlSubmit = async () => {
    if (!urlInput.trim() || isProcessingUrl) return

    setIsProcessingUrl(true)

    const chatFile: ChatFile = {
      id: `url-${Date.now()}`,
      name: urlInput.split("/").pop() || "URL",
      type: "url",
      url: urlInput.trim(),
      preview: urlInput.trim()
    }

    // Automatically process the URL to extract product information
    try {
      console.log('[FileUpload] Auto-processing URL:', urlInput.trim())
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlInput.trim(), includeRealTimeData: true })
      })
      
      if (response.ok) {
        const productData = await response.json()
        console.log('[FileUpload] URL processed successfully:', {
          title: productData.title,
          hasImage: !!productData.image,
          price: productData.price
        })
        
        // If we successfully extracted product data, change type to "product"
        if (productData.title && productData.price !== undefined) {
          chatFile.type = "product"
          console.log('[FileUpload] Changed file type to product due to successful extraction')
        }
        
        // Update the chat file with extracted product data
        chatFile.name = productData.title || chatFile.name
        chatFile.metadata = {
          title: productData.title,
          price: productData.price,
          brand: productData.brand,
          description: productData.description,
          category: productData.category,
          link: productData.link || urlInput.trim(),
          productId: productData.id,
          image: productData.image
        }
        
        // Use the extracted image as preview if available
        if (productData.image && productData.image !== '/placeholder-product.jpg' && productData.image !== '/placeholder.svg') {
          chatFile.preview = productData.image
          // Also store the original image URL in metadata for fallback
          if (chatFile.metadata) {
            chatFile.metadata.image = productData.image
          }
          console.log('[FileUpload] Using extracted image as preview:', productData.image)
        }
        
        console.log('[FileUpload] Final chat file:', {
          type: chatFile.type,
          name: chatFile.name,
          hasMetadata: !!chatFile.metadata,
          preview: chatFile.preview,
          extractedImage: productData.image
        })
      } else {
        console.log('[FileUpload] URL processing failed, using basic URL attachment')
      }
    } catch (error) {
      console.error('[FileUpload] Error processing URL:', error)
      // Continue with basic URL attachment
    } finally {
      setIsProcessingUrl(false)
    }

    addFile(chatFile)
    onFileAdded?.(chatFile)
    setUrlInput("")
    setShowUrlInput(false)
    setShowOptions(false)
  }

  const handleUrlKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUrlSubmit()
    } else if (e.key === "Escape") {
      setShowUrlInput(false)
      setUrlInput("")
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggleOptions}
        className="p-2 rounded-full hover:bg-zinc-700 transition-colors"
        aria-label="Attach file"
        type="button"
      >
        <Paperclip className="w-5 h-5 text-zinc-400" />
      </button>

      <AnimatePresence>
        {showOptions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-full mb-2 left-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-2 min-w-48"
          >
            <div className="space-y-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-zinc-700 transition-colors text-left"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white">Upload File</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-zinc-700 transition-colors text-left"
              >
                <ImageIcon className="w-4 h-4 text-green-400" />
                <span className="text-sm text-white">Upload Image</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUrlInput(!showUrlInput)
                }}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-zinc-700 transition-colors text-left"
              >
                <LinkIcon className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-white">Add URL</span>
              </button>
            </div>

            {showUrlInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 pt-2 border-t border-zinc-700"
              >
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={handleUrlKeyPress}
                    placeholder={isProcessingUrl ? "Processing URL..." : "Enter URL..."}
                    className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-500"
                    autoFocus
                    disabled={isProcessingUrl}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUrlSubmit()
                    }}
                    disabled={!urlInput.trim() || isProcessingUrl}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    {isProcessingUrl ? (
                      <>
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing</span>
                      </>
                    ) : (
                      <span>Add</span>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
