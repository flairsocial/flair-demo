import { NextResponse } from "next/server"
import { generateText, tool } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"
import type { Product } from "@/lib/types"

// Initialize Groq provider
const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
})

const serperApiKey = process.env.SERPER_API_KEY

function parsePrice(priceString: string | null | undefined): number {
  if (!priceString) return 0
  const numberString = priceString.replace(/[^0-9.]/g, "")
  const price = Number.parseFloat(numberString)
  return isNaN(price) ? 0 : price
}

const searchShoppingTool = tool({
  description:
    "Search for fashion products when users want to see specific items, need shopping recommendations, or when showing examples would enhance your fashion advice.",
  parameters: z.object({
    query: z
      .string()
      .describe("Search query for fashion items (e.g., 'black blazer men', 'summer dresses', 'luxury sneakers')"),
    limit: z.number().optional().default(3).describe("Number of products to show (1-4)"),
  }),
  execute: async ({ query, limit = 3 }) => {
    if (!serperApiKey) {
      return { error: "Product search is currently unavailable" }
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
          num: Math.min(limit, 4) * 2,
          gl: "us",
          hl: "en",
        }),
      })

      if (!response.ok) {
        return { error: "Search temporarily unavailable" }
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
        .slice(0, Math.min(limit, 4))
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
      return { error: "Search failed" }
    }
  },
})

export async function POST(request: Request) {
  try {
    const { message, history = [] } = await request.json()

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 500 })
    }

    console.log(`[Chat] Processing message: "${message}"`)

    // Build conversation history for Groq
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

    // Generate response using Groq
    const { text, toolResults } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages: conversationHistory,
      tools: {
        searchShopping: searchShoppingTool,
      },
      maxTokens: 1000,
      temperature: 0.8, // Higher temperature for more natural, varied responses
    })

    console.log(`[Chat] Generated response length: ${text.length}`)

    // Process any product results from tool calls
    let products: Product[] = []
    if (toolResults && toolResults.length > 0) {
      for (const result of toolResults) {
        if (result.toolName === "searchShopping" && Array.isArray(result.result)) {
          products = result.result.map((p: any) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            brand: p.brand,
            image: p.image,
            link: p.link,
          }))
          console.log(`[Chat] Returning ${products.length} products`)
        }
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
