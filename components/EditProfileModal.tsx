"use client"

import { useState } from "react"
import { X, Upload, User, AtSign, FileText, Camera, Loader2 } from "lucide-react"
import Image from "next/image"
import { fileToOptimizedBase64, validateImageFile, createSquareProfileImage } from "@/lib/image-processing"

interface ProfileData {
  displayName: string
  username: string
  bio: string
  profilePicture: string
}

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profileData: ProfileData
  onSave: (data: ProfileData) => void
}

export default function EditProfileModal({ isOpen, onClose, profileData, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState<ProfileData>(profileData)
  const [saving, setSaving] = useState(false)
  const [processingImage, setProcessingImage] = useState(false)

  // Maximum allowed base64 length (conservative). ~200KB of base64 is ~=150KB binary.
  const MAX_BASE64_LENGTH = 200 * 1024

  // Utility: downscale a dataURL using an offscreen canvas until it meets the maxBase64Length
  const reduceDataUrlSize = async (dataUrl: string, maxBase64Length: number) => {
    return new Promise<string>((resolve, reject) => {
      try {
        const img = document.createElement('img') as HTMLImageElement
        img.onload = () => {
          try {
            let canvas = document.createElement('canvas')
            let ctx = canvas.getContext('2d')!
            let width = img.width
            let height = img.height
            canvas.width = width
            canvas.height = height
            ctx.drawImage(img, 0, 0, width, height)

            // Check current size
            let out = canvas.toDataURL('image/jpeg', 0.9)
            let base64 = out.split(',')[1] || ''
            let quality = 0.9

            // Iteratively reduce quality and dimensions until under threshold or minimum quality reached
            while (base64.length > maxBase64Length && quality > 0.3) {
              quality = Math.max(quality - 0.1, 0.3)
              out = canvas.toDataURL('image/jpeg', quality)
              base64 = out.split(',')[1] || ''
              if (base64.length <= maxBase64Length) break

              // If still large, reduce dimensions by 90%
              width = Math.round(width * 0.9)
              height = Math.round(height * 0.9)
              canvas.width = width
              canvas.height = height
              ctx.drawImage(img, 0, 0, width, height)
              out = canvas.toDataURL('image/jpeg', quality)
              base64 = out.split(',')[1] || ''
            }

            resolve(out)
          } catch (err) {
            // Fallback: return original
            resolve(dataUrl)
          }
        }
        img.onerror = () => resolve(dataUrl)
        img.src = dataUrl
      } catch (err) {
        resolve(dataUrl)
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Optimistically update UI and close modal immediately for responsiveness
    setSaving(true)
    onSave(formData)
    onClose()

    // Send update in the background (fire-and-forget). We'll log errors but won't block UI.
    ;(async () => {
      try {
        // Prepare data for submission
        let profilePicturePayload: string | null = null
        if (formData.profilePicture && formData.profilePicture.startsWith('data:')) {
          // Ensure the dataURL is not excessively large; downscale if needed
          let dataUrl = formData.profilePicture
          const base64Part = dataUrl.split(',')[1] || ''
          if (base64Part.length > MAX_BASE64_LENGTH) {
            console.log('[EditProfileModal] Large image detected, downscaling before upload')
            dataUrl = await reduceDataUrlSize(dataUrl, MAX_BASE64_LENGTH)
          }
          profilePicturePayload = (dataUrl.split(',')[1] || '')
        } else if (formData.profilePicture) {
          profilePicturePayload = formData.profilePicture
        }

        const submitData = {
          displayName: formData.displayName,
          username: formData.username,
          bio: formData.bio,
          profilePicture: profilePicturePayload
        }

        console.log('Sending profile update (background):', {
          displayName: submitData.displayName,
          username: submitData.username,
          bio: submitData.bio,
          profilePicture: submitData.profilePicture ? 'base64 data provided' : 'no image',
          profilePictureLength: submitData.profilePicture?.length
        })

        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('[EditProfileModal] Background profile update failed:', errorData)
        } else {
          const result = await response.json().catch(() => ({}))
          console.log('[EditProfileModal] Background profile update succeeded:', result)
        }
      } catch (error) {
        console.error('[EditProfileModal] Error in background profile update:', error)
      } finally {
        setSaving(false)
      }
    })()
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setProcessingImage(true)
      
      // Validate the file first
      const validation = validateImageFile(file)
      if (!validation.valid) {
        alert(validation.error)
        return
      }

      console.log('Processing image:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type
      })

      // Create a square cropped profile image with smaller size for storage efficiency
      const processed = await createSquareProfileImage(file, 300) // Smaller size: 300x300
      
      // Convert to base64 for upload (extract just the base64 part)
      const base64 = processed.dataUrl.split(',')[1]
      
      console.log('Image processed successfully:', {
        originalSize: `${(processed.originalSize / 1024).toFixed(1)}KB`,
        processedSize: `${(processed.processedSize / 1024).toFixed(1)}KB`,
        dimensions: processed.dimensions,
        compressionRatio: `${((1 - processed.processedSize / processed.originalSize) * 100).toFixed(1)}% smaller`,
        base64Length: base64.length
      })
      
      // Store the data URL for display, but we'll send base64 to API
      setFormData(prev => ({ 
        ...prev, 
        profilePicture: processed.dataUrl // Keep data URL for display
      }))
      
    } catch (error) {
      console.error('Image processing error:', error)
      alert(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setProcessingImage(false)
      // Clear the input so the same file can be selected again
      e.target.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-md border border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold">Edit Profile</h2>
          <button 
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-zinc-800 rounded-full transition-colors flex items-center justify-center"
            disabled={saving}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Picture */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700">
                {formData.profilePicture && formData.profilePicture.trim() !== '' ? (
                  <Image
                    src={formData.profilePicture}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                    <User className="w-12 h-12 text-zinc-400" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-white text-black p-1.5 sm:p-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors shadow-lg flex items-center justify-center">
                {processingImage ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={saving || processingImage}
                />
              </label>
            </div>
            <p className="text-sm text-zinc-400 mt-2">
              {processingImage ? 'Processing image...' : 'Click the camera icon to change your photo'}
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium mb-3 text-zinc-300 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Your display name"
              disabled={saving || processingImage}
              className="w-full p-4 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-zinc-500 focus:outline-none disabled:opacity-50 transition-colors text-white placeholder-zinc-400"
              maxLength={50}
            />
            <p className="text-xs text-zinc-500 mt-1">{formData.displayName.length}/50 characters</p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-3 text-zinc-300 flex items-center">
              <AtSign className="w-4 h-4 mr-2" />
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
              placeholder="yourusername"
              disabled={saving || processingImage}
              className="w-full p-4 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-zinc-500 focus:outline-none disabled:opacity-50 transition-colors text-white placeholder-zinc-400"
              maxLength={30}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Only lowercase letters, numbers, and underscores. {formData.username.length}/30 characters
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-3 text-zinc-300 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell people about yourself..."
              rows={3}
              disabled={saving || processingImage}
              className="w-full p-4 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-zinc-500 focus:outline-none resize-none disabled:opacity-50 transition-colors text-white placeholder-zinc-400"
              maxLength={160}
            />
            <p className="text-xs text-zinc-500 mt-1">{formData.bio.length}/160 characters</p>
          </div>

          {/* Save Button */}
          <div className="flex gap-2 sm:gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || processingImage}
              className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 font-medium text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || processingImage || !formData.displayName.trim() || !formData.username.trim()}
              className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 bg-white text-black rounded-xl hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg text-sm sm:text-base"
            >
              {saving ? 'Saving...' : processingImage ? 'Processing...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
