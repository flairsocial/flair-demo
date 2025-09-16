"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, MessageCircle, Heart, Bookmark, Eye, Calendar, MapPin, Link as LinkIcon, Mail, Grid3X3, FileText } from "lucide-react"
import CollectionDetailModal from "@/components/CollectionDetailModal"
import MessageUserButton from "@/components/MessageUserButton"

interface ProfileData {
  profile: {
    id: string
    clerk_id: string
    username: string
    display_name: string
    bio?: string
    profile_picture_url?: string
    follower_count: number
    following_count: number
    post_count: number
    created_at: string
  }
  posts: any[]
  collections: any[]
}

export default function UserProfilePage() {
  const { username } = useParams()
  const router = useRouter()
  const { user } = useUser()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'collections'>('collections')
  const [selectedCollection, setSelectedCollection] = useState<any>(null)

  useEffect(() => {
    if (username) {
      fetchProfile(username as string)
    }
  }, [username])

  const fetchProfile = async (username: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/profile/${encodeURIComponent(username)}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Profile not found')
        } else {
          setError('Failed to load profile')
        }
        return
      }

      const data = await response.json()
      setProfileData(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffHours < 1) return 'just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleCollectionClick = async (collection: any) => {
    try {
      // Get full collection data with items
      const response = await fetch(`/api/collections/${collection.id}`)
      if (response.ok) {
        const fullCollection = await response.json()
        
        // Transform the collection data to match the modal's expected format
        const collectionWithItems = {
          ...fullCollection,
          items: fullCollection.items || [],
          createdAt: fullCollection.created_at,
          isPublic: fullCollection.is_public
        }
        
        setSelectedCollection(collectionWithItems)
      }
    } catch (error) {
      console.error('Error fetching collection details:', error)
    }
  }

  const handleCloseCollection = () => {
    setSelectedCollection(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="sticky top-0 z-10 border-b border-zinc-900 bg-black/95 backdrop-blur-md">
          <div className="flex items-center p-4">
            <Link href="/community" className="mr-4 p-1.5 rounded-full hover:bg-zinc-800">
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
            </Link>
            <h1 className="text-lg font-medium text-white">Profile</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center h-64 px-4">
          <h2 className="text-xl font-semibold text-zinc-400 mb-2">{error}</h2>
          <p className="text-zinc-500 text-center">The profile you're looking for doesn't exist or is private.</p>
          <Link 
            href="/community" 
            className="mt-4 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back to Community
          </Link>
        </div>
      </div>
    )
  }

  if (!profileData) return null

  const { profile, posts, collections } = profileData

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-zinc-900 bg-black/95 backdrop-blur-md">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <Link href="/community" className="mr-4 p-1.5 rounded-full hover:bg-zinc-800">
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
            </Link>
            <div>
              <h1 className="text-lg font-medium text-white">{profile.display_name}</h1>
              <p className="text-sm text-zinc-400">{posts.length} posts • {collections.length} collections</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-6 border-b border-zinc-900">
        <div className="flex items-start gap-4">
          <Image
            src={profile.profile_picture_url || "/placeholder-user.svg"}
            alt={profile.display_name}
            width={80}
            height={80}
            className="rounded-full ring-4 ring-zinc-800"
          />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1">{profile.display_name}</h2>
            <p className="text-zinc-400 text-lg mb-3">@{profile.username}</p>
            
            {profile.bio && (
              <p className="text-zinc-300 mb-4 leading-relaxed">{profile.bio}</p>
            )}
            
            <div className="flex items-center gap-1 text-zinc-500 text-sm mb-4">
              <Calendar className="w-4 h-4" />
              <span>Joined {formatDate(profile.created_at)}</span>
            </div>
            
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-white">{profile.following_count}</span>
                <span className="text-zinc-400">Following</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-white">{profile.follower_count}</span>
                <span className="text-zinc-400">Followers</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <MessageUserButton
              userId={profile.clerk_id}
              username={profile.username}
              displayName={profile.display_name}
              variant="icon"
            />
            <button className="px-4 py-2 bg-white text-black rounded-full hover:bg-gray-100 transition-colors font-medium">
              Follow
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-900">
        <div className="flex">
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors relative ${
              activeTab === 'collections'
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Collections ({collections.length})
            </div>
            {activeTab === 'collections' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors relative ${
              activeTab === 'posts'
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Posts ({posts.length})
            </div>
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'posts' ? (
          <>
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {collections.length === 0 ? (
              <div className="text-center py-12">
                <Grid3X3 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400">No public collections</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collections.map((collection) => (
                  <CollectionCard 
                    key={collection.id} 
                    collection={collection} 
                    onClick={() => handleCollectionClick(collection)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Collection Detail Modal */}
      <CollectionDetailModal
        collection={selectedCollection}
        isOpen={!!selectedCollection}
        onClose={handleCloseCollection}
        onUpdate={() => {}} // Read-only for other users' profiles
        onDelete={() => {}} // Read-only for other users' profiles
        userId={undefined} // Don't allow community post management for other users
      />
    </div>
  )
}

function PostCard({ post }: { post: any }) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffHours < 1) return 'just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300">
      {/* Post Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
          {formatTimeAgo(post.created_at)}
        </span>
        <span className="text-xs text-zinc-500 capitalize">
          {post.post_type}
        </span>
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-3 text-white leading-tight">{post.title}</h3>
        {post.description && (
          <p className="text-zinc-300 mb-4 leading-relaxed">{post.description}</p>
        )}
        
        {post.image_url && (
          <div className="rounded-xl overflow-hidden border border-zinc-800 mb-4">
            <Image
              src={post.image_url}
              alt={post.title}
              width={600}
              height={400}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {post.link_url && (
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-800/30 backdrop-blur-sm">
            <a 
              href={post.link_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm break-all transition-colors flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4 flex-shrink-0" />
              {post.link_url}
            </a>
          </div>
        )}
      </div>

      {/* Engagement */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-sm text-zinc-400">
            <Heart className="w-5 h-5" />
            <span className="font-medium">{post.like_count || 0}</span>
          </span>
          
          <span className="flex items-center gap-2 text-sm text-zinc-400">
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">{post.comment_count || 0}</span>
          </span>
          
          <span className="flex items-center gap-2 text-sm text-zinc-400">
            <Bookmark className="w-5 h-5" />
            <span className="font-medium">{post.save_count || 0}</span>
          </span>
        </div>
        
        <div className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">
          <Eye className="w-3 h-3" />
          <span className="font-medium">{post.view_count || 0}</span>
        </div>
      </div>
    </div>
  )
}

function CollectionCard({ collection, onClick }: { collection: any, onClick?: () => void }) {
  return (
    <div 
      className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 group cursor-pointer"
      onClick={onClick}
    >
      {/* Collection Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-zinc-100">
            {collection.name}
          </h3>
          {collection.description && (
            <p className="text-zinc-400 text-sm mb-3 leading-relaxed">
              {collection.description}
            </p>
          )}
        </div>
        <div 
          className={`w-3 h-3 rounded-full ${collection.color || 'bg-blue-500'} flex-shrink-0 ml-3 mt-1`}
        />
      </div>

      {/* Collection Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span className="flex items-center gap-1">
            <Grid3X3 className="w-4 h-4" />
            {collection.item_count || 0} items
          </span>
          {collection.view_count > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {collection.view_count}
            </span>
          )}
          {collection.like_count > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {collection.like_count}
            </span>
          )}
        </div>
        
        <div className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full">
          {new Date(collection.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Collection Preview (if items exist) */}
      {collection.item_count > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800/50">
          <div className="text-xs text-zinc-500 text-center">
            {collection.item_count} curated items
          </div>
        </div>
      )}
    </div>
  )
}
