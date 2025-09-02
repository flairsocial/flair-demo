"use client"

import React from "react"
import Image from "next/image"
import { X, FileText, Link as LinkIcon, ShoppingBag, ImageIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { ChatFile } from "@/lib/file-context"

interface FileAttachmentProps {
  file: ChatFile
  onRemove?: (fileId: string) => void
  showRemove?: boolean
  size?: "sm" | "md" | "lg"
}

export default function FileAttachment({ 
  file, 
  onRemove, 
  showRemove = true,
  size = "md" 
}: FileAttachmentProps) {
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`relative ${sizeClasses[size]} rounded-lg border-2 ${getTypeColor()} overflow-hidden group`}
    >
      {/* Remove button */}
      {showRemove && onRemove && (
        <button
          onClick={() => onRemove(file.id)}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}

      {/* File preview */}
      <div className="w-full h-full relative">
        {file.preview || file.url ? (
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
        </div>
      </div>
    </motion.div>
  )
}

interface FileAttachmentListProps {
  files: ChatFile[]
  onRemove?: (fileId: string) => void
  showRemove?: boolean
  size?: "sm" | "md" | "lg"
  maxDisplay?: number
}

export function FileAttachmentList({ 
  files, 
  onRemove, 
  showRemove = true, 
  size = "md",
  maxDisplay 
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
