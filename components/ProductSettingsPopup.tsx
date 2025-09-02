"use client"

import React, { useState, useRef, useEffect } from "react"
import { motion, PanInfo } from "framer-motion"
import { X, Grip, Settings2, Minimize2 } from "lucide-react"

interface ProductSettingsPopupProps {
  isOpen: boolean
  onClose: () => void
  productCount: number
  onProductCountChange: (count: number) => void
  onRefetchProducts: () => void
  onToggleChat: () => void
  isChatCollapsed: boolean
}

export default function ProductSettingsPopup({
  isOpen,
  onClose,
  productCount,
  onProductCountChange,
  onRefetchProducts,
  onToggleChat,
  isChatCollapsed,
}: ProductSettingsPopupProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const constraintsRef = useRef<HTMLDivElement>(null)

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false)
    setPosition({
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    })
  }

  const handleSliderChange = (value: number) => {
    onProductCountChange(value)
  }

  const handleApplyChanges = () => {
    onRefetchProducts()
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      
      {/* Draggable Popup */}
      <div ref={constraintsRef} className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
        <motion.div
          drag
          dragConstraints={constraintsRef}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto max-h-[80vh] overflow-y-auto"
          style={{
            x: position.x,
            y: position.y,
          }}
        >
          <div 
            className={`bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-80 ${
              isDragging ? 'cursor-grabbing' : 'cursor-default'
            }`}
          >
            {/* Header with drag handle */}
            <div 
              className="flex items-center justify-between p-4 border-b border-zinc-700 cursor-grab active:cursor-grabbing"
              onMouseDown={handleDragStart}
            >
              <div className="flex items-center gap-2">
                <Grip className="w-4 h-4 text-zinc-400" />
                <Settings2 className="w-4 h-4 text-white" />
                <h3 className="text-white font-medium">Product Settings</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Product Count Slider */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Number of Products: {productCount}
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="3"
                    max="20"
                    step="1"
                    value={productCount}
                    onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-zinc-400 mt-1">
                    <span>3</span>
                    <span>10</span>
                    <span>20</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mt-2">
                  More products = better variety, but slower loading
                </p>
              </div>

              {/* Chat Controls */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Chat Options
                </label>
                <button
                  onClick={onToggleChat}
                  className="flex items-center gap-2 w-full p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-white">
                    {isChatCollapsed ? 'Expand Chat' : 'Collapse Chat'}
                  </span>
                </button>
                <p className="text-xs text-zinc-400 mt-1">
                  {isChatCollapsed 
                    ? 'Show chat to continue the conversation' 
                    : 'Hide chat to focus on products'
                  }
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyChanges}
                  className="flex-1 px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg transition-colors font-medium"
                >
                  Apply & Fetch
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid #3f3f46;
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: 2px solid #3f3f46;
        }
      `}</style>
    </>
  )
}
