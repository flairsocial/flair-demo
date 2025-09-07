"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Check, Camera } from "lucide-react"

interface CreateCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  onCollectionCreated: (collection: any) => void
  preselectedItem?: any
}

const colorOptions = [
  "bg-blue-500",
  "bg-green-500", 
  "bg-purple-500",
  "bg-pink-500",
  "bg-amber-500",
  "bg-red-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-teal-500"
]

export default function CreateCollectionModal({ 
  isOpen, 
  onClose, 
  onCollectionCreated, 
  preselectedItem 
}: CreateCollectionModalProps) {
  const [collectionName, setCollectionName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedColor, setSelectedColor] = useState(colorOptions[0])
  const [customBanner, setCustomBanner] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!collectionName.trim()) return

    try {
      setLoading(true)
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          collection: {
            name: collectionName,
            color: selectedColor,
            description: description || undefined,
            customBanner: customBanner || undefined
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // If there's a preselected item, add it to the collection
        if (preselectedItem && result.collection) {
          await fetch('/api/saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', item: preselectedItem })
          })

          await fetch('/api/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'addItem',
              itemId: preselectedItem.id,
              collectionId: result.collection.id
            })
          })
        }

        onCollectionCreated(result.collection)
        handleClose()
      }
    } catch (error) {
      console.error('Error creating collection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCollectionName("")
    setDescription("")
    setSelectedColor(colorOptions[0])
    setCustomBanner("")
    onClose()
  }

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setCustomBanner(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
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
              <h2 className="text-lg font-semibold">Create Collection</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Custom Banner Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Banner Image (Optional)</label>
                <div className="relative">
                  {customBanner ? (
                    <div className="relative w-full h-24 bg-zinc-800 rounded-lg overflow-hidden">
                      <img
                        src={customBanner}
                        alt="Custom banner"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => setCustomBanner("")}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-600 transition-colors">
                      <Camera className="w-6 h-6 text-zinc-500 mb-1" />
                      <span className="text-xs text-zinc-400">Upload banner</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Collection Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Collection Name</label>
                <input
                  type="text"
                  placeholder="Enter collection name"
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                  maxLength={50}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  placeholder="Describe your collection..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
                  rows={3}
                  maxLength={200}
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Collection Color</label>
                <div className="grid grid-cols-6 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-lg ${color} relative transition-transform hover:scale-110`}
                    >
                      {selectedColor === color && (
                        <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {collectionName && (
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Preview</h3>
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full ${selectedColor} mr-2`} />
                    <div>
                      <p className="text-sm font-medium">{collectionName}</p>
                      {description && (
                        <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Preselected Item Preview */}
              {preselectedItem && (
                <div className="p-3 bg-zinc-800 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Adding Item</h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-zinc-700 rounded-lg overflow-hidden">
                      {preselectedItem.image && (
                        <img 
                          src={preselectedItem.image} 
                          alt={preselectedItem.title} 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{preselectedItem.title}</p>
                      <p className="text-xs text-zinc-400">${preselectedItem.price}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={!collectionName.trim() || loading}
                  className="flex-1 bg-white text-black rounded-lg px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
                >
                  {loading ? 'Creating...' : 'Create Collection'}
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
