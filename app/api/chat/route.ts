import { NextResponse } from "next/server"
import { generateText } from "ai"
import { model } from "@/lib/ai-model"
import type { Product } from "@/lib/types"
import { auth } from '@clerk/nextjs/server'

const serperApiKey = process.env.SERPER_API_KEY

// Function to get user profile for search context
async function getUserProfile(userId?: string) {
  if (!userId) {
    // For demo purposes, also try localStorage fallback via a different approach
    try {
      // This won't work in server context, but kept for consistency
      return null;
    } catch (error) {
      return null;
    }
  }
  
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/profile`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('Could not fetch user profile for search context');
  }
  return null;
}

// Function to get user's saved items for context
async function getUserSavedItems() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/saved`);
    if (response.ok) {
      const savedItems = await response.json();
      return Array.isArray(savedItems) ? savedItems.slice(0, 5) : []; // Limit to 5 most recent for context
    }
  } catch (error) {
    console.log('Could not fetch saved items for context');
  }
  return [];
}

function parsePrice(priceString: string | null | undefined): number {
  if (!priceString) return 0
  const numberString = priceString.replace(/[^0-9.]/g, "")
  const price = Number.parseFloat(numberString)
  return isNaN(price) ? 0 : price
}

async function searchForProducts(query: string, limit = 3, userProfile?: any): Promise<Product[]> {
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

    // Parse budget ranges from user profile
    let minBudget = 0
    let maxBudget = Infinity
    
    if (userProfile?.budgetRange?.length > 0) {
      const budgets = userProfile.budgetRange
      let budgetRanges: number[] = []
      
      budgets.forEach((budget: string) => {
        if (budget === "Under $50") budgetRanges.push(0, 50)
        else if (budget === "$50-$100") budgetRanges.push(50, 100)
        else if (budget === "$100-$250") budgetRanges.push(100, 250)
        else if (budget === "$250-$500") budgetRanges.push(250, 500)
        else if (budget === "$500+") budgetRanges.push(500, 2000)
        else if (budget === "No limit") budgetRanges.push(0, Infinity)
      })
      
      if (budgetRanges.length > 0) {
        minBudget = Math.min(...budgetRanges.filter((_, i) => i % 2 === 0))
        maxBudget = Math.max(...budgetRanges.filter((_, i) => i % 2 === 1))
      }
    }

    const products = results
      .filter((item: any) => {
        const price = parsePrice(item.price)
        
        // Basic quality filters
        const hasBasicInfo = item.title && item.link && item.imageUrl
        const isQualityBrand = !item.title.toLowerCase().includes("shein") &&
                              !item.title.toLowerCase().includes("wish") &&
                              !item.title.toLowerCase().includes("aliexpress")
        const meetsMinPrice = price >= 25
        
        // STRICT budget filtering based on user preferences
        const withinBudget = userProfile?.budgetRange?.length > 0 
          ? (price >= minBudget && price <= maxBudget)
          : true // If no budget set, don't filter by price
        
        return hasBasicInfo && isQualityBrand && meetsMinPrice && withinBudget
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

    console.log(`[Chat] Found ${products.length} products within budget range $${minBudget}-$${maxBudget === Infinity ? '∞' : maxBudget}`)
    return products
  } catch (error) {
    console.error("[Chat] Search error:", error)
    return []
  }
}

export async function POST(request: Request) {
  try {
    const { message, history = [], productLimit = 6 } = await request.json()

    // Get user authentication
    const { userId } = await auth()
    
    // Get user profile and saved items for personalized recommendations
    const [userProfile, savedItems] = await Promise.all([
      getUserProfile(userId || undefined),
      getUserSavedItems()
    ])

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 500 })
    }

    console.log(`[Chat] Processing message: "${message}" with product limit: ${productLimit}`)
    console.log(`[Chat] User has ${savedItems.length} saved items for context`)
    console.log(`[Chat] User profile data:`, userProfile ? 'Profile loaded' : 'No profile data')
    if (userProfile) {
      console.log(`[Chat] Profile contains: age=${userProfile.age}, gender=${userProfile.gender}, styles=${userProfile.style?.length || 0}, budget=${userProfile.budgetRange?.length || 0}`)
    }

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

    // Build comprehensive profile context for AI
    let profileContext = ""
    
    // For guest users, we'll add a note that they can save profile info in localStorage
    // but the server-side API can't access it directly
    if (!userProfile && !userId) {
      profileContext = `
NOTE: This appears to be a guest user. If they have profile information saved locally, suggest they sign in or mention that they can tell you their preferences directly in chat for personalized recommendations.

You should ask them about:
- Their style preferences (casual, formal, streetwear, etc.)
- Their budget range
- Their body type and measurements
- Their lifestyle (office worker, student, etc.)
- What they're shopping for`
    } else if (userProfile) {
      const context = []
      
      // Basic information
      if (userProfile.age) context.push(`• Age: ${userProfile.age} years old`)
      if (userProfile.gender) context.push(`• Gender: ${userProfile.gender}`)
      if (userProfile.bodyType) context.push(`• Body type: ${userProfile.bodyType}`)
      
      // Measurements and sizing
      if (userProfile.height && userProfile.heightUnit) context.push(`• Height: ${userProfile.height} ${userProfile.heightUnit}`)
      if (userProfile.weight && userProfile.weightUnit) context.push(`• Weight: ${userProfile.weight} ${userProfile.weightUnit}`)
      if (userProfile.waistSize) context.push(`• Waist size: ${userProfile.waistSize}`)
      if (userProfile.chestSize) context.push(`• Chest/Bust size: ${userProfile.chestSize}`)
      if (userProfile.hipSize) context.push(`• Hip size: ${userProfile.hipSize}`)
      if (userProfile.shoeSize && userProfile.shoeSizeUnit) context.push(`• Shoe size: ${userProfile.shoeSize} ${userProfile.shoeSizeUnit}`)
      
      // Style preferences
      if (userProfile.style?.length > 0) context.push(`• Style preferences: ${userProfile.style.join(', ')} (THESE ARE THEIR CONFIRMED STYLE PREFERENCES)`)
      if (userProfile.lifestyle) context.push(`• Lifestyle: ${userProfile.lifestyle}`)
      if (userProfile.goals?.length > 0) context.push(`• Style goals: ${userProfile.goals.join(', ')}`)
      
      // Budget and shopping
      if (userProfile.budgetRange?.length > 0) context.push(`• Budget ranges: ${userProfile.budgetRange.join(', ')} (ONLY RECOMMEND ITEMS IN THESE PRICE RANGES)`)
      if (userProfile.shoppingSources?.length > 0) context.push(`• Preferred shopping sources: ${userProfile.shoppingSources.join(', ')}`)
      
      // Additional preferences
      if (userProfile.allergies) context.push(`• Material allergies/preferences: ${userProfile.allergies}`)
      if (userProfile.notes) context.push(`• Additional notes: ${userProfile.notes}`)
      
      if (context.length > 0) {
        profileContext = `
YOU HAVE COMPLETE ACCESS TO THIS USER'S PERSONAL PROFILE:
${context.join('\n')}

${savedItems.length > 0 ? `
USER'S SAVED ITEMS (${savedItems.length} items in their collection):
${savedItems.map((item: any) => `• ${item.title} - ${item.brand} ($${item.price}) - ${item.category}`).join('\n')}

You can reference these saved items to understand their style preferences and suggest similar items or complementary pieces.` : ''}

CRITICAL INSTRUCTIONS:
- You KNOW all this information about the user - never ask for details you already have
- Always reference their specific preferences when making recommendations
- NEVER suggest items outside their budget ranges
- ONLY recommend styles that match their confirmed style preferences
- Use their measurements to suggest appropriate fits and sizes
- Reference their lifestyle when making practical recommendations
- Use their saved items to understand their taste and suggest similar or complementary pieces`
      } else {
        profileContext = "\nNOTE: This user hasn't set up their personal profile yet. You can suggest they complete their profile in settings for more personalized recommendations."
      }
    } else {
      profileContext = "\nNOTE: Unable to access user profile. You can ask them about their preferences directly or suggest they sign in for personalized recommendations."
    }

    const systemPrompt = `You are Flair, a friendly and knowledgeable AI fashion stylist with COMPLETE ACCESS to the user's personal profile information. You have their style preferences, budget, measurements, and shopping history stored in your memory.

IMPORTANT: You have FULL ACCESS to the user's profile data and should act like you know them personally. Never ask for information that's already in their profile - reference it naturally in conversation.

${profileContext ? `\n${profileContext}\n` : ''}

PERSONALITY:
- Conversational and warm, like chatting with a stylish friend who knows you well
- Enthusiastic about fashion but not overwhelming
- Proactive in using their profile info to make personalized suggestions
- Share personal styling insights based on their specific preferences
- Use casual, friendly language while being professional
- Remember and reference their saved preferences naturally

CONVERSATION STYLE:
- Reference their profile information naturally (don't ask for info you already have)
- Make personalized recommendations based on their budget, style, and body type
- Give specific, actionable advice tailored to their preferences
- Suggest items that match their exact style preferences and budget range
- Be proactive about helping them based on what you know about them

PROFILE AWARENESS:
- You KNOW their budget range, style preferences, body type, and measurements
- You KNOW their preferred shopping sources and lifestyle
- You can reference their saved items and shopping history
- Never say "I don't have access" - you have ALL their information
- Use their profile data to filter and suggest appropriate items

WHEN TO USE SEARCH TOOL:
- User explicitly asks to "show me", "find me", or "I want to see" specific items
- User asks "what should I buy" or "where can I get this"
- When showing actual products would be genuinely helpful
- User mentions wanting to shop for something specific
- ALWAYS filter results by their budget and style preferences

STRICT FILTERING RULES:
- Only suggest items within their specified budget ranges
- Only recommend styles that match their selected preferences
- Respect their shopping source preferences
- Consider their body type and measurements when suggesting fits

Keep the conversation flowing naturally while being their knowledgeable, well-informed personal stylist.`

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
      
      // Enhance search query with user profile context
      if (userProfile && searchQuery.length > 2) {
        const profileEnhancements = []
        if (userProfile.style?.length > 0) profileEnhancements.push(...userProfile.style)
        
        if (profileEnhancements.length > 0) {
          searchQuery = `${searchQuery} ${profileEnhancements.join(' ')}`
        }
      }
      
      if (searchQuery.length > 2) {
        console.log(`[Chat] Searching for products with query: "${searchQuery}"`)
        products = await searchForProducts(searchQuery, productLimit, userProfile)
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
