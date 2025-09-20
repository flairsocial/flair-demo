"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Search, Plus, MoreVertical, Phone, Video, Info, Send } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useMobile } from "@/hooks/use-mobile"
import { useDirectMessages } from "@/hooks/use-direct-messages"
import { useUser } from "@clerk/nextjs"
import { useUnreadMessages } from "@/hooks/use-unread-messages"
import {
  useDirectMessages as useDirectMessagesQuery
} from "@/lib/react-query-hooks"
import { ProfileNameWithBadge } from "@/components/ProfileNameWithBadge"

// Type definitions for conversations
interface ConversationType {
  id: string
  other_participant?: {
    display_name?: string
    username?: string
    avatar_url?: string
  }
  last_message?: {
    content?: string
    created_at?: string
  }
}

const formatTimeString = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) return 'now'
  if (diffMinutes < 60) return `${diffMinutes}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}

export default function InboxPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchParams = useSearchParams()
  const isMobile = useMobile()
  const { user } = useUser()
  const { refreshUnreadCount } = useUnreadMessages()
  
  // Original hook for core functionality (preserved)
  const { 
    conversations, 
    currentMessages, 
    loading, 
    sending, 
    loadMessages, 
    sendNewMessage, 
    startConversation 
  } = useDirectMessages()

  // React Query hooks for caching (optional layer) - only use working endpoints
  const { data: cachedConversations } = useDirectMessagesQuery()
  // Disabled until API endpoints exist:
  // const { data: cachedUnreadCount } = useUnreadCount()
  // const markAsReadMutation = useMarkAsRead()

  // Use cached data when available, fall back to original hooks
  const displayConversations = cachedConversations?.conversations || conversations
  const displayCurrentMessages = currentMessages

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

  const handleSelectConversation = async (conversation: any) => {
    setSelectedConversation(conversation.id)
    setShowSearchResults(false)
    setSearchQuery("")
    
    // Use original method for now (React Query mutations disabled until API endpoints exist)
    await loadMessages(conversation.id)
    // Refresh unread count after viewing messages
    refreshUnreadCount()
  }

  // Handle URL conversation parameter
  useEffect(() => {
    const conversationId = searchParams.get('conversation')
    if (conversationId && displayConversations.length > 0) {
      const conversation = displayConversations.find((conv: ConversationType) => conv.id === conversationId)
      if (conversation) {
        handleSelectConversation(conversation)
      }
    }
  }, [searchParams, displayConversations])

  const handleStartConversation = async (user: any) => {
    const conversationId = await startConversation(user.clerk_id || user.id)
    if (conversationId) {
      setSelectedConversation(conversationId)
      setShowSearchResults(false)
      setSearchQuery("")
      await loadMessages(conversationId)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return
    
    // Use original method for now (React Query mutations disabled until API endpoints exist)
    const success = await sendNewMessage(selectedConversation, newMessage)
    if (success) {
      setNewMessage("")
      refreshUnreadCount()
    }
  }

  const filteredConversations = showSearchResults ? [] : (searchQuery
    ? displayConversations.filter((conv: any) =>
        conv.other_participant?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.other_participant?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message?.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayConversations)

  // Get the selected conversation data
  const selectedConv = selectedConversation 
    ? displayConversations.find((conv: any) => conv.id === selectedConversation)
    : null

  const sendMessage = () => {
    if (!newMessage.trim()) return
    handleSendMessage()
  }

  if (isMobile && selectedConversation) {
    // Mobile: Full screen conversation view
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Mobile Conversation Header */}
        <div className="flex items-center gap-3 p-4 border-b border-zinc-800 bg-black/95 backdrop-blur-md">
          <button 
            onClick={() => setSelectedConversation(null)}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {selectedConv && (
            <>
              <Image
                src={selectedConv.other_participant?.profile_picture_url || "/placeholder-user.svg"}
                alt={selectedConv.other_participant?.display_name || "User"}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div className="flex-1">
                <ProfileNameWithBadge
                  displayName={selectedConv.other_participant?.display_name || selectedConv.other_participant?.username}
                  username={selectedConv.other_participant?.username}
                  isPro={selectedConv.other_participant?.is_pro}
                  className="flex-1"
                  nameClassName="text-lg font-semibold text-white"
                  usernameClassName="text-sm text-zinc-400"
                  badgeSize="md"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-zinc-500">Loading messages...</div>
            </div>
          ) : currentMessages.length > 0 ? (
            currentMessages.map((message) => (
              <MessageBubble key={message.id} message={message} currentUserId={user?.id} />
            ))
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="text-zinc-500">No messages yet</div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-zinc-800 bg-black/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-3 bg-zinc-900 rounded-full border border-zinc-800 focus:border-zinc-600 focus:outline-none"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="p-3 bg-white text-black rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-zinc-900 bg-black/95 backdrop-blur-md">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/community" className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold">Messages</h1>
          </div>
          
          <button className="p-2 rounded-full bg-white text-black hover:bg-gray-100 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-900/50 rounded-full border border-zinc-800 focus:border-zinc-600 focus:outline-none text-white placeholder-zinc-400"
            />
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        {/* Conversations List */}
        <div className={`${isMobile ? 'w-full' : 'w-1/3 border-r border-zinc-800'} ${selectedConversation && !isMobile ? 'hidden lg:block' : ''}`}>
          <div className="p-4 space-y-2">
            {showSearchResults ? (
              // Search Results
              <>
                <h3 className="text-sm font-semibold text-zinc-400 mb-2">Search Results</h3>
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartConversation(user)}
                    className="w-full p-3 rounded-xl text-left transition-all duration-200 hover:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={user.profile_picture_url || "/placeholder-user.svg"}
                        alt={user.display_name || user.username}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <ProfileNameWithBadge
                          displayName={user.display_name || user.username}
                          username={user.username}
                          isPro={user.is_pro}
                          className="flex-1"
                          nameClassName="text-sm font-semibold text-white truncate"
                          usernameClassName="text-xs text-zinc-400"
                          badgeSize="sm"
                        />
                      </div>
                    </div>
                  </button>
                ))}
                {searchResults.length === 0 && searchQuery.length > 2 && (
                  <div className="text-center py-8">
                    <p className="text-zinc-500">No users found</p>
                  </div>
                )}
              </>
            ) : (
              // Conversations
              <>
                {filteredConversations.map((conversation: ConversationType) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedConversation === conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    formatTimeString={formatTimeString}
                  />
                ))}
                {filteredConversations.length === 0 && conversations.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <p className="text-zinc-500">No conversations yet</p>
                    <p className="text-zinc-600 text-sm mt-1">Search for users to start chatting</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Conversation View - Desktop Only */}
        {!isMobile && (
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800 bg-zinc-900/30">
                  {selectedConv && (
                    <>
                      <Image
                        src={selectedConv.other_participant?.profile_picture_url || "/placeholder-user.svg"}
                        alt={selectedConv.other_participant?.display_name || "User"}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="flex-1">
                        <ProfileNameWithBadge
                          displayName={selectedConv.other_participant?.display_name || selectedConv.other_participant?.username}
                          username={selectedConv.other_participant?.username}
                          isPro={selectedConv.other_participant?.is_pro}
                          className="flex-1"
                          nameClassName="text-lg font-semibold text-white"
                          usernameClassName="text-sm text-zinc-400"
                          badgeSize="md"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                          <Phone className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                          <Video className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-zinc-500">Loading messages...</div>
                    </div>
                  ) : currentMessages.length > 0 ? (
                    currentMessages.map((message) => (
                      <MessageBubble key={message.id} message={message} currentUserId={user?.id} />
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-zinc-500">No messages yet</div>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 p-3 bg-zinc-800 rounded-full border border-zinc-700 focus:border-zinc-600 focus:outline-none"
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <button 
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="p-3 bg-white text-black rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-400 mb-2">Select a conversation</h3>
                  <p className="text-zinc-500">Choose a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationItem({ conversation, isSelected, onClick, formatTimeString }: {
  conversation: any
  isSelected: boolean
  onClick: () => void
  formatTimeString: (dateString: string) => string
}) {
  // Calculate unread count - this would ideally come from the database
  const unreadCount = 0 // TODO: Implement unread count from database

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
        isSelected 
          ? 'bg-white/10 border border-zinc-700' 
          : 'hover:bg-zinc-800/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Image
            src={conversation.other_participant?.profile_picture_url || "/placeholder-user.svg"}
            alt={conversation.other_participant?.display_name || "User"}
            width={48}
            height={48}
            className="rounded-full"
          />
          {/* TODO: Add online status indicator */}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex-1 min-w-0">
              <ProfileNameWithBadge
                displayName={conversation.other_participant?.display_name || conversation.other_participant?.username}
                username={conversation.other_participant?.username}
                isPro={conversation.other_participant?.is_pro}
                className="flex-1"
                nameClassName="text-sm font-semibold text-white truncate"
                usernameClassName="text-xs text-zinc-400"
                badgeSize="sm"
              />
            </div>
            <span className="text-xs text-zinc-500 ml-2">
              {formatTimeString(conversation.last_message_at || new Date().toISOString())}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400 truncate pr-2">
              {conversation.last_message?.content || "No messages yet"}
            </p>
            {unreadCount > 0 && (
              <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ message, currentUserId }: { message: any; currentUserId?: string }) {
  // Check if the current user sent this message by comparing Clerk IDs
  // The message.sender has the user's profile info including clerk_id
  const isCurrentUser = currentUserId && message.sender?.clerk_id === currentUserId
  
  // Debug logging to help troubleshoot
  console.log('[MessageBubble] Debug:', {
    messageId: message.id,
    currentUserId,
    senderClerkId: message.sender?.clerk_id,
    isCurrentUser,
    content: message.content?.substring(0, 20) + '...'
  })
  
  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
        isCurrentUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-zinc-800 text-white'
      }`}>
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${
          isCurrentUser ? 'text-blue-100' : 'text-zinc-400'
        }`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
