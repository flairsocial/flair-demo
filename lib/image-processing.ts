// Image processing utilities for profile picture uploads
// Handles compression, resizing, and format conversion

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  maxFileSize?: number // in bytes
}

export interface ProcessedImage {
  dataUrl: string
  file: File
  originalSize: number
  processedSize: number
  dimensions: {
    width: number
    height: number
  }
}

/**
 * Process an image file for profile picture upload
 * Automatically resizes, compresses, and converts format as needed
 */
export async function processImageForUpload(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.8,
    format = 'jpeg',
    maxFileSize = 1024 * 1024 // 1MB default
  } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img
        
        // Scale down if image is too large
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height
          
          if (width > height) {
            width = maxWidth
            height = width / aspectRatio
          } else {
            height = maxHeight
            width = height * aspectRatio
          }
        }

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Draw and compress image
        ctx.fillStyle = '#FFFFFF' // White background for JPEG
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to desired format
        const mimeType = `image/${format}`
        
        // Try different quality levels if file is still too large
        const tryCompress = (currentQuality: number): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to process image'))
                return
              }

              // Check if file size is acceptable
              if (blob.size > maxFileSize && currentQuality > 0.1) {
                // Reduce quality and try again
                tryCompress(currentQuality - 0.1)
                return
              }

              // Create processed file
              const processedFile = new File([blob], file.name, {
                type: mimeType,
                lastModified: Date.now()
              })

              // Create data URL for preview
              const reader = new FileReader()
              reader.onload = () => {
                resolve({
                  dataUrl: reader.result as string,
                  file: processedFile,
                  originalSize: file.size,
                  processedSize: blob.size,
                  dimensions: { width, height }
                })
              }
              reader.onerror = () => reject(new Error('Failed to create data URL'))
              reader.readAsDataURL(blob)
            },
            mimeType,
            currentQuality
          )
        }

        tryCompress(quality)
      } catch (error) {
        reject(new Error(`Image processing failed: ${error}`))
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    
    // Load the image
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please select a valid image file (JPEG, PNG, WebP, or GIF)'
    }
  }

  // Check file size (50MB max for processing)
  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image file is too large. Please select an image under 50MB.'
    }
  }

  return { valid: true }
}

/**
 * Convert file to base64 with size optimization
 */
export async function fileToOptimizedBase64(file: File): Promise<string> {
  try {
    // Validate file first
    const validation = validateImageFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Process the image
    const processed = await processImageForUpload(file, {
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.8,
      format: 'jpeg',
      maxFileSize: 500 * 1024 // 500KB max
    })

    // Remove data URL prefix to get just the base64 string
    const base64 = processed.dataUrl.split(',')[1]
    
    console.log('Image processing complete:', {
      originalSize: `${(processed.originalSize / 1024).toFixed(1)}KB`,
      processedSize: `${(processed.processedSize / 1024).toFixed(1)}KB`,
      dimensions: processed.dimensions,
      compressionRatio: `${((1 - processed.processedSize / processed.originalSize) * 100).toFixed(1)}%`
    })

    return base64
  } catch (error) {
    console.error('Image processing error:', error)
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Create a cropped square image for profile pictures
 */
export async function createSquareProfileImage(
  file: File,
  cropSize: number = 400
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    console.log('Starting square crop processing:', {
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: file.type
    })
    
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      try {
        const { width, height } = img
        console.log('Image loaded:', { width, height })
        
        // Calculate crop dimensions (center crop to square)
        const cropDimension = Math.min(width, height)
        const cropX = (width - cropDimension) / 2
        const cropY = (height - cropDimension) / 2

        console.log('Crop parameters:', { cropDimension, cropX, cropY, outputSize: cropSize })

        // Set canvas to square dimensions
        canvas.width = cropSize
        canvas.height = cropSize

        // Fill with white background
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, cropSize, cropSize)

        // Draw cropped and scaled image
        ctx.drawImage(
          img,
          cropX, cropY, cropDimension, cropDimension, // Source crop
          0, 0, cropSize, cropSize // Destination
        )

        // Try progressive quality reduction if needed
        const tryCompress = (quality: number): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create cropped image'))
                return
              }

              console.log(`Compression attempt with quality ${quality}:`, {
                blobSize: `${(blob.size / 1024).toFixed(1)}KB`
              })

              // Check if file size is acceptable (max 200KB for profile pictures)
              const maxSize = 200 * 1024 // 200KB max
              if (blob.size > maxSize && quality > 0.2) {
                console.log('File still too large, reducing quality...')
                tryCompress(quality - 0.1)
                return
              }

              const processedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              })

              const reader = new FileReader()
              reader.onload = () => {
                console.log('Final processed image:', {
                  originalSize: `${(file.size / 1024).toFixed(1)}KB`,
                  processedSize: `${(blob.size / 1024).toFixed(1)}KB`,
                  compressionRatio: `${((1 - blob.size / file.size) * 100).toFixed(1)}%`,
                  dimensions: `${cropSize}x${cropSize}`,
                  quality: quality
                })
                
                resolve({
                  dataUrl: reader.result as string,
                  file: processedFile,
                  originalSize: file.size,
                  processedSize: blob.size,
                  dimensions: { width: cropSize, height: cropSize }
                })
              }
              reader.onerror = () => reject(new Error('Failed to create data URL'))
              reader.readAsDataURL(blob)
            },
            'image/jpeg',
            quality
          )
        }

        // Start with moderate quality to get smaller file size
        tryCompress(0.7)
      } catch (error) {
        console.error('Crop processing error:', error)
        reject(new Error(`Crop processing failed: ${error}`))
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}