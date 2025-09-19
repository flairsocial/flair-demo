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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        // Convert data URL to base64 for API if it's a data URL
        profilePicture: formData.profilePicture.startsWith('data:') 
          ? formData.profilePicture.split(',')[1] // Extract base64 part
          : formData.profilePicture // Keep URL as is
      }
      
      console.log('Submitting profile data:', {
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
        const errorData = await response.json()
        console.error('Profile update failed:', errorData)
        const errorMessage = errorData.details || errorData.error || response.statusText || 'Unknown error'
        throw new Error(`Failed to update profile: ${errorMessage}`)
      }
      
      const result = await response.json()
      console.log('Profile updated successfully:', result)
      
      // Update profile data locally
      onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving profile:', error)
      // Show error to user (you might want to add a toast notification here)
      alert(`Error updating profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
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
