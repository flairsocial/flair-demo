"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, ArrowLeft, Sparkles, Settings, Clock, Loader2, AlertTriangle, LinkIcon, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import ChatMessage from "@/components/ChatMessage"
import ProductSettingsPopup from "@/components/ProductSettingsPopup"
import type { Message, Product } from "@/lib/types"
import { useMobile } from "@/hooks/use-mobile"

interface ChatMessageWithProducts extends Message {
  products?: Product[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageWithProducts[]>([
    {
      id: "welcome",
      content:
        "Hi! I'm your Flair AI stylist. I'm here to help you discover your perfect style, find amazing pieces, and answer any fashion questions you have. What can I help you with today?",
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
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showProductSettings, setShowProductSettings] = useState(false)
  const [productCount, setProductCount] = useState(6)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [lastProductQuery, setLastProductQuery] = useState<string | null>(null)
  const isMobile = useMobile()

  const chatHistory = [
    {
      id: "1",
      title: "Summer Wedding Outfit Ideas",
      date: "Today, 2:30 PM",
      preview: "What should I wear to a summer wedding?",
    },
    {
      id: "2",
      title: "Business Casual Recommendations",
      date: "Yesterday",
      preview: "Help me find a business casual outfit",
    },
  ]

  useEffect(() => {
    scrollToBottom()

    // Check for product query parameter
    const urlParams = new URLSearchParams(window.location.search)
    const productQuery = urlParams.get("product_query")
    if (productQuery) {
      handleSendMessage(undefined, productQuery)
    }
  }, [])

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
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log(`[Chat UI] Received response with ${data.products?.length || 0} products`)

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

  const toggleSettings = () => {
    setShowSettings(!showSettings)
    setShowHistory(false)
  }

  const toggleHistory = () => {
    setShowHistory(!showHistory)
    setShowSettings(false)
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

  const handleToggleChat = () => {
    setIsChatCollapsed(!isChatCollapsed)
  }

  return (
    <div className="flex flex-col h-screen w-full bg-black">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md pt-4 pb-4 px-4 border-b border-zinc-900">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center">
            <Link href="/" className="mr-3 p-1.5 rounded-full hover:bg-zinc-800">
              <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
            </Link>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3">
                <Sparkles className="w-5 h-5 text-black" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-lg font-medium text-white">Flair AI Stylist</h1>
                <p className="text-xs text-zinc-400">Your personal fashion expert</p>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={toggleHistory}
              className={`p-2 rounded-full ${showHistory ? "bg-white text-black" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}
              aria-label="Chat History"
            >
              <Clock className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button
              onClick={toggleSettings}
              className={`p-2 rounded-full ${showSettings ? "bg-white text-black" : "bg-zinc-900 text-white hover:bg-zinc-800"}`}
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </button>
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
                {/* Product recommendations */}
                {message.sender === "ai" && message.products && message.products.length > 0 && (
                  <div className="mt-3 ml-10">
                    <button
                      onClick={handleProductSettingsOpen}
                      className="text-xs text-zinc-400 mb-2 hover:text-white transition-colors cursor-pointer underline decoration-dotted"
                    >
                      Here are some options: (Click to customize)
                    </button>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {message.products.slice(0, productCount).map((product) => (
                        <a
                          key={product.id}
                          href={product.link || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 w-24 bg-zinc-800 p-2 rounded-lg hover:bg-zinc-700 transition-colors group"
                        >
                          <div className="w-full h-20 bg-zinc-700 rounded overflow-hidden relative mb-1.5">
                            <Image
                              src={product.image || "/placeholder.svg?width=96&height=80&query=fashion+item"}
                              alt={product.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <p className="text-[10px] text-white font-medium line-clamp-2 group-hover:underline mb-1">
                            {product.title}
                          </p>
                          <div className="flex flex-col">
                            {product.price && product.price > 0 && (
                              <p className="text-[10px] text-zinc-300">${product.price.toFixed(0)}</p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <LinkIcon className="w-2.5 h-2.5 text-zinc-500 group-hover:text-white" />
                              <span className="text-[8px] text-zinc-500 group-hover:text-white">View</span>
                            </div>
                          </div>
                        </a>
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
            </div>
          )}

          {/* Input form */}
          {!isChatCollapsed && (
            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about styles, outfits, trends..."
                className="w-full py-3.5 px-4 pr-12 bg-zinc-800 rounded-full text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20 text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white text-black disabled:opacity-50 disabled:bg-zinc-700 transition-colors"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" strokeWidth={2} />
              </button>
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

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={toggleSettings}>
          <div
            className={`bg-zinc-900 ${isMobile ? "fixed bottom-0 left-0 right-0 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto" : "fixed right-0 top-0 w-72 h-full p-4 border-l border-zinc-800"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800 mb-3">
              <h3 className="font-medium text-lg">Settings</h3>
              <button onClick={toggleSettings} className="p-1 rounded-full hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-zinc-400">
              Appearance, AI Preferences, Notifications, Data settings would go here.
            </p>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={toggleHistory}>
          <div
            className={`bg-zinc-900 ${isMobile ? "fixed bottom-0 left-0 right-0 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto" : "fixed right-0 top-0 w-72 h-full p-4 border-l border-zinc-800"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800 mb-3">
              <h3 className="font-medium text-lg">Chat History</h3>
              <button onClick={toggleHistory} className="p-1 rounded-full hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className="p-2 border-b border-zinc-800/50 hover:bg-zinc-800/70 cursor-pointer rounded-md"
              >
                <h4 className="text-sm font-medium truncate">{chat.title}</h4>
                <p className="text-xs text-zinc-400 mt-0.5">{chat.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
