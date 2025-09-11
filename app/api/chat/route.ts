import { NextResponse } from "next/server"
import { generateText } from "ai"
import { getModelForUser } from "@/lib/ai-model"
import type { Product } from "@/lib/types"
import { auth } from '@clerk/nextjs/server'
import { getProfile, getSavedItems } from "@/lib/profile-storage"
import { searchForProducts, searchForCompetitorProducts } from "@/lib/products-service"
import { ImageAnalysisService } from "@/lib/image-analysis-service"

const serperApiKey = process.env.SERPER_API_KEY

// Function to get user profile directly from shared storage
async function getUserProfile(userId?: string) {
  try {
    const savedProfile = getProfile(userId || undefined)
    
    if (savedProfile && Object.keys(savedProfile).length > 0) {
      return savedProfile
    }
    
    return null
  } catch (error) {
    console.error('[Chat] Error accessing profile storage:', error)
    return null
  }
}

// Function to get user's saved items for context
async function getUserSavedItems(userId?: string) {
  try {
    const savedItems = getSavedItems(userId || undefined)
    return Array.isArray(savedItems) ? savedItems.slice(0, 5) : [] // Limit to 5 most recent for context
  } catch (error) {
    console.log('Could not fetch saved items for context')
    return []
  }
}

export async function POST(request: Request) {
  try {
    const { message, history = [], productLimit = 6, attachedFiles = [], aiTone = "casual", userPlan = "plus" } = await request.json()

    console.log(`[Chat API] Processing message: "${message}"`)
    console.log(`[Chat API] Attached files: ${attachedFiles.length}`)
    console.log(`[Chat API] Received user plan: "${userPlan}"`)

    // Get user authentication and profile
    const { userId } = await auth()
    const sessionId = userId || `anonymous-${Date.now()}`
    
    // Get user profile and saved items
    const [userProfile, savedItems] = await Promise.all([
      getUserProfile(userId || undefined),
      getUserSavedItems(userId || undefined)
    ])

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 500 })
    }
    
    // Check Azure OpenAI availability for pro users
    if ((userPlan === 'plus' || userPlan === 'pro') && !process.env.AZURE_OPENAI_API_KEY) {
      return NextResponse.json({ error: "Pro AI service unavailable" }, { status: 500 })
    }

    // Get the appropriate model based on user plan
    const selectedModel = getModelForUser(userPlan)

    // Extract user-attached products from conversation
    const userAttachedProducts: Product[] = []
    
    // Look through conversation history for user-attached products
    history.forEach((msg: any) => {
      if (msg.sender === 'user' && msg.attachedFiles) {
        msg.attachedFiles.forEach((file: any) => {
          if (file.type === 'product' && file.metadata) {
            userAttachedProducts.push(file.metadata)
          }
        })
      }
    })
    
    // Also check current request for attached products
    if (attachedFiles && attachedFiles.length > 0) {
      attachedFiles.forEach((file: any) => {
        if (file.type === 'product' && file.metadata) {
          userAttachedProducts.push(file.metadata)
        }
      })
    }
    
    const mostRecentUserProduct = userAttachedProducts[userAttachedProducts.length - 1]

    // Build conversation history
    const conversationHistory = history
      .slice(-6)
      .map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }))

    // Process attached files for visual search
    let fileContext = ""
    let imageAnalysisQuery = ""
    let visualSearchProducts: Product[] = []
    
    if (attachedFiles.length > 0) {
      const fileDescriptions = []
      
      for (const file of attachedFiles) {
        if (file.type === 'image' && file.url) {
          try {
            const analysisResult = await ImageAnalysisService.findVisuallySimilarProducts(
              file.url,
              selectedModel,
              { min: 10, max: 500 }
            )
            
            if (analysisResult && analysisResult.products && analysisResult.products.length > 0) {
              visualSearchProducts = analysisResult.products.slice(0, productLimit)
              imageAnalysisQuery = analysisResult.analysis || ""
              fileDescriptions.push(`Image analysis: ${imageAnalysisQuery}`)
            }
          } catch (error) {
            console.error('Image analysis failed:', error)
            fileDescriptions.push(`Image uploaded: ${file.originalName || 'image'}`)
          }
        } else {
          fileDescriptions.push(`Attachment: ${file.originalName || file.type}`)
        }
      }
      
      if (fileDescriptions.length > 0) {
        fileContext = `\n\nFiles attached: ${fileDescriptions.join(', ')}`
      }
    }

    // Add current user message with file context
    const userMessageWithContext = message + fileContext
    conversationHistory.push({
      role: "user",
      content: userMessageWithContext,
    })

    // Build profile context for AI
    let profileContext = ""
    
    if (!userProfile && !userId) {
      profileContext = `
NOTE: This appears to be a guest user. If they have profile information saved locally, suggest they sign in or mention that they can tell you their preferences directly in chat for personalized recommendations.

You should ask them about:
- Their product preferences (electronics, home goods, tools, etc.)
- Their budget range
- Their use cases and specific needs
- Their lifestyle (office worker, student, etc.)
`
    } else if (userProfile) {
      const profileParts = []
      if (userProfile.age) profileParts.push(`Age: ${userProfile.age}`)
      if (userProfile.gender) profileParts.push(`Gender: ${userProfile.gender}`)
      if (userProfile.bodyType) profileParts.push(`Body type: ${userProfile.bodyType}`)
      if (userProfile.style && userProfile.style.length > 0) profileParts.push(`Style preferences: ${userProfile.style.join(', ')}`)
      if (userProfile.budgetRange && userProfile.budgetRange.length > 0) profileParts.push(`Budget: ${userProfile.budgetRange.join(', ')}`)
      if (userProfile.lifestyle) profileParts.push(`Lifestyle: ${userProfile.lifestyle}`)
      if (userProfile.goals && userProfile.goals.length > 0) profileParts.push(`Goals: ${userProfile.goals.join(', ')}`)
      
      if (profileParts.length > 0) {
        profileContext = `\n\nUser Profile: ${profileParts.join('. ')}.`
      }
    }

    // Add saved items context
    let savedItemsContext = ""
    if (savedItems.length > 0) {
      const savedItemsText = savedItems.map((item: any) => 
        `${item.title || 'Item'} by ${item.brand || 'Unknown'} ($${item.price || 'N/A'})`
      ).join(', ')
      savedItemsContext = `\n\nRecently saved items: ${savedItemsText}.`
    }

    // Build attached products context
    let attachedProductsContext = ""
    const allAttachedProducts = [...userAttachedProducts, ...visualSearchProducts]
    if (allAttachedProducts.length > 0) {
      const attachedProductsText = allAttachedProducts.map((product: any) => 
        `"${product.title || 'Product'}" by ${product.brand || 'Unknown'} ($${product.price || 'N/A'}) - ${product.description || 'No description'}`
      ).join('\n- ')
      attachedProductsContext = `\n\nUser has attached/referenced these products:\n- ${attachedProductsText}\n\nThe user may be asking about these specific products. Pay special attention to their questions about reviews, quality, pricing, alternatives, or general opinions about these items.`
    }

    // Apply AI tone personality
    const tonePersonalities = {
      casual: "You are Flair, a conversational AI shopping assistant. Use a balanced, helpful tone.",
      friendly: "You are Flair, a warm and friendly AI shopping assistant. Be enthusiastic but not overwhelming.",
      professional: "You are Flair, a professional AI shopping consultant. CRITICAL: Keep ALL responses to maximum 3 sentences. Use precise, expert language."
    }

    const selectedPersonality = tonePersonalities[aiTone as keyof typeof tonePersonalities] || tonePersonalities.casual

    // === PRODUCT SEARCH ANALYSIS ===
    console.log(`[Chat] === PRODUCT SEARCH ANALYSIS ===`)
    console.log(`[Chat] User message: "${message}"`)
    console.log(`[Chat] Most recent user product: ${mostRecentUserProduct ? `${mostRecentUserProduct.title} by ${mostRecentUserProduct.brand}` : 'NONE'}`)
    console.log(`[Chat] Conversation history length: ${history.length}`)
    console.log(`[Chat] Using model: ${userPlan === 'plus' || userPlan === 'pro' ? 'GPT-4 Mini (Azure)' : 'Gemini Flash'}`)

    // Check if user is asking for products or has product context
    const hasProductRequest = 
      // Traditional product search queries
      /\b(?:find|show|search|look|want|need|get|buy|purchase|recommend)\b.*\b(?:product|item|thing|clothing|dress|shirt|pants|shoes|bag|accessory|jewelry|watch|electronics|phone|laptop|headphones|speaker|home|kitchen|tool|book|game)\b/i.test(message) ||
      /\b(?:i need|i want|looking for|searching for|show me|find me|get me)\b/i.test(message) ||
      // Visual search results (attached images)
      visualSearchProducts.length > 0 ||
      // Has attached files (product images)
      attachedFiles.length > 0 ||
      // Has product context and asks about it
      (mostRecentUserProduct && (
        /\b(?:this|that|it|the)\b.*\b(?:item|product|thing|shoe|sneaker|dress|shirt|pants|bag|watch|phone|item)\b/i.test(message) ||
        /\b(?:review|reviews|rating|ratings|feedback|opinion|opinions|quality|worth|good|bad|price|cost|value)\b/i.test(message) ||
        /\b(?:tell me about|what do you think|how is|is it|what about)\b/i.test(message) ||
        /\b(?:look up|research|check|analyze|compare|find|look|search|)\b/i.test(message)
      ))

    const hasCompetitorRequest = mostRecentUserProduct && 
                               (/\b(?:similar|similiar|alternative|competitor|dupe|knockoff|like this|comparable|equivalent|match|matching|same)\b/i.test(message) ||
                                /\b(?:other|different|another)\b.*\b(?:brand|option|choice)\b/i.test(message) ||
                                /\b(?:show|find|get|search)\s+(?:similar|similiar|like|matching|alternative)/i.test(message))

    console.log(`[Chat] === SEARCH TRIGGER EVALUATION ===`)
    console.log(`[Chat] hasProductRequest: ${hasProductRequest}`)
    console.log(`[Chat] - Traditional search patterns: ${/\b(?:find|show|search|look|want|need|get|buy|purchase|recommend)\b.*\b(?:product|item|thing|clothing|dress|shirt|pants|shoes|bag|accessory|jewelry|watch|electronics|phone|laptop|headphones|speaker|home|kitchen|tool|book|game)\b/i.test(message)}`)
    console.log(`[Chat] - Visual search results: ${visualSearchProducts.length > 0} (${visualSearchProducts.length} products)`)
    console.log(`[Chat] - Attached files: ${attachedFiles.length > 0} (${attachedFiles.length} files)`)
    console.log(`[Chat] - Product context queries: ${mostRecentUserProduct && (/\b(?:this|that|it|the)\b.*\b(?:item|product|thing|shoe|sneaker|dress|shirt|pants|bag|watch|phone|laptop)\b/i.test(message) || /\b(?:review|reviews|rating|ratings|feedback|opinion|opinions|quality|worth|good|bad|price|cost|value)\b/i.test(message) || /\b(?:tell me about|what do you think|how is|is it|what about)\b/i.test(message) || /\b(?:look up|research|check|analyze|compare)\b/i.test(message))}`)
    console.log(`[Chat] hasCompetitorRequest: ${hasCompetitorRequest}`)
    console.log(`[Chat] serperApiKey available: ${!!serperApiKey}`)
    console.log(`[Chat] Most recent user product available: ${!!mostRecentUserProduct}`)

    let searchResults: Product[] = []

    // Perform product search if needed
    if ((hasProductRequest || hasCompetitorRequest) && serperApiKey) {
      if (hasCompetitorRequest && mostRecentUserProduct) {
        console.log(`[Chat] COMPETITOR SEARCH TRIGGERED - searching for alternatives to: ${mostRecentUserProduct.title}`)
        
        try {
          searchResults = await searchForCompetitorProducts(
            mostRecentUserProduct,
            'alternatives',
            productLimit,
            userId || undefined,
            userProfile?.budgetRange ? {
              min: parseInt(userProfile.budgetRange[0]?.split('-')[0]?.replace(/\D/g, '') || '0'),
              max: parseInt(userProfile.budgetRange[0]?.split('-')[1]?.replace(/\D/g, '') || '1000')
            } : undefined
          )
        } catch (error) {
          console.error('[Chat] Competitor search failed:', error)
          searchResults = []
        }
      } else if (hasProductRequest) {
        console.log(`[Chat] PRODUCT SEARCH TRIGGERED - hasProductRequest: ${hasProductRequest}`)
        
        // Use visual search results if available, otherwise search based on message
        if (visualSearchProducts.length > 0) {
          console.log(`[Chat] Using VISUAL SEARCH results: ${visualSearchProducts.length} products`)
          searchResults = visualSearchProducts
        } else {
          // Check if user is asking for similar items to their attached product
          const isSimilarRequest = mostRecentUserProduct && 
                                 /\b(?:similar|similiar|like|same|equivalent|alternative|comparable|match|matching)\b/i.test(message)
          
          let searchQuery = message
          if (isSimilarRequest) {
            // Construct a better search query using the attached product context
            searchQuery = `${mostRecentUserProduct.title} ${mostRecentUserProduct.brand} similar alternative ${mostRecentUserProduct.category || 'clothing'}`
            console.log(`[Chat] SIMILAR PRODUCT REQUEST - searching for alternatives to: ${mostRecentUserProduct.title}`)
            console.log(`[Chat] Enhanced search query: "${searchQuery}"`)
          } else {
            console.log(`[Chat] Using TEXT SEARCH for: "${message}"`)
          }
          
          try {
            searchResults = await searchForProducts(
              searchQuery,
              productLimit,
              userId || undefined,
              false,
              userProfile?.budgetRange ? {
                min: parseInt(userProfile.budgetRange[0]?.split('-')[0]?.replace(/\D/g, '') || '0'),
                max: parseInt(userProfile.budgetRange[0]?.split('-')[1]?.replace(/\D/g, '') || '1000')
              } : null
            )
          } catch (error) {
            console.error('[Chat] Product search failed:', error)
            searchResults = []
          }
        }
      }

      console.log(`[Chat] Search completed with ${searchResults.length} results`)
    }

    // Generate AI response
    const systemPrompt = `${selectedPersonality}

Core Guidelines:
- Be helpful and knowledgeable about fashion, style, and products
- If showing products, briefly explain why they're good matches
- Ask follow-up questions to better understand user needs
- Never mention technical details about how you work
- Keep responses conversational and natural
- CRITICAL: Maximum 3 sentences total

${profileContext}${savedItemsContext}${attachedProductsContext}

Context: User is chatting with you about shopping and style preferences. Help them find great products and make good decisions.`

    try {
      const result = await generateText({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory
        ],
      })

      const aiResponse = result.text

      // TODO: Add conversation memory storage back when needed

      return NextResponse.json({
        message: aiResponse,
        products: searchResults.slice(0, productLimit),
        suggestions: [
          "Tell me more about your style",
          "What's your budget range?",
          "Show me similar items",
          "Find alternatives to this"
        ]
      })

    } catch (error) {
      console.error("Chat API Error:", error)
      return NextResponse.json({
        message: "I'm having trouble processing that request right now. Could you try rephrasing it?",
        products: searchResults.slice(0, productLimit),
        suggestions: ["What are you looking for?", "Tell me about your preferences", "How can I help you today?"]
      }, { status: 200 })
    }

  } catch (error) {
    console.error("Chat API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
