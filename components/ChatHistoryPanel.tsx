import React, { useState } from 'react'
import { X, Clock, Trash2, MoreVertical, Edit3, Share2 } from 'lucide-react'
import type { ChatHistory } from '@/lib/database-service-v2'

interface ChatHistoryPanelProps {
  showHistory: boolean
  onClose: () => void
  chatHistories: ChatHistory[]
  loadingHistory: boolean
  onLoadChat: (chat: ChatHistory) => void
  onStartNewChat: () => void
  onDeleteChat: (chatId: string) => void
  onRenameChat: (chatId: string, newTitle: string) => void
  onShareChat: (chatId: string) => void
  isMobile: boolean
}

interface ChatItemProps {
  chat: ChatHistory
  onLoad: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
  onShare: () => void
}

function ChatHistoryItem({ chat, onLoad, onDelete, onRename, onShare }: ChatItemProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [newTitle, setNewTitle] = useState(chat.title)

  const handleRename = () => {
    if (newTitle.trim() && newTitle.trim() !== chat.title) {
      onRename(newTitle.trim())
    }
    setIsRenaming(false)
    setShowMenu(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename()
    } else if (e.key === 'Escape') {
      setNewTitle(chat.title)
      setIsRenaming(false)
      setShowMenu(false)
    }
  }

  return (
    <div className="group relative">
      <div
        className="p-3 border border-zinc-800/50 hover:bg-zinc-800/70 cursor-pointer rounded-lg transition-colors"
        onClick={onLoad}
      >
        {isRenaming ? (
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyPress}
            className="w-full bg-zinc-900 border border-zinc-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-white"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            placeholder="Enter chat title..."
          />
        ) : (
          <h4 className="text-sm font-medium truncate pr-8">{chat.title}</h4>
        )}
        
        <p className="text-xs text-zinc-400 mt-1">
          {new Date(chat.updatedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
        <p className="text-xs text-zinc-500 mt-1 truncate">
          {chat.messages.length} messages
        </p>

        {/* 3-dot menu button */}
        <button
          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 transition-all"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          title="More options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <>
            {/* Backdrop to close menu */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute top-8 right-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsRenaming(true)
                  setShowMenu(false)
                }}
              >
                <Edit3 className="w-3 h-3" />
                Rename
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 text-blue-400"
                onClick={(e) => {
                  e.stopPropagation()
                  onShare()
                  setShowMenu(false)
                }}
              >
                <Share2 className="w-3 h-3" />
                Share
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 text-red-400 hover:text-red-300 flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                  setShowMenu(false)
                }}
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function ChatHistoryPanel({
  showHistory,
  onClose,
  chatHistories,
  loadingHistory,
  onLoadChat,
  onStartNewChat,
  onDeleteChat,
  onRenameChat,
  onShareChat,
  isMobile
}: ChatHistoryPanelProps) {
  const handleDeleteChat = (chatId: string) => {
    // Direct delete without confirmation as requested
    onDeleteChat(chatId)
  }

  const handleRenameChat = (chatId: string, newTitle: string) => {
    onRenameChat(chatId, newTitle)
  }

  const handleShareChat = (chatId: string) => {
    onShareChat(chatId)
  }

  if (!showHistory) return null

  return (
    <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose}>
      <div
        className={`bg-zinc-900 ${
          isMobile 
            ? "fixed bottom-0 left-0 right-0 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto" 
            : "fixed right-0 top-0 w-80 h-full p-4 border-l border-zinc-800 overflow-y-auto"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <h3 className="font-medium text-lg">Chat History</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onStartNewChat}
              className="text-xs bg-white text-black px-3 py-1.5 rounded-full hover:bg-zinc-200 transition-colors font-medium"
            >
              New Chat
            </button>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Chat History List */}
        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : chatHistories.length > 0 ? (
          <div className="space-y-2">
            {chatHistories.map((chat) => (
              <ChatHistoryItem
                key={chat.id}
                chat={chat}
                onLoad={() => onLoadChat(chat)}
                onDelete={() => handleDeleteChat(chat.id)}
                onRename={(newTitle) => handleRenameChat(chat.id, newTitle)}
                onShare={() => handleShareChat(chat.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm mb-2">No chat history yet</p>
            <p className="text-zinc-500 text-xs">Start a conversation to see it here</p>
          </div>
        )}

        {/* Usage Info */}
        {chatHistories.length > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <div className="text-xs text-zinc-500 space-y-1">
              <p>{chatHistories.length} conversations saved</p>
              <p>Click the 3-dot menu to rename or share chats</p>
          
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
