"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, MessageCircle, Camera, Edit3, Trash2, Plus, MoreHorizontal, ExternalLink, Globe, Lock } from "lucide-react"
import Image from "next/image"
import type { Product, Collection } from "@/lib/types"
import { useRouter } from "next/navigation"
import ProductDetail from "@/components/ProductDetail"

interface CollectionDetailModalProps {
  collection: Collection & { items: Product[] } | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (collection: Collection) => void
  onDelete: (collectionId: string) => void
  userId?: string // Clerk user ID for community post creation
  ownerId?: string // Clerk user ID of the collection owner (for permission checks)
}

export default function CollectionDetailModal({ 
  collection, 
  isOpen, 
  onClose, 
  onUpdate, 
  onDelete,
  userId,
  ownerId
}: CollectionDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const router = useRouter()

  // Determine if the current user owns this collection
  // In profile view: ownerId is not provided, so userId presence indicates ownership
  // In community view: ownerId is provided, compare with userId to determine ownership
  const isOwner = ownerId ? (userId === ownerId) : !!userId

  useEffect(() => {
    if (collection) {
      setEditName(collection.name)
      setEditDescription(collection.description || "")
    }
  }, [collection])

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showOptionsMenu) {
        setShowOptionsMenu(false)
      }
    }

    if (showOptionsMenu) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showOptionsMenu])

  if (!collection) return null

  // Normalize banner field (support multiple possible server field names)
  const bannerUrl = (collection as any).customBanner || (collection as any).custom_banner || (collection as any).banner_url || (collection as any).customBannerUrl || null

  // Helper to pick product image from multiple possible keys
  const productImage = (item: any) => item.image || item.imageUrl || item.image_url || item.thumbnail || "/placeholder.svg"

  // Helper to build stable keys for mapped items
  const stableItemKey = (item: any, idx: number, prefix = 'item') => {
    const raw = (item && (item.id || item.id === 0)) ? String(item.id).trim() : ''
    if (raw) return `${raw}`
    // Make sure we never return an empty string - include collection id or name as fallback
    const collectionIdent = collection && (collection.id || collection.name) ? String(collection.id || collection.name).replace(/\s+/g, '-') : 'col-unknown'
    return `${prefix}-${collectionIdent}-${idx}-${((item && (item.title || item.name)) || 'unknown').toString().replace(/\s+/g, '-')}`
  }

  const handleSave = async () => {
    if (!editName.trim()) return

    try {
      setLoading(true)
      const response = await fetch('/api/collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: collection.id,
          name: editName,
          description: editDescription
        })
      })

      if (response.ok) {
        const updatedCollection = await response.json()
        onUpdate(updatedCollection)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error updating collection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        onDelete(collection.id)
        onClose()
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
    } finally {
      setLoading(false)
    }
  }

  

  const handleAskChat = async () => {
    try {
      // Create a comprehensive collection summary for chat
      const collectionSummary = {
        name: collection.name,
        description: collection.description || "",
        totalItems: Array.isArray(collection.items) ? collection.items.length : 0,
        items: (Array.isArray(collection.items) ? collection.items : []).map(item => ({
          id: item.id,
          title: item.title,
          brand: item.brand,
          price: item.price,
          category: item.category,
          image: item.image,
          description: item.description
        }))
      }

      // Navigate to chat with collection data
      const collectionData = encodeURIComponent(JSON.stringify(collectionSummary))
      router.push(`/chat?collection=${collectionData}`)
      onClose()
    } catch (error) {
      console.error('Error preparing collection for chat:', error)
    }
  }

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingBanner(true)

    // Downscale image in browser to a reasonable size before uploading
    const downscaleAndUpload = async (file: File) => {
      try {
        const img = document.createElement('img') as HTMLImageElement
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(r.result as string)
          r.onerror = reject
          r.readAsDataURL(file)
        })

        img.src = dataUrl
        await new Promise<void>((res) => { img.onload = () => res() })

        // Use a canvas to resize to max width 1200 while preserving aspect ratio
        const maxDim = 1200
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to JPEG with quality 0.85
        let outDataUrl = canvas.toDataURL('image/jpeg', 0.85)

        // If still large, reduce quality iteratively
        let base64Part = outDataUrl.split(',')[1] || ''
        let quality = 0.85
        while (base64Part.length > 250 * 1024 && quality > 0.4) {
          quality -= 0.1
          outDataUrl = canvas.toDataURL('image/jpeg', quality)
          base64Part = outDataUrl.split(',')[1] || ''
        }

        // Upload using uploads API which calls the sanitizer/storage
        const uploadResp = await fetch('/api/uploads/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: outDataUrl, bucket: 'collection-banners' })
        })

        if (!uploadResp.ok) {
          console.error('Upload API failed', await uploadResp.text())
          return null
        }

        const json = await uploadResp.json()
        return json.url as string | null
      } catch (err) {
        console.error('Error downscaling/uploading banner:', err)
        return null
      }
    }

    ;(async () => {
      const uploadedUrl = await downscaleAndUpload(file)
      try {
        if (uploadedUrl) {
          const response = await fetch('/api/collections', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: collection.id, customBanner: uploadedUrl })
          })

          if (response.ok) {
            const updatedCollection = await response.json()
            onUpdate(updatedCollection)
            console.log('\u2705 Collection banner updated successfully!')
          } else {
            console.error('Failed to update collection banner')
          }
        } else {
          console.error('Failed to upload banner')
        }
      } catch (error) {
        console.error('Error updating collection with banner URL:', error)
      } finally {
        setUploadingBanner(false)
      }
    })()
  }

  const handleRemoveBanner = async () => {
    try {
      setUploadingBanner(true)
      const response = await fetch('/api/collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: collection.id,
          customBanner: null
        })
      })

      if (response.ok) {
        const updatedCollection = await response.json()
        onUpdate(updatedCollection)
      }
    } catch (error) {
      console.error('Error removing banner:', error)
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleShare = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'shareToCommunity',
          collectionId: collection.id
        })
      })

      if (response.ok) {
        // Update the collection to be public
        const updatedCollection = { ...collection, isPublic: true }
        onUpdate(updatedCollection)
        setShowShareMenu(true)
        setTimeout(() => setShowShareMenu(false), 2000)
        console.log('✅ Collection shared to community successfully!')
      } else {
        console.error('Failed to share collection to community')
      }
    } catch (error) {
      console.error('Error sharing collection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePrivacy = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: collection.id,
          isPublic: !collection.isPublic
        })
      })

      if (response.ok) {
        const updatedCollection = await response.json()
        onUpdate(updatedCollection)
        setShowOptionsMenu(false)

        // Handle community post creation/removal via API
        if (!collection.isPublic && updatedCollection.isPublic) {
          // Making public - create community post
          try {
            const postResponse = await fetch('/api/collections', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'shareToCommunity',
                collectionId: collection.id
              })
            })
            if (postResponse.ok) {
              console.log('✅ Collection shared to community successfully!')
            }
          } catch (error) {
            console.error('Error sharing to community:', error)
          }
        } else if (collection.isPublic && !updatedCollection.isPublic) {
          // Making private - remove community post
          try {
            const postResponse = await fetch('/api/collections', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'removeFromCommunity',
                collectionId: collection.id
              })
            })
            if (postResponse.ok) {
              console.log('✅ Collection removed from community successfully!')
            }
          } catch (error) {
            console.error('Error removing from community:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error toggling privacy:', error)
    } finally {
      setLoading(false)
    }
  }
   

  const handleRemoveItem = async (itemId: string) => {
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'removeItem',
          itemId,
          collectionId: collection.id
        })
      })

      if (response.ok) {
        // Update the collection locally
        const updatedCollection = {
          ...collection,
          items: Array.isArray(collection.items) ? collection.items.filter(item => item.id !== itemId) : [],
          itemIds: Array.isArray(collection.itemIds) ? collection.itemIds.filter(id => id !== itemId) : []
        }
        onUpdate(updatedCollection as Collection)
      }
    } catch (error) {
      console.error('Error removing item from collection:', error)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={`collection-modal-${collection.id || collection.name || 'unknown'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative">
              {/* Collection Banner - Updated to match user profile */}
              <div className="h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
                {bannerUrl ? (
                  // Show custom banner if available (normalized)
                  <Image
                    src={bannerUrl}
                    alt={collection.name}
                    fill
                    className="object-cover"
                  />
                ) : Array.isArray(collection.items) && collection.items.length > 0 ? (
                  // Show product images as fallback
                  <div className="grid grid-cols-2 h-full">
                    {(Array.isArray(collection.items) ? collection.items : []).slice(0, 4).map((item, index) => (
                      <div key={stableItemKey(item, index, 'banner')} className="relative">
                        <Image
                          src={productImage(item)}
                          alt={item.title || (item as any).name || 'Product image'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  // Show default icon if no banner and no items
                  <div className="flex items-center justify-center h-full">
                    <div className={`w-12 h-12 rounded-full ${collection.color || 'bg-blue-500'} flex items-center justify-center`}>
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                  </div>
                )}
                
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Header controls */}
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  {isOwner && (
                    <div className="relative">
                      <button
                        onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                        className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors flex items-center space-x-1"
                      >
                        {collection.isPublic ? (
                          <Globe className="w-3 h-3 text-white" />
                        ) : (
                          <Lock className="w-3 h-3 text-white" />
                        )}
                        <MoreHorizontal className="w-4 h-4 text-white" />
                      </button>
                      
                      {/* Options dropdown menu */}
                      {showOptionsMenu && (
                        <div className="absolute top-12 right-0 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 min-w-[160px] z-10">
                          <button
                            onClick={handleTogglePrivacy}
                            disabled={loading}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-white hover:bg-zinc-700 rounded-t-lg"
                          >
                            {collection.isPublic ? (
                              <>
                                <Lock className="w-4 h-4" />
                                <span>Make Private</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4" />
                                <span>Make Public</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Collection info overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-black/50 backdrop-blur-sm text-white text-xl font-bold rounded-lg px-3 py-2 w-full"
                        placeholder="Collection name"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="bg-black/50 backdrop-blur-sm text-white rounded-lg px-3 py-2 w-full resize-none"
                        placeholder="Add a description..."
                        rows={2}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSave}
                          disabled={loading || !editName.trim()}
                          className="bg-white text-black px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                        >
                          {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="bg-black/50 text-white px-4 py-2 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center mb-2">
                        <div className={`w-3 h-3 rounded-full ${collection.color} mr-2`} />
                        <h1 className="text-xl font-bold text-white">{collection.name}</h1>
                      </div>
                      {collection.description && (
                        <p className="text-zinc-300 text-sm">{collection.description}</p>
                      )}
                      <p className="text-zinc-400 text-sm">
                        {Array.isArray(collection.items) ? collection.items.length : 0} item{(Array.isArray(collection.items) ? collection.items.length : 0) !== 1 ? 's' : ''}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {!isEditing && (
                <div className="p-4 border-b border-zinc-800 flex flex-wrap gap-2">
                  <button
                    onClick={handleAskChat}
                    className="flex items-center bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Ask Chat
                  </button>
                  
                  {isOwner && (
                    <>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={uploadingBanner}
                        />
                        <button 
                          className="flex items-center bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                          disabled={uploadingBanner}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {uploadingBanner ? 'Uploading...' : 'Custom Banner'}
                        </button>
                      </div>

                      {collection.customBanner && (
                        <button 
                          onClick={handleRemoveBanner}
                          className="flex items-center bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-4 py-2 rounded-lg transition-colors"
                          disabled={uploadingBanner}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove Banner
                        </button>
                      )}
                      
                      <div className="relative">
                        <button 
                          onClick={handleShare}
                          className="flex items-center bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Share
                        </button>
                        {showShareMenu && (
                          <div className="absolute top-full left-0 mt-2 bg-zinc-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm whitespace-nowrap">
                            Shared to community!
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center bg-red-900/50 hover:bg-red-900 text-red-300 px-4 py-2 rounded-lg transition-colors ml-auto"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Items Grid */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {!Array.isArray(collection.items) || collection.items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No items yet</h3>
                  <p className="text-zinc-400 mb-4">Add items to this collection to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {collection.items.map((item, index) => (
                    <div key={stableItemKey(item, index, 'griditem')} className="group relative">
                      <div 
                        className="aspect-[3/4] bg-zinc-800 rounded-lg overflow-hidden relative cursor-pointer"
                        onClick={() => setSelectedProduct(item)}
                      >
                        <Image
                          src={productImage(item)}
                          alt={item.title || (item as any).name || 'Product image'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        
                        {/* Item overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          {isOwner && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveItem(item.id)
                              }}
                              className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div 
                        className="mt-2 cursor-pointer"
                        onClick={() => setSelectedProduct(item)}
                      >
                        <h4 className="text-sm font-medium truncate hover:text-blue-400 transition-colors">{item.title}</h4>
                        <p className="text-xs text-zinc-400">{item.brand}</p>
                        <p className="text-sm font-medium">${item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Delete Confirmation */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div
                  key={`collection-delete-${collection.id || collection.name || 'unknown'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    className="bg-zinc-800 p-6 rounded-xl max-w-sm mx-4"
                  >
                    <h3 className="text-lg font-medium mb-2">Delete Collection</h3>
                    <p className="text-zinc-400 text-sm mb-4">
                      Are you sure you want to delete "{collection.name}"? This action cannot be undone.
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
                      >
                        {loading ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
      
      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetail 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </AnimatePresence>
  )
}
