import { NextResponse } from "next/server"
import { generateText } from "ai"
import { model } from "@/lib/ai-model"
import type { Product } from "@/lib/types"
import { auth } from '@clerk/nextjs/server'
import { getProfile, getSavedItems } from "@/lib/profile-storage"
import { searchForProducts } from "@/lib/products-service"
import { ImageAnalysisService } from "@/lib/image-analysis-service"

const serperApiKey = process.env.SERPER_API_KEY

// Function to get user profile directly from shared storage
async function getUserProfile(userId?: string) {
  try {
    const savedProfile = getProfile(userId || undefined)
    
    if (savedProfile && Object.keys(savedProfile).length > 0) {
      console.log('[Chat] Found user profile in storage:', userId || 'anonymous')
      return savedProfile
    }
    
    console.log('[Chat] No profile found in storage for:', userId || 'anonymous')
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
    const { message, history = [], productLimit = 6, attachedFiles = [], aiTone = "casual" } = await request.json()

    console.log(`[Chat API] Processing message: "${message}"`)
    console.log(`[Chat API] Attached files: ${attachedFiles.length}`)

    // Check if API key is available
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ 
        message: "I'm temporarily unavailable due to API configuration. Please try again later!",
        products: [],
        suggestions: ["What's your style goal?", "Tell me about your preferences", "How can I help you today?"]
      }, { status: 200 })
    }

    // Get user authentication
    const { userId } = await auth()
    
    // Get user profile and saved items for personalized recommendations
    const [userProfile, savedItems] = await Promise.all([
      getUserProfile(userId || undefined),
      getUserSavedItems(userId || undefined)
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

    // Build conversation history for Google AI (reduced for efficiency)
    const conversationHistory = history
      .slice(-6) // Reduced from -12 to -6 to save tokens
      .map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.content,
      }))

    // Process attached files and add to conversation context
    let fileContext = ""
    let imageAnalysisQuery = ""
    
    if (attachedFiles.length > 0) {
      const fileDescriptions = []
      
      for (const file of attachedFiles) {
        if (file.type === 'product' && file.metadata) {
          fileDescriptions.push(`Product: ${file.metadata.title} by ${file.metadata.brand || 'Unknown'} - $${file.metadata.price || 'N/A'} (${file.metadata.category || 'Fashion item'}). Description: ${file.metadata.description || 'No description available'}`)
          
          // For product files, analyze the product image if available
          if (file.metadata.image && !imageAnalysisQuery) {
            console.log(`[Chat] Analyzing attached product image for visual similarity search`)
            console.log(`[Chat] Product image URL: ${file.metadata.image}`)
            
            try {
              imageAnalysisQuery = await ImageAnalysisService.analyzeImage(
                file.metadata.image,
                file.metadata,
                model
              )
              
              console.log(`[Chat] Image analysis result: "${imageAnalysisQuery}"`)
              fileDescriptions[fileDescriptions.length - 1] = `Product Image Analysis: ${imageAnalysisQuery} - Visual analysis of ${file.metadata.title}`
            } catch (error) {
              console.error('[Chat] Image analysis service failed:', error)
              // Final fallback to basic product info
              const product = file.metadata
              imageAnalysisQuery = `${product.category || 'fashion'} similar to ${product.title || ''}`
              fileDescriptions[fileDescriptions.length - 1] = `Product: ${product.title} - Basic fallback search`
            }
          }
        } else if (file.type === 'image') {
          fileDescriptions.push(`Image: ${file.name} - User uploaded an image for styling advice`)
          
          // For image files, generate an analysis query for product search
          if ((file.content || file.url) && !imageAnalysisQuery) {
            try {
              console.log(`[Chat] Analyzing uploaded image for product search`)
              
              // Use Gemini Vision to analyze the image
              const imageAnalysisResult = await generateText({
                model,
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: "Analyze this fashion image in detail. Describe the specific visual characteristics: silhouette, cut, neckline, sleeves, length, fit, fabric texture, patterns, colors, style details, and any unique design elements. Focus on visual features that would help find similar-looking items. Be very specific about the visual appearance. Respond with detailed visual descriptors that would help in a product search."
                      },
                      {
                        type: "image",
                        image: file.content || file.url
                      }
                    ]
                  }
                ]
              })
              
              if (imageAnalysisResult?.text) {
                imageAnalysisQuery = imageAnalysisResult.text.trim()
                console.log(`[Chat] Image analysis result: "${imageAnalysisQuery}"`)
                fileDescriptions[fileDescriptions.length - 1] = `Image Analysis: ${imageAnalysisQuery} - Analyzed from uploaded image`
              }
            } catch (error) {
              console.error('[Chat] Failed to analyze image:', error)
              // Fallback to generic description
              fileDescriptions[fileDescriptions.length - 1] = `Image: ${file.name} - Fashion item image (analysis failed)`
            }
          }
        } else if (file.type === 'url') {
          fileDescriptions.push(`URL: ${file.url} - User wants to discuss this link`)
        } else {
          fileDescriptions.push(`File: ${file.name} (${file.type})`)
        }
      }
      
      fileContext = `\n\nUSER HAS ATTACHED ${attachedFiles.length} FILE(S):\n${fileDescriptions.join('\n')}\n\nThe user is specifically asking about these attached items. Please reference them directly in your response and provide relevant styling advice, opinions, or recommendations based on what they've shared.`
    }

    // Add current user message with file context
    const userMessageWithContext = message + fileContext
    conversationHistory.push({
      role: "user",
      content: userMessageWithContext,
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

    // Build personality based on tone preference (strong directives)
    const getPersonality = (tone: string) => {
      switch (tone) {
        case "professional":
          return `You are Flair, a professional AI fashion stylist. CRITICAL: Keep ALL responses to maximum 2 sentences. Be extremely concise, direct, and efficient. No casual language or emojis.`
        case "friendly":
          return `You are Flair, a humorous assistant who cracks gen-z jokes. CRITICAL: Keep ALL responses to maximum 3 sentences. You can poke fun at the user, pretend to be the user's friend, and talk shit about their purchasing decisions. Friendly, not judgmental.`
        default: // casual
          return "You are Flair, a conversational AI fashion stylist. CRITICAL: Keep ALL responses to maximum 3 sentences. Use a balanced, helpful tone."
      }
    }

    console.log(`[Chat] Using AI tone: ${aiTone}`)
    console.log(`[Chat] Personality applied: ${getPersonality(aiTone)}`)

    const systemPrompt = `${getPersonality(aiTone)} You have COMPLETE ACCESS to the user's personal profile information. You have their style preferences, budget, measurements, and shopping history stored in your memory.

CRITICAL RESPONSE LENGTH RULE: ALL responses must be maximum 3 sentences. No exceptions. Be concise and impactful.

IMPORTANT: You have FULL ACCESS to the user's profile data and should act like you know them personally. Never ask for information that's already in their profile - reference it naturally in conversation.

${profileContext ? `\n${profileContext}\n` : ''}

FILE HANDLING CAPABILITIES:
- You can analyze product images and provide styling advice
- You can review product details from attached items and give opinions
- You can suggest outfit combinations based on attached products
- You can analyze URLs and provide feedback on items users are considering
- When users attach files, they want specific advice about those items
- Always reference attached files directly in your response

PERSONALITY:
- Conversational and warm, like chatting with a stylish friend who knows you well
- Proactive in using their profile info to make personalized suggestions
- Share personal styling insights based on their specific preferences
- casual professional
- Remember and reference their saved preferences naturally
- When files are attached, focus on giving specific advice about those items

CONVERSATION STYLE:
- Reference their profile information naturally (don't ask for info you already have)
- Make personalized recommendations based on their budget, style, and body type
- Give specific, actionable advice tailored to their preferences
- Suggest items that match their exact style preferences and budget range
- Be proactive about helping them based on what you know about them
- When users attach products/images, provide detailed styling advice and opinions

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
- Consider attached products when suggesting similar or complementary items

STRICT FILTERING RULES:
- Only suggest items within their specified budget ranges
- Only recommend styles that match their selected preferences
- Respect their shopping source preferences
- Consider their body type and measurements when suggesting fits

Keep the conversation flowing naturally while being their knowledgeable, well-informed personal stylist who can also analyze and discuss any fashion items they share with you.`

    // Generate response using Google AI
    const { text } = await generateText({
      model: model,
      system: systemPrompt,
      messages: conversationHistory,
    })

    console.log(`[Chat] Generated response length: ${text.length}`)

    // Check if the user is asking for product recommendations or competitor analysis
    let products: Product[] = []
    const userMessage = message.toLowerCase()
    const aiResponse = text.toLowerCase()
    
    // AGGRESSIVE product search - show products for almost any fashion conversation
    const productKeywords = [
      'show me', 'find me', 'where can i get', 'i want to buy', 'looking for',
      'need some', 'recommend', 'suggest', 'shopping for', 'buy', 'purchase',
      'where to buy', 'help me find', 'i need a', 'i need some', 'what should i wear',
      'outfit', 'style', 'fashion', 'clothing', 'wear', 'get', 'shop', 'store'
    ]
    
    // Add competitor analysis keywords
    const competitorKeywords = [
      'competitor', 'alternatives', 'similar', 'compare', 'worth it', 
      'better option', 'cheaper option', 'substitute', 'other options', 'different'
    ]
    
    const fashionItems = [
      'dress', 'shirt', 'pants', 'shoes', 'jacket', 'blazer', 'jeans',
      'top', 'skirt', 'sweater', 'coat', 'boots', 'sneakers', 'heels',
      'bag', 'purse', 'accessories', 'jewelry', 'watch', 'scarf', 'tank',
      'blouse', 'cardigan', 'hoodie', 'tee', 't-shirt', 'outfit', 'clothing',
      'fashion', 'style', 'clothes'
    ]
    
    // Make it VERY aggressive - trigger on almost anything fashion-related
    const hasProductRequest = productKeywords.some(keyword => 
      userMessage.includes(keyword)
    ) || fashionItems.some(item => userMessage.includes(item)) || 
       userMessage.includes('what') || userMessage.includes('how') || 
       attachedFiles.length > 0 // Always search if there are attached files
    
    const hasCompetitorRequest = competitorKeywords.some(keyword => 
      userMessage.includes(keyword)
    ) || attachedFiles.some((file: any) => file.type === 'product') // Always search for competitors if product attached
    
    // If there are attached product files and they're asking about competitors/worth it
    const attachedProduct = attachedFiles.find((file: any) => file.type === 'product')
    
    if ((hasProductRequest || hasCompetitorRequest) && serperApiKey) {
      let searchQuery = message
      
      // Priority 1: Use image analysis if available (from either uploaded images or product images)
      if (imageAnalysisQuery) {
        searchQuery = imageAnalysisQuery
        console.log(`[Chat] Using visual image analysis for product search: "${searchQuery}"`)
      }
      // Priority 2: If asking about competitors and there's an attached product, but no image analysis, fall back to product details
      else if (hasCompetitorRequest && attachedProduct?.metadata && !imageAnalysisQuery) {
        const product = attachedProduct.metadata
        searchQuery = `${product.category || 'fashion'} similar to ${product.title?.split(' ').slice(0, 3).join(' ') || ''} style alternatives`
        console.log(`[Chat] Using attached product details for search (image analysis failed): "${searchQuery}"`)
      } else {
        // Remove common question words but keep fashion terms
        searchQuery = searchQuery.replace(/\b(show me|find me|where can i get|i want to buy|looking for|need some|recommend|suggest|shopping for|buy|purchase|what|how|where|when|why|can you|could you|please|help me|i need|is this worth it|competitors|alternatives)\b/gi, '')
        searchQuery = searchQuery.trim()
        
        // If query is too short or empty, use a default fashion search
        if (searchQuery.length < 3) {
          searchQuery = "fashion clothing trendy"
        }
        console.log(`[Chat] Using processed user message for search: "${searchQuery}"`)
      }
      
      // Don't add profile enhancements to image analysis queries
      if (!imageAnalysisQuery && userProfile && searchQuery.length > 2) {
        const profileEnhancements = []
        if (userProfile.style?.length > 0) profileEnhancements.push(...userProfile.style)
        
        if (profileEnhancements.length > 0) {
          searchQuery = `${searchQuery} ${profileEnhancements.join(' ')}`
        }
      }
      
      console.log(`[Chat] Final search query: "${searchQuery}"`)
      const searchLimit = hasCompetitorRequest ? Math.min(productLimit + 2, 10) : productLimit // Get more results for competitor analysis
      products = await searchForProducts(searchQuery, searchLimit, userId || undefined, !!imageAnalysisQuery)
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

    // Check if it's a quota exceeded error
    if (error.message?.includes("quota") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      return NextResponse.json({
        message: "I've reached my daily chat limit! ✨ Please try again tomorrow, or in the meantime, feel free to browse our fashion collections and save items you like!",
        products: [],
        suggestions: [
          "Browse trending fashion items",
          "Check out our style collections", 
          "Save items for later discussion",
          "Return tomorrow for more chat!"
        ],
      })
    }

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
