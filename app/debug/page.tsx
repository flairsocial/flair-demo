"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"

export default function DebugPage() {
  const { user } = useUser()
  const [profileData, setProfileData] = useState<any>(null)
  const [postsData, setPostsData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadProfileData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/profile')
      const data = await response.json()
      setProfileData(data)
    } catch (error) {
      console.error('Error loading profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/profile', { method: 'POST' })
      const data = await response.json()
      console.log('Profile refresh result:', data)
      // Reload profile data
      await loadProfileData()
    } catch (error) {
      console.error('Error refreshing profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/posts')
      const data = await response.json()
      setPostsData(data)
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const deletePosts = async () => {
    if (!confirm('Are you sure you want to delete all your posts?')) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/debug/posts', { method: 'DELETE' })
      const data = await response.json()
      console.log('Delete posts result:', data)
      setPostsData(null)
    } catch (error) {
      console.error('Error deleting posts:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Profile & Posts</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Debug */}
          <div className="bg-zinc-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Data</h2>
            
            <div className="space-y-4 mb-6">
              <button
                onClick={loadProfileData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                Load Profile Data
              </button>
              
              <button
                onClick={refreshProfile}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 ml-2"
              >
                Refresh Profile from Clerk
              </button>
            </div>

            {user && (
              <div className="mb-4 p-4 bg-zinc-800 rounded">
                <h3 className="font-semibold mb-2">Current Clerk Data:</h3>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Username:</strong> {user.username || 'Not set'}</p>
                <p><strong>Full Name:</strong> {user.fullName || 'Not set'}</p>
                <p><strong>Image:</strong> {user.imageUrl ? 'Set' : 'Not set'}</p>
              </div>
            )}

            {profileData && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-800 rounded">
                  <h3 className="font-semibold mb-2">Database Profile:</h3>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(profileData.database_profile, null, 2)}
                  </pre>
                </div>
                
                <div className="p-4 bg-zinc-800 rounded">
                  <h3 className="font-semibold mb-2">Clerk Profile:</h3>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(profileData.clerk_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Posts Debug */}
          <div className="bg-zinc-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Posts Data</h2>
            
            <div className="space-y-4 mb-6">
              <button
                onClick={loadPosts}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                Load Recent Posts
              </button>
              
              <button
                onClick={deletePosts}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 ml-2"
              >
                Delete My Posts
              </button>
            </div>

            {postsData && (
              <div className="space-y-4">
                <h3 className="font-semibold">Recent Posts ({postsData.length}):</h3>
                {postsData.map((post: any) => (
                  <div key={post.id} className="p-4 bg-zinc-800 rounded">
                    <p><strong>Title:</strong> {post.title}</p>
                    <p><strong>Author:</strong> {post.author?.display_name} (@{post.author?.username})</p>
                    <p><strong>Created:</strong> {new Date(post.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-zinc-900 p-4 rounded">Loading...</div>
          </div>
        )}
      </div>
    </div>
  )
}
