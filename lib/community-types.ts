// Community feature types
import type { Collection } from './database-service'

export interface CommunityProfile {
  id: string
  clerk_id: string
  username?: string
  display_name?: string
  bio?: string
  profile_picture_url?: string
  is_public: boolean
  follower_count: number
  following_count: number
  post_count: number
  created_at: string
}

export interface CommunityPost {
  id: string
  profile_id: string
  title?: string
  description?: string
  image_url?: string
  link_url?: string
  post_type: 'image' | 'link' | 'collection' | 'text'
  collection_id?: string
  view_count: number
  like_count: number
  comment_count: number
  save_count: number
  is_public: boolean
  created_at: string
  updated_at: string
  
  // Populated fields
  author?: CommunityProfile
  collection?: Collection
  is_liked?: boolean
  is_saved?: boolean
}

export interface PostComment {
  id: string
  post_id: string
  profile_id: string
  parent_comment_id?: string
  content: string
  like_count: number
  created_at: string
  updated_at: string
  
  // Populated fields
  author?: CommunityProfile
  replies?: PostComment[]
  is_liked?: boolean
}

export interface PostLike {
  id: string
  post_id: string
  profile_id: string
  created_at: string
}

export interface PostSave {
  id: string
  post_id: string
  profile_id: string
  created_at: string
}

export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
  
  // Populated fields
  follower?: CommunityProfile
  following?: CommunityProfile
}

export interface DirectMessage {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  image_url?: string
  is_read: boolean
  created_at: string
  
  // Populated fields
  sender?: CommunityProfile
  recipient?: CommunityProfile
}

export interface MessageThread {
  id: string
  participant_1_id: string
  participant_2_id: string
  last_message_id?: string
  last_activity_at: string
  created_at: string
  
  // Populated fields
  participant_1?: CommunityProfile
  participant_2?: CommunityProfile
  last_message?: DirectMessage
  unread_count?: number
}

export interface CollectionLike {
  id: string
  collection_id: string
  profile_id: string
  created_at: string
}

// Extended Collection type with community features
export interface CommunityCollection extends Collection {
  is_public: boolean
  view_count: number
  like_count: number
  comment_count: number
  author?: CommunityProfile
  is_liked?: boolean
}

// Feed item union type
export type FeedItem = CommunityPost | CommunityCollection

// API request/response types
export interface CreatePostRequest {
  title?: string
  description?: string
  image_url?: string
  link_url?: string
  post_type: 'image' | 'link' | 'collection' | 'text'
  collection_id?: string
}

export interface UpdateProfileRequest {
  username?: string
  display_name?: string
  bio?: string
  profile_picture_url?: string
  is_public?: boolean
}

export interface CreateCommentRequest {
  content: string
  parent_comment_id?: string
}

export interface SendMessageRequest {
  recipient_id: string
  content: string
  image_url?: string
}

export interface CommunityFeedResponse {
  posts: CommunityPost[]
  collections: CommunityCollection[]
  has_more: boolean
  next_cursor?: string
}

export interface SearchResponse {
  users: CommunityProfile[]
  posts: CommunityPost[]
  collections: CommunityCollection[]
  has_more: boolean
}

// Community context types
export interface CommunityContextType {
  // Feed
  feedItems: FeedItem[]
  isLoadingFeed: boolean
  loadFeed: (refresh?: boolean) => Promise<void>
  
  // Posts
  createPost: (post: CreatePostRequest) => Promise<void>
  likePost: (postId: string) => Promise<void>
  savePost: (postId: string) => Promise<void>
  
  // Comments
  addComment: (postId: string, comment: CreateCommentRequest) => Promise<void>
  
  // Profile
  updateProfile: (updates: UpdateProfileRequest) => Promise<void>
  followUser: (userId: string) => Promise<void>
  
  // Messages
  sendMessage: (message: SendMessageRequest) => Promise<void>
  messageThreads: MessageThread[]
  loadMessages: () => Promise<void>
  
  // Search
  searchUsers: (query: string) => Promise<CommunityProfile[]>
  searchPosts: (query: string) => Promise<CommunityPost[]>
  
  // UI State
  viewMode: 'vertical' | 'collage'
  setViewMode: (mode: 'vertical' | 'collage') => void
}
