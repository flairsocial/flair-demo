import React from 'react'
import { FileAttachmentList } from './FileAttachment'
import type { ChatFile } from '@/lib/file-context'

interface ChatMessageProps {
  message: {
    id: string
    content: string
    sender: 'user' | 'ai'
    timestamp: string
    attachedFiles?: ChatFile[]
  }
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${message.sender === 'user' ? 'bg-white/20 backdrop-blur-sm border border-white/30 text-white' : 'bg-gray-200/10 backdrop-blur-sm border border-gray-700/50 text-gray-100'} rounded-2xl px-5 py-4 shadow-lg`}>
        
        {/* Attached Files Display */}
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <div className="mb-3">
            <FileAttachmentList
              files={message.attachedFiles}
              showRemove={false}
              size="sm"
              maxDisplay={4}
              clickable={true}
            />
          </div>
        )}

        <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium">{message.content}</p>

        <span className={`text-xs mt-3 block font-normal ${message.sender === 'user' ? 'text-white/80' : 'text-gray-400'}`}>
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  )
}

export default ChatMessage
