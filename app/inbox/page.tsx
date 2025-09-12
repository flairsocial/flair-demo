"use client"

import { useState } from "react"
import { ArrowLeft, Search, Plus, MoreVertical, Phone, Video, Info, Send } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useMobile } from "@/hooks/use-mobile"
import { useDirectMessages } from "@/hooks/use-direct-messages"
import { searchUsers } from "@/lib/database-service"

// Mock conversations for testing
const mockConversations = [
  {
    id: "conv-1",
    participant: {
      username: "fashion_guru",
      display_name: "Sarah Chen",
      profile_picture_url: "/placeholder-user.svg",
      isOnline: true
    },
    lastMessage: {
      content: "Those boots you shared are amazing! Where did you find them?",
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      isRead: false,
      senderId: "user-2"
    },
    unreadCount: 2
  },
  {
    id: "conv-2",
    participant: {
      username: "streetwear_king",
      display_name: "Marcus Williams",
      profile_picture_url: "/placeholder-user.svg",
      isOnline: false
    },
    lastMessage: {
      content: "Thanks for the style advice! 🙏",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      isRead: true,
      senderId: "user-3"
    },
    unreadCount: 0
  },
  {
    id: "conv-3",
    participant: {
      username: "vintage_collector",
      display_name: "Emma Rodriguez",
      profile_picture_url: "/placeholder-user.svg",
      isOnline: true
    },
    lastMessage: {
      content: "I found some amazing vintage pieces at the thrift store today!",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      isRead: true,
      senderId: "user-4"
    },
    unreadCount: 0
  }
]

// Mock messages for a conversation
const mockMessages = [
  {
    id: "msg-1",
    content: "Hey! I saw your post about the vintage leather jacket. Do you know where I can find something similar?",
    senderId: "user-2",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: true
  },
  {
    id: "msg-2", 
    content: "Hi Sarah! Yes, I found it at a small boutique downtown. I can send you the location if you'd like!",
    senderId: "current-user",
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    isRead: true
  },
  {
    id: "msg-3",
    content: "That would be amazing, thank you so much! 😊",
    senderId: "user-2", 
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    isRead: true
  },
  {
    id: "msg-4",
    content: "Those boots you shared are amazing! Where did you find them?",
    senderId: "user-2",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    isRead: false
  }
]

export default function InboxPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedConversation, setSelectedConversation] = useState<any>(null)
  const [newMessage, setNewMessage] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const isMobile = useMobile()
  
  const { 
    conversations, 
    currentMessages, 
    loading, 
    sending, 
    loadMessages, 
    sendNewMessage, 
    startConversation 
  } = useDirectMessages()

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim().length > 2) {
      try {
        const users = await searchUsers(query)
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
    setSelectedConversation(conversation)
    setShowSearchResults(false)
    setSearchQuery("")
    await loadMessages(conversation.id)
  }

  const handleStartConversation = async (user: any) => {
    const conversationId = await startConversation(user.id)
    if (conversationId) {
      const newConv = {
        id: conversationId,
        other_participant: user,
        last_message_at: new Date().toISOString()
      }
      setSelectedConversation(newConv)
      setShowSearchResults(false)
      setSearchQuery("")
      await loadMessages(conversationId)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return
    
    const success = await sendNewMessage(selectedConversation.id, newMessage)
    if (success) {
      setNewMessage("")
    }
  }

  const filteredConversations = showSearchResults ? [] : (searchQuery
    ? conversations.filter((conv: any) =>
        conv.other_participant?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.other_participant?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message?.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations)

  // Get the selected conversation data
  const selectedConv = selectedConversation 
    ? conversations.find(conv => conv.id === selectedConversation) || mockConversations.find(conv => conv.id === selectedConversation)
    : null

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

  const sendMessage = () => {
    if (!newMessage.trim()) return
    // Here you would implement actual message sending
    console.log('Sending message:', newMessage)
    setNewMessage("")
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
                src={selectedConv.participant?.profile_picture_url || selectedConv.other_participant?.profile_picture_url || "/placeholder-user.svg"}
                alt={selectedConv.participant?.display_name || selectedConv.other_participant?.display_name || "User"}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div className="flex-1">
                <h3 className="font-semibold">{selectedConv.participant?.display_name || selectedConv.other_participant?.display_name}</h3>
                <p className="text-sm text-zinc-400">
                  {selectedConv.participant?.isOnline || selectedConv.other_participant?.isOnline ? 'Online' : 'Offline'}
                </p>
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
          {mockMessages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
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
              disabled={!newMessage.trim()}
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
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversation === conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
              />
            ))}
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
                        src={selectedConv.participant?.profile_picture_url || selectedConv.other_participant?.profile_picture_url || "/placeholder-user.svg"}
                        alt={selectedConv.participant?.display_name || selectedConv.other_participant?.display_name || "User"}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{selectedConv.participant?.display_name || selectedConv.other_participant?.display_name}</h3>
                        <p className="text-sm text-zinc-400">
                          {selectedConv.participant?.isOnline || selectedConv.other_participant?.isOnline ? 'Online' : 'Offline'}
                        </p>
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
                  {mockMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
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
                      disabled={!newMessage.trim()}
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

function ConversationItem({ conversation, isSelected, onClick }: {
  conversation: any
  isSelected: boolean
  onClick: () => void
}) {
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
            src={conversation.participant?.profile_picture_url || conversation.other_participant?.profile_picture_url || "/placeholder-user.svg"}
            alt={conversation.participant?.display_name || conversation.other_participant?.display_name || "User"}
            width={48}
            height={48}
            className="rounded-full"
          />
          {(conversation.participant?.isOnline || conversation.other_participant?.isOnline) && (
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-black rounded-full"></div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold truncate">{conversation.participant?.display_name || conversation.other_participant?.display_name}</h4>
            <span className="text-xs text-zinc-500">
              {formatTimeString(conversation.lastMessage?.timestamp?.toString() || conversation.last_message_at || new Date().toISOString())}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400 truncate pr-2">
              {conversation.lastMessage?.content || conversation.last_message?.content || "No messages yet"}
            </p>
            {conversation.unreadCount > 0 && (
              <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {conversation.unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ message }: { message: any }) {
  const isCurrentUser = message.senderId === "current-user"
  
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
          {message.timestamp instanceof Date ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
