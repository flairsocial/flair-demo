"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Check } from "lucide-react"
import type { Product } from "@/lib/types"
import type { Collection } from "@/lib/profile-storage"

interface CollectionModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product
}

const colorOptions = [
  "bg-blue-500",
  "bg-green-500", 
  "bg-purple-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-red-500",
  "bg-cyan-500",
  "bg-orange-500"
]

export default function CollectionModal({ isOpen, onClose, product }: CollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [selectedColor, setSelectedColor] = useState(colorOptions[0])

  useEffect(() => {
    if (isOpen) {
      fetchCollections()
    }
  }, [isOpen])

  const fetchCollections = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/collections')
      if (response.ok) {
        const data = await response.json()
        setCollections(data)
      }
    } catch (error) {
      console.error('Error fetching collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCollection = async (collectionId: string) => {
    try {
      // First, save the product if it's not already saved
      const saveResponse = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', item: product })
      })

      // Then add it to the collection
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addItem',
          itemId: product.id,
          collectionId
        })
      })

      if (response.ok) {
        console.log('Product added to collection successfully')
        onClose()
      }
    } catch (error) {
      console.error('Error adding to collection:', error)
    }
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return

    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          collection: {
            name: newCollectionName,
            color: selectedColor
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.collection) {
          // Add the new collection to the list
          setCollections([result.collection, ...collections])
          // Add the product to the new collection
          await handleAddToCollection(result.collection.id)
          // Reset form
          setNewCollectionName("")
          setSelectedColor(colorOptions[0])
          setShowCreateForm(false)
        }
      }
    } catch (error) {
      console.error('Error creating collection:', error)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
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
          className="bg-zinc-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold">Add to Collection</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4">
            {/* Product Preview */}
            <div className="flex items-center space-x-3 mb-4 p-3 bg-zinc-800 rounded-lg">
              <div className="w-12 h-12 bg-zinc-700 rounded-lg overflow-hidden">
                {product.image && (
                  <img 
                    src={product.image} 
                    alt={product.title} 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.title}</p>
                <p className="text-xs text-zinc-400">${product.price}</p>
              </div>
            </div>

            {/* Create New Collection Form */}
            {showCreateForm && (
              <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
                <input
                  type="text"
                  placeholder="Collection name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full bg-zinc-700 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full ${color} relative`}
                    >
                      {selectedColor === color && (
                        <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateCollection}
                    disabled={!newCollectionName.trim()}
                    className="flex-1 bg-white text-black rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="px-3 py-2 bg-zinc-700 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Collections List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-600 transition-colors"
                >
                  <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-zinc-400">Create new collection</span>
                </button>
              )}

              {loading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                collections.map((collection) => (
                  <button
                    key={collection.id}
                    onClick={() => handleAddToCollection(collection.id)}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full ${collection.color}`}></div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{collection.name}</p>
                      <p className="text-xs text-zinc-400">{collection.itemIds.length} items</p>
                    </div>
                  </button>
                ))
              )}

              {!loading && collections.length === 0 && !showCreateForm && (
                <div className="text-center py-8">
                  <p className="text-zinc-400 text-sm">No collections yet</p>
                  <p className="text-zinc-500 text-xs mt-1">Create your first collection to organize items</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
