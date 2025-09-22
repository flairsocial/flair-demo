"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Heart, MessageCircle, Loader2, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { ProfileNameWithBadge } from "@/components/ProfileNameWithBadge"

interface Comment {
  id: string
  content: string
  created_at: string
  author: {
    id: string
    username: string
    display_name: string
    profile_picture_url?: string
    is_pro?: boolean
  }
  replies?: Comment[]
  like_count?: number
}

interface Post {
  id: string
  title: string
  description?: string
  image_url?: string
  author: {
    id: string
    username: string
    display_name: string
    profile_picture_url?: string
    is_pro?: boolean
  }
  created_at: string
  like_count: number
  comment_count: number
}

interface CommentModalProps {
  isOpen: boolean
  onClose: () => void
  post: Post | null
  onLikeUpdate?: (liked: boolean, likeCount: number) => void
  onCommentUpdate?: (commentCount: number) => void
  onCommentDelete?: (commentCount: number) => void
}

export default function CommentModal({
  isOpen,
  onClose,
  post,
  onLikeUpdate,
  onCommentUpdate
}: CommentModalProps) {
  const { user } = useUser()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [totalComments, setTotalComments] = useState(0)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && post) {
      loadComments()
      loadLikeStatus()
    }
  }, [isOpen, post])

  const loadComments = async () => {
    if (!post) return

    try {
      setLoading(true)
      const response = await fetch(`/api/community/comments?postId=${post.id}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
        setTotalComments(data.totalCount || 0)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLikeStatus = async () => {
    if (!post) return

    try {
      const response = await fetch(`/api/community/likes?postId=${post.id}`)
      if (response.ok) {
        const data = await response.json()
        setLiked(data.liked)
        setLikeCount(data.likeCount)
      }
    } catch (error) {
      console.error('Error loading like status:', error)
    }
  }

  const handleLike = async () => {
    if (!post || !user) return

    try {
      const action = liked ? 'unlike' : 'like'
      const response = await fetch('/api/community/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, action })
      })

      if (response.ok) {
        const newLiked = !liked
        const newLikeCount = liked ? likeCount - 1 : likeCount + 1
        setLiked(newLiked)
        setLikeCount(newLikeCount)
        onLikeUpdate?.(newLiked, newLikeCount)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handleSubmitComment = async () => {
    if (!post || !newComment.trim() || !user) return

    try {
      setSubmitting(true)
      const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          content: newComment.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        setComments([data.comment, ...comments])
        setTotalComments(data.commentCount)
        setNewComment("")
        onCommentUpdate?.(data.commentCount)
        // Scroll to bottom to show new comment
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/community/comments?commentId=${commentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        // Remove the deleted comment from the list
        setComments(comments.filter(comment => comment.id !== commentId))
        setTotalComments(data.commentCount)
        onCommentUpdate?.(data.commentCount)
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
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

  if (!post) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-900 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-zinc-800">
              <h2 className="text-base font-semibold">Comments</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col max-h-[calc(70vh-60px)]">
              {/* Comments Section */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-6">
                    <MessageCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-400 text-sm">No comments yet</p>
                    <p className="text-zinc-500 text-xs">Be the first to share your thoughts!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={user?.id}
                      onDelete={handleDeleteComment}
                    />
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Comment Input */}
              {user && (
                <div className="p-3 border-t border-zinc-800">
                  <div className="flex gap-2">
                    <Image
                      src={user.imageUrl || "/placeholder-user.svg"}
                      alt={user.fullName || "You"}
                      width={24}
                      height={24}
                      className="rounded-full flex-shrink-0 w-6 h-6"
                    />
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSubmitComment()
                          }
                        }}
                        placeholder="Write a comment..."
                        className="flex-1 bg-zinc-800 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                        disabled={submitting}
                      />
                      <button
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim() || submitting}
                        className="p-1.5 bg-white text-black rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CommentItem({
  comment,
  currentUserId,
  onDelete
}: {
  comment: Comment
  currentUserId?: string
  onDelete?: (commentId: string) => Promise<void>
}) {
  return (
    <div className="flex gap-2 group">
      <Image
        src={comment.author.profile_picture_url || "/placeholder-user.svg"}
        alt={comment.author.display_name}
        width={20}
        height={20}
        className="rounded-full flex-shrink-0 w-5 h-5 object-cover"
      />
      <div className="flex-1 min-w-0">
        <div className="px-3 py-2">
          <Link
            href={`/profile/${comment.author.username}`}
            className="hover:opacity-80 transition-opacity"
          >
            <ProfileNameWithBadge
              displayName={comment.author.display_name}
              username={comment.author.username}
              isPro={comment.author.is_pro}
              nameClassName="text-sm font-medium text-white"
              usernameClassName="text-xs text-zinc-400"
              badgeSize="sm"
            />
          </Link>
          <p className="text-sm text-zinc-300 mt-1">{comment.content}</p>
        </div>
        <div className="flex items-center justify-between mt-1 ml-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{formatTimeAgo(comment.created_at)}</span>
            <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Reply
            </button>
            <button className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>{comment.like_count || 0}</span>
            </button>
          </div>

          {/* Delete button - only show for comment author */}
          {currentUserId && comment.author.id === currentUserId && (
            <button
              onClick={() => onDelete?.(comment.id)}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors p-1"
              title="Delete comment"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-3 mt-2 space-y-2">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(dateString: string) {
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
