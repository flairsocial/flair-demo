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

  // Enhanced real-time data fields
  reviews?: {
    rating: number
    count: number
    topReviews?: Array<{
      author: string
      date: string
      rating: number
      content: string
      verified: boolean
    }>
  }
  specifications?: {
    dimensions?: string
    weight?: string
    materials?: string[]
    features?: string[]
    warranty?: string
    manufacturer?: string
    model?: string
    color?: string
    size?: string
  }
  availability?: {
    inStock: boolean
    shipping: string
    delivery: string
    stores?: Array<{
      name: string
      distance?: number
      address?: string
    }>
  }
  realTimeData?: {
    lastUpdated: string
    sourceUrl: string
    confidence: number
    extractedAt: string
  }
}

export interface Message {
  id: string
  content: string
  sender: "user" | "ai"
  timestamp: string
  // products?: Product[] // This will be handled in ChatPage's specific message type
}

export interface Collection {
  id: string
  name: string
  color: string
  createdAt: string
  itemIds: string[]
  customBanner?: string // Optional custom banner image URL
  description?: string // Optional collection description
}
