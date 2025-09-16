"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import type { CommunityPost } from "@/lib/community-types"

export function useCommunity() {
  const { user } = useUser()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Load community feed
  const loadFeed = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/community?limit=20&offset=0')
      if (!response.ok) {
        throw new Error('Failed to load posts')
      }
      const feedData = await response.json()
      setPosts(feedData)
    } catch (error) {
      console.error('Error loading community feed:', error)
    } finally {
      setLoading(false)
    }
  }

  // Create a new post
  const createPost = async (postData: {
    title: string
    description?: string
    imageUrl?: string
    linkUrl?: string
    postType: 'text' | 'image' | 'link' | 'collection'
    collectionId?: string
  }) => {
    if (!user) return false

    try {
      setCreating(true)
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: postData.title,
          description: postData.description,
          imageUrl: postData.imageUrl,
          linkUrl: postData.linkUrl,
          postType: postData.postType,
          collectionId: postData.collectionId,
        }),
      })

      if (!response.ok) {
        let error: any = { message: 'Unknown error occurred' }
        try {
          error = await response.json()
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError)
          error = { 
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status 
          }
        }
        console.error('Error creating post:', error)
        return false
      }

      // Refresh the feed to show the new post
      await loadFeed()
      return true
    } catch (error) {
      console.error('Error creating post:', error)
      return false
    } finally {
      setCreating(false)
    }
  }

  // Delete a post
  const deletePost = async (postId: string) => {
    if (!user) return false

    try {
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          postId: postId,
        }),
      })

      if (!response.ok) {
        let error: any = { message: 'Unknown error occurred' }
        try {
          error = await response.json()
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError)
          error = { 
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status 
          }
        }
        console.error('Error deleting post:', error)
        return false
      }

      // Refresh the feed to remove the deleted post
      await loadFeed()
      return true
    } catch (error) {
      console.error('Error deleting post:', error)
      return false
    }
  }

  // Load feed on mount and when user changes
  useEffect(() => {
    loadFeed()
  }, [user])

  return {
    posts,
    loading,
    creating,
    createPost,
    deletePost,
    refreshFeed: loadFeed
  }
}
