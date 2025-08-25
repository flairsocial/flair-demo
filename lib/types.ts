export interface Product {
  id: string
  image: string
  title: string
  price: number
  brand: string
  category?: string
  description?: string
  width?: number
  height?: number
  photographer?: string
  photographer_url?: string
  hasAiInsights?: boolean
  saved?: boolean
  user?: {
    username: string
    name: string
    verified: boolean
    celebrity: boolean
    avatar: string
  }
  link?: string // Add this for chat product recommendations
}

export interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: string
  // products?: Product[] // This will be handled in ChatPage's specific message type
}
