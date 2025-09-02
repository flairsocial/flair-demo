"use client"

import React, { createContext, useContext, useState, useCallback } from "react"

export interface ChatFile {
  id: string
  name: string
  type: "image" | "product" | "url" | "document"
  url: string
  size?: number
  preview?: string
  metadata?: {
    title?: string
    price?: number
    brand?: string
    description?: string
    category?: string
    link?: string
    productId?: string
  }
}

interface FileContextType {
  attachedFiles: ChatFile[]
  addFile: (file: ChatFile) => void
  removeFile: (fileId: string) => void
  clearFiles: () => void
  addProductAsFile: (product: any) => void
}

const FileContext = createContext<FileContextType | undefined>(undefined)

export function FileProvider({ children }: { children: React.ReactNode }) {
  const [attachedFiles, setAttachedFiles] = useState<ChatFile[]>([])

  const addFile = useCallback((file: ChatFile) => {
    setAttachedFiles(prev => {
      // Check if file already exists
      const exists = prev.some(f => f.id === file.id)
      if (exists) return prev
      
      return [...prev, file]
    })
  }, [])

  const removeFile = useCallback((fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  const clearFiles = useCallback(() => {
    setAttachedFiles([])
  }, [])

  const addProductAsFile = useCallback((product: any) => {
    console.log('[FileContext] Adding product as file:', product.title)
    const productFile: ChatFile = {
      id: `product-${product.id}`,
      name: product.title || "Product",
      type: "product",
      url: product.image || "",
      preview: product.image,
      metadata: {
        title: product.title,
        price: product.price,
        brand: product.brand,
        description: product.description,
        category: product.category,
        link: product.link,
        productId: product.id
      }
    }
    addFile(productFile)
    console.log('[FileContext] Product file added successfully')
  }, [addFile])

  return (
    <FileContext.Provider value={{
      attachedFiles,
      addFile,
      removeFile,
      clearFiles,
      addProductAsFile
    }}>
      {children}
    </FileContext.Provider>
  )
}

export function useFiles() {
  const context = useContext(FileContext)
  if (context === undefined) {
    throw new Error("useFiles must be used within a FileProvider")
  }
  return context
}
