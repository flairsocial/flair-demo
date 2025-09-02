import { NextResponse } from "next/server"
import { generateText } from "ai"
import { model } from "@/lib/ai-model"
import type { Product } from "@/lib/types"

const serperApiKey = process.env.SERPER_API_KEY

function parsePrice(priceString: string | null | undefined): number {
  if (!priceString) return 0
  const numberString = priceString.replace(/[^0-9.]/g, "")
  const price = Number.parseFloat(numberString)
  return isNaN(price) ? 0 : price
}

async function searchForProducts(query: string, limit = 3): Promise<Product[]> {
  if (!serperApiKey) {
    console.log("[Chat] No Serper API key available")
    return []
  }

  try {
    console.log(`[Chat] Searching for: "${query}"`)

    const response = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `${query} premium quality`,
        num: Math.min(limit, 20) * 2, // Request more to filter better results
        gl: "us",
        hl: "en",
      }),
    })

    if (!response.ok) {
      console.log("[Chat] Search temporarily unavailable")
      return []
    }

    const data = await response.json()
    const results = data.shopping || []

    const products = results
      .filter((item: any) => {
        const price = parsePrice(item.price)
        return (
          item.title &&
          item.link &&
          item.imageUrl &&
          price >= 25 &&
          !item.title.toLowerCase().includes("shein") &&
          !item.title.toLowerCase().includes("wish") &&
          !item.title.toLowerCase().includes("aliexpress")
        )
      })
      .slice(0, Math.min(limit, 20))
      .map((item: any) => ({
        id: item.productId || item.link,
        title: item.title,
        price: parsePrice(item.price),
        brand: item.source || "Brand",
        image: item.imageUrl,
        link: item.link,
      }))

    console.log(`[Chat] Found ${products.length} products`)
    return products
  } catch (error) {
    console.error("[Chat] Search error:", error)
    return []
  }
}

export async function POST(request: Request) {
  try {
    const { message, history = [], productLimit = 6 } = await request.json()

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 500 })
    }

    console.log(`[Chat] Processing message: "${message}" with product limit: ${productLimit}`)

    // Build conversation history for Google AI
    const conversationHistory = history
      .slice(-12) // Keep more history for better conversation flow
      .map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }))

    // Add current user message
    conversationHistory.push({
      role: "user",
      content: message,
    })

    const systemPrompt = `You are Flair, a friendly and knowledgeable AI fashion stylist. You're like having a conversation with a stylish friend who happens to be a fashion expert.

PERSONALITY:
- Conversational and warm, like chatting with a friend
- Enthusiastic about fashion but not overwhelming
- Ask follow-up questions to keep the conversation going
- Share personal styling insights and tips
- Use casual, friendly language while being professional
- Remember what we've talked about and reference it naturally

CONVERSATION STYLE:
- Ask questions back to the user to understand their style better
- Share interesting fashion facts or trends naturally in conversation
- Give specific, actionable advice with reasoning
- Be curious about their preferences and lifestyle
- Suggest follow-ups or related topics they might be interested in

WHEN TO USE SEARCH TOOL:
- User explicitly asks to "show me", "find me", or "I want to see" specific items
- User asks "what should I buy" or "where can I get this"
- When showing actual products would be genuinely helpful
- User mentions wanting to shop for something specific

WHEN TO JUST CHAT:
- General fashion questions and advice
- Styling tips and techniques  
- Trend discussions
- Getting to know their style preferences
- Follow-up questions about previous topics

Keep the conversation flowing naturally. Ask questions, share insights, and be genuinely helpful while maintaining a friendly, approachable tone.`

    // Generate response using Google AI
    const { text } = await generateText({
      model: model,
      system: systemPrompt,
      messages: conversationHistory,
    })

    console.log(`[Chat] Generated response length: ${text.length}`)

    // Check if the user is asking for product recommendations
    let products: Product[] = []
    const userMessage = message.toLowerCase()
    const aiResponse = text.toLowerCase()
    
    // Enhanced keyword detection for product search
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
      userMessage.includes(keyword)
    ) || fashionItems.some(item => userMessage.includes(item))
    
    if (hasProductRequest && serperApiKey) {
      // Extract search terms from the user message
      let searchQuery = message
      
      // Remove common question words to get better search terms
      searchQuery = searchQuery.replace(/\b(show me|find me|where can i get|i want to buy|looking for|need some|recommend|suggest|shopping for|buy|purchase|what|how|where|when|why|can you|could you|please|help me|i need)\b/gi, '')
      searchQuery = searchQuery.trim()
      
      if (searchQuery.length > 2) {
        console.log(`[Chat] Searching for products with query: "${searchQuery}"`)
        products = await searchForProducts(searchQuery, productLimit)
      }
    }

    // Generate more conversational suggestions
    const generateSuggestions = (userMsg: string, aiResponse: string) => {
      const msgLower = userMsg.toLowerCase()
      const responseLower = aiResponse.toLowerCase()

      // More conversational suggestions based on context
      if (msgLower.includes("trend") || responseLower.includes("trend")) {
        return [
          "What trends should I avoid?",
          "How do I make trends work for my age?",
          "Show me some trending pieces",
          "What's coming next season?",
        ]
      }

      if (msgLower.includes("work") || msgLower.includes("office") || responseLower.includes("professional")) {
        return [
          "How casual can I go at work?",
          "Show me work-appropriate shoes",
          "What about work bags?",
          "Help me transition work to dinner",
        ]
      }

      if (msgLower.includes("color") || responseLower.includes("color")) {
        return [
          "What colors make me look younger?",
          "How do I wear bold colors?",
          "What's my best neutral?",
          "Show me colorful accessories",
        ]
      }

      if (msgLower.includes("body") || msgLower.includes("fit") || responseLower.includes("flattering")) {
        return [
          "What styles flatter my body type?",
          "How do I find the right fit?",
          "What should I avoid wearing?",
          "Show me flattering silhouettes",
        ]
      }

      // Default conversational suggestions
      return [
        "What's your styling philosophy?",
        "How do I develop my personal style?",
        "What are some styling mistakes to avoid?",
        "Show me versatile wardrobe staples",
      ]
    }

    const suggestions = generateSuggestions(message, text)

    return NextResponse.json({
      message: text,
      products,
      suggestions,
    })
  } catch (error: any) {
    console.error("[Chat] Error:", error)

    return NextResponse.json({
      message:
        "Oh no, I'm having a little technical hiccup! But I'm still here and excited to chat about fashion with you. What's on your style mind today? I love talking about everything from everyday outfits to special occasion looks!",
      products: [],
      suggestions: [
        "What's your biggest style challenge?",
        "Tell me about your personal style",
        "What's in your dream closet?",
        "How can I help you feel more confident?",
      ],
    })
  }
}
