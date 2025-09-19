"use client"

import { useState, useRef } from "react"
import { Plus, Search, Grid, List, MessageCircle, Heart, Bookmark, Eye, Inbox, Sparkles, Upload, X, Trash2, MoreHorizontal } from "lucide-react"

import Image from "next/image"
import Link from "next/link"
import { useMobile } from "@/hooks/use-mobile"
import { useCommunity } from "@/hooks/use-community"
import { useUser } from "@clerk/nextjs"
import CollectionDetailModal from "@/components/CollectionDetailModal"
import MessageUserButton from "@/components/MessageUserButton"
import { useUnreadMessages } from "@/hooks/use-unread-messages"
import { useCommunityPosts } from "@/lib/react-query-hooks"

export default function CommunityPage() {
  const [viewMode, setViewMode] = useState<'vertical' | 'collage'>('vertical')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<'explore' | 'foryou' | 'following'>('explore')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedCollection, setSelectedCollection] = useState<any>(null)
  const [showCollectionModal, setShowCollectionModal] = useState(false)
  const isMobile = useMobile()
  const { user } = useUser()
  
  // Use real community data (original hooks preserved)
  const { posts, followingPosts, loading, loadingFollowing, createPost, deletePost, creating } = useCommunity()

  // React Query hooks for caching (working endpoint)
  const { data: cachedPosts, isLoading: cacheLoading } = useCommunityPosts({ limit: 20, offset: 0 })

  // Use cached data when available, fall back to original hooks
  const displayPosts = cachedPosts || posts
  const displayFollowingPosts = followingPosts // No following endpoint yet

  // Get posts based on active tab
  const getDisplayPosts = () => {
    switch (activeTab) {
      case 'following':
        return displayFollowingPosts
      case 'foryou':
      case 'explore':
      default:
        return displayPosts
    }
  }
  
  // Get loading state based on active tab
  const getIsLoading = () => {
    switch (activeTab) {
      case 'following':
        return loadingFollowing
      case 'foryou':
      case 'explore':
      default:
        return loading
    }
  }
  
  const finalDisplayPosts = getDisplayPosts()
  const isLoading = getIsLoading()
  const { unreadCount } = useUnreadMessages()

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim().length > 2) {
      try {
        const response = await fetch(`/api/search/users?q=${encodeURIComponent(query)}&limit=10`)
        if (!response.ok) {
          throw new Error('Search failed')
        }
        const users = await response.json()
        setSearchResults(users)
        setShowSearchResults(true)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      }
    } else {
      setShowSearchResults(false)
      setSearchResults([])
    }
  }

  const filteredPosts = searchQuery && !showSearchResults
    ? finalDisplayPosts.filter((post: any) => 
        post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : finalDisplayPosts

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-zinc-900 bg-black/95 backdrop-blur-md">
        <div className="flex items-center justify-between p-4">
          {/* Post Button - Top Left */}
          <button 
            onClick={() => setShowCreatePost(true)}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white text-black rounded-full hover:bg-gray-100 transition-colors font-medium ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            {!isMobile && 'Post'}
          </button>
          
          {/* Tab Navigation - Center */}
          <div className="flex items-center gap-1 bg-zinc-900/50 rounded-full p-1">
            <button
              onClick={() => setActiveTab('explore')}
              className={`${isMobile ? 'px-3 py-2 text-xs' : 'px-6 py-2 text-sm'} rounded-full font-medium transition-all duration-200 ${
                activeTab === 'explore' 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => setActiveTab('foryou')}
              className={`${isMobile ? 'px-3 py-2 text-xs' : 'px-6 py-2 text-sm'} rounded-full font-medium transition-all duration-200 ${
                activeTab === 'foryou' 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              For You
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`${isMobile ? 'px-3 py-2 text-xs' : 'px-6 py-2 text-sm'} rounded-full font-medium transition-all duration-200 ${
                activeTab === 'following' 
                  ? 'bg-white text-black shadow-lg' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Following
            </button>
          </div>

          {/* Messages - Top Right */}
          <Link href="/inbox" className="p-1.5 sm:p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 transition-colors flex items-center justify-center">
            <Inbox className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
        </div>

        {/* Search & View Controls */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder={isMobile ? "Search..." : "Search posts and users..."}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className={`w-full pl-10 pr-4 ${isMobile ? 'py-2 text-sm' : 'py-3'} bg-zinc-900/50 rounded-full border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white placeholder-zinc-400 transition-colors`}
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs text-zinc-500 font-medium px-3 py-2">Users</div>
                    {searchResults.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <Link
                          href={`/profile/${user.username}`}
                          className="flex items-center gap-3 flex-1"
                          onClick={() => {
                            setShowSearchResults(false)
                            setSearchQuery("")
                          }}
                        >
                          <Image
                            src={user.profile_picture_url || "/placeholder-user.svg"}
                            alt={user.display_name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-white">{user.display_name}</div>
                            <div className="text-sm text-zinc-400">@{user.username}</div>
                          </div>
                        </Link>
                        
                        {/* Message button */}
                        <MessageUserButton
                          userId={user.clerk_id}
                          username={user.username}
                          displayName={user.display_name}
                          variant="icon"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-zinc-900/50 rounded-full p-1">
              <button
                onClick={() => setViewMode('vertical')}
                className={`p-2 rounded-full transition-all duration-200 ${
                  viewMode === 'vertical' 
                    ? 'bg-white text-black shadow-lg' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('collage')}
                className={`p-2 rounded-full transition-all duration-200 ${
                  viewMode === 'collage' 
                    ? 'bg-white text-black shadow-lg' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'explore' ? (
          <CommunityFeed 
            posts={filteredPosts} 
            viewMode={viewMode} 
            loading={isLoading} 
            currentUser={user}
            onDeletePost={deletePost}
            onViewCollection={(collection) => {
              setSelectedCollection(collection)
              setShowCollectionModal(true)
            }}
          />
        ) : activeTab === 'following' ? (
          <CommunityFeed 
            posts={displayPosts} 
            viewMode={viewMode} 
            loading={isLoading} 
            currentUser={user}
            onDeletePost={deletePost}
            onViewCollection={(collection) => {
              setSelectedCollection(collection)
              setShowCollectionModal(true)
            }}
          />
        ) : activeTab === 'foryou' ? (
          <div className="text-center py-12">
            <div className="text-zinc-400 text-lg mb-2">For You Feed</div>
            <p className="text-zinc-500">Personalized content coming soon...</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-zinc-400 text-lg mb-2">Following Feed</div>
            <p className="text-zinc-500">Posts from people you follow will appear here</p>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePostModal 
          onClose={() => setShowCreatePost(false)} 
          onSubmit={createPost}
          creating={creating}
        />
      )}

      {/* Collection Detail Modal */}
      {showCollectionModal && selectedCollection && (
        <CollectionDetailModal
          isOpen={showCollectionModal}
          onClose={() => {
            setShowCollectionModal(false)
            setSelectedCollection(null)
          }}
          collection={{
            ...selectedCollection,
            items: selectedCollection.products || []
          }}
          onUpdate={() => {
            // Collection updates would refresh the feed
          }}
          onDelete={() => {
            // Collection deletion would close modal and refresh feed
            setShowCollectionModal(false)
            setSelectedCollection(null)
          }}
          userId={user?.id}
          ownerId={selectedCollection.ownerId} // Pass the collection owner's ID
        />
      )}
    </div>
  )
}

function CommunityFeed({ 
  posts, 
  viewMode, 
  loading, 
  currentUser, 
  onDeletePost,
  onViewCollection 
}: { 
  posts: any[], 
  viewMode: 'vertical' | 'collage', 
  loading: boolean,
  currentUser: any,
  onDeletePost: (postId: string) => Promise<boolean>,
  onViewCollection: (collection: any) => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-zinc-400">Signing In...</div>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-zinc-400 mb-2">Stay Posted</h3>
        <p className="text-zinc-500">Be the first to share something with the community!</p>
      </div>
    )
  }

  if (viewMode === 'vertical') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {posts.map((post) => (
          <PostCard 
            key={post.id} 
            post={post} 
            layout="vertical" 
            currentUser={currentUser}
            onDelete={onDeletePost}
            onViewCollection={onViewCollection}
          />
        ))}
      </div>
    )
  }

  // Collage view (Pinterest-style)
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="break-inside-avoid">
          <PostCard 
            post={post} 
            layout="collage" 
            currentUser={currentUser}
            onDelete={onDeletePost}
            onViewCollection={onViewCollection}
          />
        </div>
      ))}
    </div>
  )
}

function PostCard({ 
  post, 
  layout, 
  currentUser, 
  onDelete,
  onViewCollection 
}: { 
  post: any, 
  layout: 'vertical' | 'collage',
  currentUser: any,
  onDelete: (postId: string) => Promise<boolean>,
  onViewCollection: (collection: any) => void
}) {
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Check if current user is the author of this post
  const isAuthor = currentUser && post.author && 
    (post.author.clerk_id === currentUser.id)

  const handleDelete = async () => {
    setIsDeleting(true)
    const success = await onDelete(post.id)
    if (success) {
      setShowDeleteConfirm(false)
    }
    setIsDeleting(false)
  }

  // Format created_at properly
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

  // Safe access to nested properties
  const author = post.author || {}
  const profilePicture = author.profile_picture_url || "/placeholder-user.svg"
  const displayName = author.display_name || author.username || "Anonymous"
  const username = author.username || "anonymous"
  
  const likeCount = post.like_count || 0
  const commentCount = post.comment_count || 0
  const saveCount = post.save_count || 0
  const viewCount = post.view_count || 0

  if (layout === 'collage') {
    return (
      <div className="relative bg-zinc-900/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 hover:shadow-xl">
        {/* Image */}
        {post.image_url && (
          <div className="aspect-auto">
            <Image
              src={post.image_url}
              alt={post.title}
              width={400}
              height={600}
              className="w-full h-auto object-cover"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link href={`/profile/${username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Image
                src={profilePicture}
                alt={displayName}
                width={24}
                height={24}
                className="rounded-full ring-2 ring-zinc-700"
              />
              <span className="text-sm text-zinc-400 font-medium flex-1">@{username}</span>
            </Link>
            
            {/* Message button for collage layout */}
            <MessageUserButton
              userId={author.clerk_id}
              username={username}
              displayName={displayName}
              variant="icon"
              className="!p-1"
            />
            
            {isAuthor && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                aria-label="Delete post"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <h3 className="font-semibold mb-2 text-white">{post.title}</h3>
          {post.description && (
            <p className="text-sm text-zinc-400 mb-3 line-clamp-2 leading-relaxed">{post.description}</p>
          )}
          
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                <Eye className="w-3 h-3" />
                {viewCount}
              </span>
              <span className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
                <Heart className="w-3 h-3" />
                {likeCount}
              </span>
            </div>
            <span className="text-zinc-500">{formatTimeAgo(post.created_at)}</span>
          </div>
          
          {/* Delete confirmation popup for collage layout */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl p-4 m-4">
                <p className="text-sm text-white mb-3">Delete this post?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Vertical layout (Twitter-style)
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300 hover:shadow-xl">
      {/* Author */}
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/profile/${username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image
            src={profilePicture}
            alt={displayName}
            width={44}
            height={44}
            className="rounded-full ring-2 ring-zinc-700"
          />
          <div className="flex-1">
            <h4 className="font-semibold text-white">{displayName}</h4>
            <p className="text-sm text-zinc-400">@{username}</p>
          </div>
        </Link>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">{formatTimeAgo(post.created_at)}</span>
          
          {/* Message button for vertical layout */}
          <MessageUserButton
            userId={author.clerk_id}
            username={username}
            displayName={displayName}
            variant="icon"
            className="!p-1.5"
          />
          
          {isAuthor && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                aria-label="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              {/* Delete confirmation popup */}
              {showDeleteConfirm && (
                <div className="absolute right-0 top-8 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 p-3 min-w-48">
                  <p className="text-sm text-white mb-3">Delete this post?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="flex-1 px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-3 text-white leading-tight">{post.title}</h3>
        {post.description && (
          <p className="text-zinc-300 mb-4 leading-relaxed">{post.description}</p>
        )}
        
        {post.image_url && (
          <div className="rounded-xl overflow-hidden border border-zinc-800">
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
          <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-800/30 backdrop-blur-sm mt-4">
            <a 
              href={post.link_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm break-all transition-colors"
            >
              {post.link_url}
            </a>
          </div>
        )}

        {/* Collection Preview */}
        {post.collection && (
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-800/30 backdrop-blur-sm mt-4">
            {/* Collection Banner - Match profile page styling */}
            <div className="h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
              {post.collection.customBanner ? (
                // Show custom banner if available
                <Image
                  src={post.collection.customBanner}
                  alt={post.collection.name}
                  fill
                  className="object-cover"
                />
              ) : post.collection.products && post.collection.products.length > 0 ? (
                // Show product images as fallback
                <div className="grid grid-cols-2 h-full">
                  {post.collection.products
                    .slice(0, 4)
                    .map((product: any, index: number) => (
                      <div key={product.id} className="relative">
                        <Image
                          src={product.image || "/placeholder.svg"}
                          alt={product.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                </div>
              ) : (
                // Show default icon if no banner and no items
                <div className="flex items-center justify-center h-full">
                  <div className={`w-12 h-12 rounded-full ${post.collection.color || 'bg-blue-500'} flex items-center justify-center`}>
                    <Grid className="w-6 h-6 text-white" />
                  </div>
                </div>
              )}
              
              {/* Collection overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              {/* Collection info */}
              <div className="absolute bottom-2 left-2 right-2">
                <div className="flex items-center mb-1">
                  <div className={`w-2 h-2 rounded-full ${post.collection.color || 'bg-blue-500'} mr-2`} />
                  <h4 className="text-sm font-medium text-white truncate">{post.collection.name}</h4>
                </div>
                <p className="text-xs text-zinc-300">
                  {post.collection.products ? post.collection.products.length : post.collection.itemCount || 0} item{(post.collection.products ? post.collection.products.length : post.collection.itemCount || 0) !== 1 ? 's' : ''}
                </p>
                {post.collection.description && (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{post.collection.description}</p>
                )}
              </div>
            </div>
            
            {/* Collection Actions - Match profile page */}
            <div className="p-3 flex justify-between items-center">
              <span className="text-xs text-zinc-400">
                Click to view collection
              </span>
              <button 
                onClick={() => onViewCollection({
                  ...post.collection,
                  ownerId: post.author?.clerk_id // Pass the post author's ID as collection owner
                })}
                className="text-xs bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-full text-zinc-300 transition-colors"
              >
                View Full Collection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-1 sm:p-1.5 transition-all duration-200 hover:scale-105 ${
              isLiked ? 'text-red-500' : 'text-zinc-400 hover:text-red-400'
            }`}
          >
            <Heart className={`w-3 h-3 sm:w-5 sm:h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="font-medium">{likeCount}</span>
          </button>
          
          <button className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-1 sm:p-1.5 text-zinc-400 hover:text-blue-400 transition-all duration-200 hover:scale-105">
            <MessageCircle className="w-3 h-3 sm:w-5 sm:h-5" />
            <span className="font-medium">{commentCount}</span>
          </button>
          
          <button 
            onClick={() => setIsSaved(!isSaved)}
            className={`flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm p-1 sm:p-1.5 transition-all duration-200 hover:scale-105 ${
              isSaved ? 'text-blue-500' : 'text-zinc-400 hover:text-blue-400'
            }`}
          >
            <Bookmark className={`w-3 h-3 sm:w-5 sm:h-5 ${isSaved ? 'fill-current' : ''}`} />
            <span className="font-medium">{saveCount}</span>
          </button>
        </div>
        
        <div className="flex items-center justify-center gap-1 text-xs text-zinc-500 bg-zinc-800/50 px-2 sm:px-3 py-1 rounded-full">
          <Eye className="w-3 h-3" />
          <span className="font-medium">{viewCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

function CreatePostModal({ onClose, onSubmit, creating }: { 
  onClose: () => void, 
  onSubmit: (postData: any) => Promise<boolean>,
  creating: boolean 
}) {
  const [postType, setPostType] = useState<'text' | 'image' | 'link'>('text')
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setImageFile(file)
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Convert image to base64 for temporary storage
      // In production, you'd upload to Cloudinary, AWS S3, etc.
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          resolve(reader.result as string)
        }
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      return null
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) return

    let imageUrl: string | undefined

    // Upload image if present
    if (imageFile && postType === 'image') {
      imageUrl = await uploadImage(imageFile) || undefined
    }

    const postData = {
      title: title.trim(),
      description: description.trim() || undefined,
      imageUrl: imageUrl,
      linkUrl: postType === 'link' ? linkUrl.trim() || undefined : undefined,
      postType: postType as 'text' | 'image' | 'link' | 'collection'
    }

    const success = await onSubmit(postData)
    if (success) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-lg border border-zinc-800 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold">Create Post</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
            disabled={creating}
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Post Type */}
          <div className="flex gap-2">
            <button
              onClick={() => setPostType('text')}
              disabled={creating}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                postType === 'text' ? 'bg-white text-black shadow-lg' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              } disabled:opacity-50`}
            >
              Text
            </button>
            <button
              onClick={() => setPostType('image')}
              disabled={creating}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                postType === 'image' ? 'bg-white text-black shadow-lg' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              } disabled:opacity-50`}
            >
              Image
            </button>
            <button
              onClick={() => setPostType('link')}
              disabled={creating}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                postType === 'link' ? 'bg-white text-black shadow-lg' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              } disabled:opacity-50`}
            >
              Link
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-3 text-zinc-300">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your post about?"
              disabled={creating}
              className="w-full p-4 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-zinc-500 focus:outline-none disabled:opacity-50 transition-colors text-white placeholder-zinc-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-3 text-zinc-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              disabled={creating}
              className="w-full p-4 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-zinc-500 focus:outline-none resize-none disabled:opacity-50 transition-colors text-white placeholder-zinc-400"
            />
          </div>

          {/* Conditional fields */}
          {postType === 'image' && (
            <div>
              <label className="block text-sm font-medium mb-3 text-zinc-300">Image</label>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={creating}
                  className="hidden"
                />
                
                {!imagePreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={creating}
                    className="w-full p-8 border-2 border-dashed border-zinc-700 rounded-xl hover:border-zinc-600 transition-colors disabled:opacity-50 text-zinc-400 hover:text-zinc-300"
                  >
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 mb-2" />
                      <span>Click to upload an image</span>
                      <span className="text-xs mt-1">PNG, JPG, GIF up to 10MB</span>
                    </div>
                  </button>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl border border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      disabled={creating}
                      className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black/90 rounded-full transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {postType === 'link' && (
            <div>
              <label className="block text-sm font-medium mb-3 text-zinc-300">Link URL</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={creating}
                className="w-full p-4 bg-zinc-800 rounded-xl border border-zinc-700 focus:border-zinc-500 focus:outline-none disabled:opacity-50 transition-colors text-white placeholder-zinc-400"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            disabled={creating}
            className="flex-1 py-3 px-6 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-all duration-200 disabled:opacity-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || creating}
            className="flex-1 py-3 px-6 bg-white text-black rounded-xl hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
          >
            {creating ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
