"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, MessageCircle, Heart, Bookmark, Eye, Calendar, MapPin, Link as LinkIcon, Mail, Grid3X3, FileText } from "lucide-react"
import CollectionDetailModal from "@/components/CollectionDetailModal"
import { useMobile } from "@/hooks/use-mobile"
import MessageUserButton from "@/components/MessageUserButton"
import FollowButton from "@/components/FollowButton"
import { ProfileNameWithBadge } from "@/components/ProfileNameWithBadge"

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
    is_pro?: boolean
  }
  posts: any[]
  collections: any[]
}

export default function UserProfilePage() {
  const { username } = useParams()
  const router = useRouter()
  const { user } = useUser()
  const isMobile = useMobile()
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
            <Link href="/community" className="mr-3 sm:mr-4 p-1.5 rounded-full hover:bg-zinc-800 touch-manipulation">
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
            </Link>
            <div className="min-w-0">
              <h1 className={`font-medium text-white truncate ${isMobile ? 'text-lg' : 'text-lg'}`}>{profile.display_name}</h1>
              <p className={`text-zinc-400 truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>{posts.length} posts • {collections.length} collections</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className={`p-4 sm:p-6 border-b border-zinc-900`}>
        <div className="flex items-start gap-3 sm:gap-4">
          <Image
            src={profile.profile_picture_url || "/placeholder-user.svg"}
            alt={profile.display_name}
            width={isMobile ? 64 : 80}
            height={isMobile ? 64 : 80}
            className="rounded-full ring-2 sm:ring-4 ring-zinc-800"
          />
          <div className="flex-1 min-w-0">
            <ProfileNameWithBadge
              displayName={profile.display_name}
              username={profile.username}
              isPro={profile.is_pro}
              className="mb-2 sm:mb-3"
              nameClassName={`font-bold text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}
              usernameClassName={`text-zinc-400 ${isMobile ? 'text-base' : 'text-lg'}`}
              badgeSize="md"
            />
            
            {profile.bio && (
              <p className={`text-zinc-300 mb-3 sm:mb-4 leading-relaxed ${isMobile ? 'text-sm' : 'text-base'}`}>{profile.bio}</p>
            )}
            
            <div className="flex items-center gap-1 text-zinc-500 text-xs sm:text-sm mb-3 sm:mb-4">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Joined {formatDate(profile.created_at)}</span>
            </div>
            
            <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm">
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
          
          <div className="flex flex-col sm:flex-row gap-2">
            <MessageUserButton
              userId={profile.clerk_id}
              username={profile.username}
              displayName={profile.display_name}
              variant="icon"
            />
            <FollowButton
              targetUserId={profile.clerk_id}
              targetUsername={profile.username}
              className={`px-3 sm:px-4 py-2 rounded-full font-medium touch-manipulation ${isMobile ? 'text-sm' : 'text-base'}`}
              showText={true}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-900">
        <div className="flex">
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 text-center font-medium transition-colors relative touch-manipulation ${
              activeTab === 'collections'
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <Grid3X3 className="w-4 h-4" />
              <span className={isMobile ? 'text-xs' : 'text-base'}>Collections ({collections.length})</span>
            </div>
            {activeTab === 'collections' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 text-center font-medium transition-colors relative touch-manipulation ${
              activeTab === 'posts'
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <FileText className="w-4 h-4" />
              <span className={isMobile ? 'text-xs' : 'text-base'}>Posts ({posts.length})</span>
            </div>
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {activeTab === 'posts' ? (
          <>
            {posts.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-zinc-700 mx-auto mb-3 sm:mb-4" />
                <p className="text-zinc-400 text-sm sm:text-base">No posts yet</p>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} isMobile={isMobile} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {collections.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Grid3X3 className="w-8 h-8 sm:w-12 sm:h-12 text-zinc-700 mx-auto mb-3 sm:mb-4" />
                <p className="text-zinc-400 text-sm sm:text-base">No public collections</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
                {collections.map((collection) => (
                  <CollectionCard 
                    key={collection.id} 
                    collection={collection} 
                    onClick={() => handleCollectionClick(collection)}
                    isMobile={isMobile}
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

function PostCard({ post, isMobile }: { post: any, isMobile?: boolean }) {
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
    <div className={`bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 ${isMobile ? 'p-4' : 'p-6'}`}>
      {/* Post Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <span className={`text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          {formatTimeAgo(post.created_at)}
        </span>
        <span className={`text-zinc-500 capitalize ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          {post.post_type}
        </span>
      </div>

      {/* Content */}
      <div className="mb-3 sm:mb-4">
        <h3 className={`font-semibold mb-2 sm:mb-3 text-white leading-tight ${isMobile ? 'text-lg' : 'text-xl'}`}>{post.title}</h3>
        {post.description && (
          <p className={`text-zinc-300 mb-3 sm:mb-4 leading-relaxed ${isMobile ? 'text-sm' : 'text-base'}`}>{post.description}</p>
        )}
        
        {post.image_url && (
          <div className="rounded-xl overflow-hidden border border-zinc-800 mb-3 sm:mb-4">
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
          <div className={`border border-zinc-800 rounded-xl bg-zinc-800/30 backdrop-blur-sm ${isMobile ? 'p-3' : 'p-4'}`}>
            <a 
              href={post.link_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={`text-blue-400 hover:text-blue-300 break-all transition-colors flex items-center gap-2 ${isMobile ? 'text-xs' : 'text-sm'}`}
            >
              <LinkIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              {post.link_url}
            </a>
          </div>
        )}
      </div>

      {/* Engagement */}
      <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-zinc-800/50">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className={`flex items-center gap-2 text-zinc-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-medium">{post.like_count || 0}</span>
          </span>
          
          <span className={`flex items-center gap-2 text-zinc-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-medium">{post.comment_count || 0}</span>
          </span>
          
          <span className={`flex items-center gap-2 text-zinc-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-medium">{post.save_count || 0}</span>
          </span>
        </div>
        
        <div className={`flex items-center gap-1 text-zinc-500 bg-zinc-800/50 px-2 sm:px-3 py-1 rounded-full ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          <Eye className="w-3 h-3" />
          <span className="font-medium">{post.view_count || 0}</span>
        </div>
      </div>
    </div>
  )
}

function CollectionCard({ collection, onClick, isMobile }: { collection: any, onClick?: () => void, isMobile?: boolean }) {
  return (
    <div 
      className={`bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 group cursor-pointer touch-manipulation ${isMobile ? 'p-4' : 'p-6'}`}
      onClick={onClick}
    >
      {/* Collection Header */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-white mb-2 group-hover:text-zinc-100 truncate ${isMobile ? 'text-base' : 'text-lg'}`}>
            {collection.name}
          </h3>
          {collection.description && (
            <p className={`text-zinc-400 mb-2 sm:mb-3 leading-relaxed line-clamp-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              {collection.description}
            </p>
          )}
        </div>
        <div 
          className={`rounded-full ${collection.color || 'bg-blue-500'} flex-shrink-0 ml-2 sm:ml-3 mt-1 ${isMobile ? 'w-2.5 h-2.5' : 'w-3 h-3'}`}
        />
      </div>

      {/* Collection Stats */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 sm:gap-4 text-zinc-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          <span className="flex items-center gap-1">
            <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4" />
            {collection.item_count || 0} items
          </span>
          {collection.view_count > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              {collection.view_count}
            </span>
          )}
          {collection.like_count > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
              {collection.like_count}
            </span>
          )}
        </div>
        
        <div className={`text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded-full ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          {new Date(collection.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Collection Preview (if items exist) */}
      {collection.item_count > 0 && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-zinc-800/50">
          <div className={`text-zinc-500 text-center ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            {collection.item_count} curated items
          </div>
        </div>
      )}
    </div>
  )
}
