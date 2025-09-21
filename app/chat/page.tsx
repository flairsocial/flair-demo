"use client"
import { showOutOfCreditsModal } from '@/components/CreditGuard'
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, ArrowLeft, Sparkles, Settings, Clock, Loader2, AlertTriangle, X, Crown, Lock } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import ChatMessage from "@/components/ChatMessage"
import ProductSettingsPopup from "@/components/ProductSettingsPopup"
import FileUpload from "@/components/FileUpload"
import AIToneToggle from "@/components/AIToneToggle"
import { FileAttachmentList } from "@/components/FileAttachment"
import PricingModal from "@/components/PricingModal"
import ChatProductCard from "@/components/ChatProductCard"
import ChatHistoryPanel from "@/components/ChatHistoryPanel"
import ShoppingModeToggle from "@/components/ShoppingModeToggle"
import { useFiles, type ChatFile } from "@/lib/file-context"
import { useAITone } from "@/lib/ai-tone-context"
import { useCredits } from "@/lib/credit-context"
import { useShoppingMode } from "@/lib/shopping-mode-context"
import type { Message, Product } from "@/lib/types"
import { useMobile } from "@/hooks/use-mobile"
import type { ChatHistory, ChatMessage as ChatHistoryMessage } from "@/lib/database-service-v2"
import { useChatHistory } from "@/lib/react-query-hooks"
import { useUser } from "@clerk/nextjs"

interface ChatMessageWithProducts extends Message {
  products?: Product[]
  attachedFiles?: ChatFile[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageWithProducts[]>([
    {
      id: "welcome",
      content:
        "Hi! I'm Flair, your Shopping Assistant. I'm here to help you discover, find amazing pieces, and answer any questions you have. What can I help you with today?",
      sender: "ai",
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([
    "What's trending this season?",
    "Help me find the perfect jeans",
    "Show me business casual looks",
    "I need a black dress for a wedding",
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showPersonalityPopup, setShowPersonalityPopup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showProductSettings, setShowProductSettings] = useState(false)
  const [productCount, setProductCount] = useState(6)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [lastProductQuery, setLastProductQuery] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showPricing, setShowPricing] = useState(false)
  const isMobile = useMobile()
  const { attachedFiles, removeFile, clearFiles } = useFiles()
  const { tone } = useAITone()
  const { credits, useCredits: consumeCredits, checkCreditsAvailable } = useCredits()
  const { mode: shoppingMode } = useShoppingMode()
  const { isSignedIn } = useUser()
  const autoMessageSentRef = useRef(false) // Track if auto-message has been sent

  // React Query hooks for caching (optional layer)
  const { data: cachedChatHistory } = useChatHistory()

  // Use cached data when available, fall back to state
  const displayChatHistories = cachedChatHistory || chatHistories

  // Load chat history on component mount
  useEffect(() => {
    // Use cached data if available, otherwise load fresh
    if (cachedChatHistory) {
      setChatHistories(cachedChatHistory)
    } else {
      loadChatHistory()
    }
  }, [cachedChatHistory])

  const loadChatHistory = async () => {
    try {
      setLoadingHistory(true)
      const response = await fetch('/api/chat-history')
      if (response.ok) {
        const history = await response.json()
        setChatHistories(history)
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const saveChatHistory = async () => {
    if (messages.length <= 1) return // Don't save if only welcome message

    try {
      const chatMessages: ChatHistoryMessage[] = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender === 'ai' ? 'assistant' : 'user',
        timestamp: msg.timestamp,
        attachedFiles: msg.attachedFiles,
        products: msg.products
      }))

      if (currentChatId) {
        // Update existing chat
        await fetch('/api/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            chatId: currentChatId,
            messages: chatMessages
          })
        })
      } else {
        // Create new chat
        const response = await fetch('/api/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            messages: chatMessages
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.chat) {
            setCurrentChatId(result.chat.id)
          }
        }
      }
      
      // Reload chat history to update the list
      loadChatHistory()
    } catch (error) {
      console.error('Error saving chat history:', error)
    }
  }

  const loadChatFromHistory = (chatHistory: ChatHistory) => {
    const chatMessages: ChatMessageWithProducts[] = chatHistory.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      sender: msg.sender === 'assistant' ? 'ai' : 'user',
      timestamp: msg.timestamp,
      attachedFiles: msg.attachedFiles,
      products: msg.products
    }))
    
    setMessages(chatMessages)
    setCurrentChatId(chatHistory.id)
    setShowHistory(false)
  }

  const startNewChat = () => {
    setMessages([{
      id: "welcome",
      content:
        "Hi! I'm Flair, your Shopping Assistant. I'm here to help you discover, find amazing deals, and answer any questions you have. What can I help you with today?",
      sender: "ai",
      timestamp: new Date().toISOString(),
    }])
    setCurrentChatId(null)
    setShowHistory(false)
  }

  useEffect(() => {
    scrollToBottom()

    // Only run auto-message logic once
    if (autoMessageSentRef.current) return

    // Check for automatic message parameter
    const urlParams = new URLSearchParams(window.location.search)
    const autoMessage = urlParams.get("autoMessage")
    const productQuery = urlParams.get("product_query")
    const collectionData = urlParams.get("collection")
    
    console.log('[Chat] URL params check - autoMessage:', autoMessage, 'productQuery:', productQuery, 'collection:', !!collectionData)
    console.log('[Chat] Attached files count:', attachedFiles.length)
    
    if (collectionData) {
      try {
        const collection = JSON.parse(decodeURIComponent(collectionData))
        console.log('[Chat] Auto-analyzing collection:', collection.name)
        autoMessageSentRef.current = true
        
        // Create a comprehensive collection analysis message
        const collectionMessage = `Analyze my collection "${collection.name}". ${collection.description ? `Description: ${collection.description}. ` : ''}This collection contains ${collection.totalItems} items: ${collection.items.map((item: any) => `${item.title} by ${item.brand} ($${item.price})`).join(', ')}. Please provide insights about this collection, suggest similar items, or help me understand the style theme.`
        
        setTimeout(() => {
          handleSendMessage(undefined, collectionMessage)
          // Clear the URL parameter to prevent re-sending
          window.history.replaceState({}, '', '/chat')
        }, 200)
      } catch (error) {
        console.error('Error parsing collection data:', error)
      }
    } else if (autoMessage) {
      console.log('[Chat] Auto-sending message:', autoMessage)
      autoMessageSentRef.current = true // Mark as sent
      // Small delay to ensure file context is loaded
      setTimeout(() => {
        handleSendMessage(undefined, autoMessage)
        // Clear the URL parameter to prevent re-sending
        window.history.replaceState({}, '', '/chat')
      }, 200)
    } else if (productQuery) {
      console.log('[Chat] Auto-sending product query:', productQuery)
      autoMessageSentRef.current = true // Mark as sent
      handleSendMessage(undefined, productQuery)
      // Clear the URL parameter to prevent re-sending
      window.history.replaceState({}, '', '/chat')
    }
  }, []) // Keep empty dependency array

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e?: React.FormEvent, overrideMessage?: string) => {
    if (e) e.preventDefault()
    const messageText = overrideMessage || input.trim()
    if (!messageText) return

    // Check if user has enough credits BEFORE attempting operation
    if (!checkCreditsAvailable(1)) {
      showOutOfCreditsModal()
      return
    }

    console.log(`[Chat UI] Sending message: "${messageText}"`)
    setError(null)

    // Check if this might be a product query and store it
    const messageTextLower = messageText.toLowerCase()
    const productKeywords = [
      'show me', 'find me', 'where can i get', 'i want to buy', 'looking for',
      'need some', 'recommend', 'suggest', 'shopping for', 'buy', 'purchase',
      'where to buy', 'help me find', 'i need a', 'i need some'
    ]
    
    const fashionItems = [
      'dress', 'shirt', 'pants', 'shoes', 'jacket', 'blazer', 'jeans',
      'top', 'skirt', 'sweater', 'coat', 'boots', 'sneakers', 'heels',
      'bag', 'purse', 'accessories', 'jewelry', 'watch', 'scarf'
    ]
    
    const hasProductRequest = productKeywords.some(keyword => 
      messageTextLower.includes(keyword)
    ) || fashionItems.some(item => messageTextLower.includes(item))
    
    if (hasProductRequest) {
      setLastProductQuery(messageText)
    }

    // Add user message immediately
    const userMessage: ChatMessageWithProducts = {
      id: `user-${Date.now()}`,
      content: messageText,
      sender: "user",
      timestamp: new Date().toISOString(),
      attachedFiles: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: messages.slice(-8), // Send recent history for context
          productLimit: productCount, // Include the product limit
          attachedFiles: attachedFiles, // Include attached files
          aiTone: tone, // Send just the tone preference
          shoppingMode: shoppingMode, // Include shopping mode
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log(`[Chat UI] Received response with ${data.products?.length || 0} products`)

      // Consume credits for chat message (1 credit per prompt, builds to 10 after 10-15 prompts)
      consumeCredits(1)

      // Add AI response
      const aiMessage: ChatMessageWithProducts = {
        id: `ai-${Date.now()}`,
        content: data.message,
        sender: "ai",
        timestamp: new Date().toISOString(),
        products: data.products || [],
      }

      setMessages((prev) => [...prev, aiMessage])

      // Update suggestions if provided
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
      }

      // Clear attached files after successful message
      clearFiles()
      
      // Save chat history after successful message exchange
      setTimeout(() => {
        saveChatHistory()
      }, 100) // Small delay to ensure state is updated
    } catch (err: any) {
      console.error("[Chat UI] Error:", err)
      setError(err.message || "Connection issue")

      // Add error message
      const errorMessage: ChatMessageWithProducts = {
        id: `error-${Date.now()}`,
        content: "I'm having a brief connection issue. Could you try asking your question again?",
        sender: "ai",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    handleSendMessage(undefined, suggestion)
  }

  const toggleHistory = () => {
    setShowHistory(!showHistory)
  }

  const handleProductSettingsOpen = () => {
    setShowProductSettings(true)
  }

  const handleProductCountChange = (count: number) => {
    setProductCount(count)
  }

  const handleRefetchProducts = async () => {
    if (!lastProductQuery) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: lastProductQuery,
          history: messages.slice(-8),
          productLimit: productCount, // Send the new product limit
          shoppingMode: shoppingMode, // Include current shopping mode
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to fetch products")
      }

      const data = await response.json()

      // Update the last AI message with new products
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastAiMessageIndex = newMessages.map(m => m.sender).lastIndexOf("ai")
        if (lastAiMessageIndex !== -1) {
          newMessages[lastAiMessageIndex] = {
            ...newMessages[lastAiMessageIndex],
            products: data.products || [],
          }
        }
        return newMessages
      })
    } catch (err: any) {
      console.error("[Chat] Refetch error:", err)
      setError("Failed to update products")
    } finally {
      setIsLoading(false)
    }
  }

  const handleShoppingModeChange = async (newMode: 'default' | 'marketplace') => {
    // Refetch products with new shopping mode if we have a recent product query
    if (lastProductQuery) {
      await handleRefetchProducts()
    }
  }

  const handleToggleChat = () => {
    setIsChatCollapsed(!isChatCollapsed)
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          chatId
        })
      })

      if (response.ok) {
        // If we're deleting the current chat, start a new one
        if (chatId === currentChatId) {
          startNewChat()
        }
        // Reload the chat history
        loadChatHistory()
      } else {
        console.error('Failed to delete chat')
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename',
          chatId,
          title: newTitle
        })
      })

      if (response.ok) {
        loadChatHistory() // Reload to show updated title
      } else {
        console.error('Failed to rename chat')
      }
    } catch (error) {
      console.error('Error renaming chat:', error)
    }
  }

  const handleShareChat = async (chatId: string) => {
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'share',
          chatId
        })
      })

      if (response.ok) {
        const result = await response.json()
        // Copy share URL to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(result.shareUrl)
          // You could add a toast notification here
          console.log('Share URL copied to clipboard:', result.shareUrl)
        } else {
          console.log('Share URL:', result.shareUrl)
        }
      } else {
        console.error('Failed to generate share link')
      }
    } catch (error) {
      console.error('Error sharing chat:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen w-full bg-black">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md pt-4 pb-4 px-4 border-b border-zinc-900">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center">
            <Link href="/" className="mr-3 p-1.5 rounded-full hover:bg-zinc-800 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
            </Link>
            <div className="flex flex-col justify-center">
              <h1 className={`font-medium text-white mt-3 leading-tight ${isMobile ? 'text-base' : 'text-lg'}`}>Flair Agent</h1>
              <button
                onClick={() => setShowPersonalityPopup(true)}
                className={`text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer  text-left leading-tight ${isMobile ? 'text-xs -mt-3' : 'text-xs'}`}
              >
                {isMobile ? 'Shopping Assistant' : 'Your Personal Shopping Assistant'}
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isMobile && (
              <button
                onClick={() => setShowPricing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-blue-400 hover:text-blue-300 font-medium text-xs transition-all duration-300 group"
              >
                <Crown className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" />
                Upgrade Plan
              </button>
            )}
            {isMobile && (
              <button
                onClick={() => setShowPricing(true)}
                className="p-2 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/50 text-blue-400 hover:text-blue-300 transition-all duration-300 flex items-center justify-center"
                aria-label="Upgrade Plan"
              >
                <Crown className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={toggleHistory}
              className={`p-2 rounded-full flex items-center justify-center ${showHistory ? "bg-white text-black" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}
              aria-label="Chat History"
            >
              <Clock className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <Link
              href="/settings"
              className="p-2 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 flex items-center justify-center"
              aria-label="User Settings"
            >
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/20 border border-red-900/30 mx-4 my-2 p-3 rounded-lg flex items-center max-w-4xl mx-auto">
          <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Chat Messages Area */}
      <div className={`flex-1 overflow-y-auto transition-all duration-300 ${isChatCollapsed ? 'max-h-0 opacity-0' : ''}`}>
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChatMessage message={message} />
                {/* Shopping Mode Toggle - Show below AI messages */}
                {message.sender === "ai" && (
                  <div className="mt-2 ml-12">
                    <ShoppingModeToggle 
                      onModeChange={handleShoppingModeChange}
                      className=""
                    />
                  </div>
                )}
                {/* Product recommendations */}
                {message.sender === "ai" && message.products && message.products.length > 0 && (
                  <div className="mt-2 ml-10">
                    <button
                      onClick={handleProductSettingsOpen}
                      className="text-xs text-zinc-400 mb-2 hover:text-white transition-colors cursor-pointer underline decoration-dotted"
                    >
                      Here are some options: (Click to customize)
                    </button>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800">
                      {message.products.slice(0, productCount).map((product) => (
                        <ChatProductCard
                          key={product.id}
                          product={product}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center space-x-2 ml-2"
            >
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-2">
                <Loader2 className="w-5 h-5 text-black animate-spin" strokeWidth={2} />
              </div>
              <p className="text-sm text-zinc-400">Flair is thinking...</p>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className={`sticky bottom-0 left-0 right-0 bg-black border-t border-zinc-800/50 transition-all duration-300 ${isChatCollapsed ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-4 sm:pb-6">
          {/* Collapse/Expand Button */}
          {isChatCollapsed && (
            <div className="mb-3 text-center">
              <button
                onClick={handleToggleChat}
                className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                Expand Chat
              </button>
            </div>
          )}
          
          {/* Attached Files Display */}
          {attachedFiles.length > 0 && !isChatCollapsed && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400">Attached Files ({attachedFiles.length})</span>
                <button
                  onClick={clearFiles}
                  className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  Clear All
                </button>
              </div>
              <FileAttachmentList
                files={attachedFiles}
                onRemove={removeFile}
                size="sm"
                maxDisplay={6}
              />
            </div>
          )}
          
          {/* Suggestions */}
          {suggestions.length > 0 && !isLoading && !isChatCollapsed && (
            <div className="mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestions.slice(0, isMobile ? 2 : 4).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="bg-zinc-800 text-zinc-300 px-3 py-2 rounded-lg text-xs text-left hover:bg-zinc-700 hover:text-white transition-colors truncate"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              
              {/* Upgrade Plan Button - Smaller version in suggestions area */}
              {messages.length > 2 && (
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={() => setShowPricing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 hover:border-blue-400/50 rounded-lg text-blue-400 hover:text-blue-300 font-medium text-sm transition-all duration-300 group"
                  >
                    <Crown className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                    Upgrade for Unlimited AI
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Input form */}
          {!isChatCollapsed && (
            <form onSubmit={handleSendMessage} className="relative">
              <div className="flex items-end space-x-2">
                <FileUpload />
                <div className="flex-1 relative">
                  

                  {/* Access restriction message for users with 0 credits */}
                  {isSignedIn && credits <= 0 && (
                    <div className="mb-2 p-3 bg-zinc-900/50 border border-zinc-700 rounded-lg flex items-center gap-2">
                      <Lock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-zinc-300 font-medium">Out of credits</p>
                        <p className="text-xs text-zinc-400">Upgrade your plan to continue chatting with Flair</p>
                      </div>
                      <button
                        onClick={() => setShowPricing(true)}
                        className="px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium rounded-full hover:from-blue-700 hover:to-purple-700 transition-colors"
                      >
                        Upgrade
                      </button>
                    </div>
                  )}

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      !isSignedIn
                        ? "Sign in to chat with Flair..."
                        : credits <= 0
                        ? "Upgrade to continue chatting..."
                        : isMobile
                        ? "Ask about styles..."
                        : "Ask about styles, outfits, trends..."
                    }
                    className={`w-full ${isMobile ? 'py-3 px-3' : 'py-3.5 px-4'} pr-12 bg-zinc-800 rounded-full text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20 text-sm ${
                      !isSignedIn || credits <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isLoading || !isSignedIn || credits <= 0}
                  />
                  <button
                    type="submit"
                    disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || !isSignedIn || credits <= 0}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white text-black disabled:opacity-50 disabled:bg-zinc-700 transition-colors"
                    aria-label="Send message"
                  >
                    <Send className="w-5 h-5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Product Settings Popup */}
      <ProductSettingsPopup
        isOpen={showProductSettings}
        onClose={() => setShowProductSettings(false)}
        productCount={productCount}
        onProductCountChange={handleProductCountChange}
        onRefetchProducts={handleRefetchProducts}
        onToggleChat={handleToggleChat}
        isChatCollapsed={isChatCollapsed}
      />

      {/* History Panel */}
      <ChatHistoryPanel
        showHistory={showHistory}
        onClose={toggleHistory}
        chatHistories={chatHistories}
        loadingHistory={loadingHistory}
        onLoadChat={loadChatFromHistory}
        onStartNewChat={startNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onShareChat={handleShareChat}
        isMobile={isMobile}
      />

      {/* AI Personality Popup */}
      <AnimatePresence>
        {showPersonalityPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPersonalityPopup(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-zinc-900 rounded-xl p-6 mx-4 max-w-md w-full border border-zinc-800"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">AI Personality</h3>
                <button
                  onClick={() => setShowPersonalityPopup(false)}
                  className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <AIToneToggle />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pricing Modal */}
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />

    </div>
  )
}
