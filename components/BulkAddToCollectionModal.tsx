"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Check } from "lucide-react"
import type { Product } from "@/lib/types"
import type { Collection } from "@/lib/database-service-v2"

interface BulkAddToCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedItems: Product[]
  onItemsAdded: () => void
}

export default function BulkAddToCollectionModal({ 
  isOpen, 
  onClose, 
  selectedItems, 
  onItemsAdded 
}: BulkAddToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollections, setSelectedCollections] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

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

  const toggleCollectionSelection = (collectionId: string) => {
    setSelectedCollections(prev => 
      prev.includes(collectionId)
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    )
  }

  const handleAddToCollections = async () => {
    if (selectedCollections.length === 0) return

    try {
      setLoading(true)
      
      // First, save all items that aren't already saved
      await Promise.all(
        selectedItems.map(item => 
          fetch('/api/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', item })
          })
        )
      )

      // Then add items to selected collections
      await Promise.all(
        selectedCollections.flatMap(collectionId =>
          selectedItems.map(item =>
            fetch('/api/collections', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'addItem',
                itemId: item.id,
                collectionId
              })
            })
          )
        )
      )

      onItemsAdded()
      handleClose()
    } catch (error) {
      console.error('Error adding items to collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedCollections([])
    setShowCreateForm(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-900 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold">
                Add {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''} to Collections
              </h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {/* Selected Items Preview */}
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Selected Items</h3>
                <div className="flex -space-x-2 overflow-hidden">
                  {selectedItems.slice(0, 5).map((item, index) => (
                    <div
                      key={item.id}
                      className="w-10 h-10 bg-zinc-700 rounded-lg border-2 border-zinc-900 overflow-hidden"
                    >
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                  {selectedItems.length > 5 && (
                    <div className="w-10 h-10 bg-zinc-700 rounded-lg border-2 border-zinc-900 flex items-center justify-center">
                      <span className="text-xs font-medium">+{selectedItems.length - 5}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Collections List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : (
                  <>
                    {collections.map((collection) => (
                      <button
                        key={collection.id}
                        onClick={() => toggleCollectionSelection(collection.id)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          selectedCollections.includes(collection.id)
                            ? 'bg-zinc-800 ring-1 ring-white/20'
                            : 'hover:bg-zinc-800'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full ${collection.color} flex items-center justify-center`}>
                          {selectedCollections.includes(collection.id) && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{collection.name}</p>
                          <p className="text-xs text-zinc-400">{collection.itemIds.length} items</p>
                        </div>
                      </button>
                    ))}

                    {collections.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-zinc-400 text-sm">No collections yet</p>
                        <p className="text-zinc-500 text-xs mt-1">Create your first collection to organize items</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Create New Collection Button */}
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center space-x-3 p-3 mt-4 rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-sm text-zinc-400">Create new collection</span>
              </button>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4">
                <button
                  onClick={handleAddToCollections}
                  disabled={selectedCollections.length === 0 || loading}
                  className="flex-1 bg-white text-black rounded-lg px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
                >
                  {loading ? 'Adding...' : `Add to ${selectedCollections.length} Collection${selectedCollections.length !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
