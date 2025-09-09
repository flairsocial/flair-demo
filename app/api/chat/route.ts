import { NextResponse } from "next/server"
import { generateText } from "ai"
import { model } from "@/lib/ai-model"
import type { Product } from "@/lib/types"
import { auth } from '@clerk/nextjs/server'
import { getProfile, getSavedItems } from "@/lib/profile-storage"
import { searchForProducts } from "@/lib/products-service"
import { ImageAnalysisService } from "@/lib/image-analysis-service"
import { chatMemoryService, type ProductMention } from "@/lib/chat-memory-service"
import { realSearchService } from "@/lib/real-search-service"

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

    // Get user authentication
    const { userId } = await auth()
    const sessionId = userId || `anonymous-${Date.now()}`
    
    // Load previous conversation context from memory
    const previousContext = chatMemoryService.loadUserMemory(userId || undefined)
    console.log(`[Chat API] Loaded previous context: ${previousContext?.discussedProducts.length || 0} products, ${previousContext?.searchQueries.length || 0} searches`)

    // Check if API key is available
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ 
        message: "I'm temporarily unavailable due to API configuration. Please try again later!",
        products: [],
        suggestions: ["What's your style goal?", "Tell me about your preferences", "How can I help you today?"]
      }, { status: 200 })
    }
    
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
    let visualSearchProducts: Product[] = [] // Store visual search results directly
    
    if (attachedFiles.length > 0) {
      const fileDescriptions = []
      
      for (const file of attachedFiles) {
        if (file.type === 'product' && file.metadata) {
          const product = file.metadata
          fileDescriptions.push(`Product: ${product.title} by ${product.brand || 'Unknown'} - $${product.price || 'N/A'} (${product.category || 'Product'}). Description: ${product.description || 'No description available'}`)
          
          // Track attached product in memory
          chatMemoryService.addDiscussedProduct(
            userId || undefined, 
            product, 
            `User attached product for discussion`
          )
          
          // For product files, ALWAYS analyze the product image visually when user asks about "looks like" or "similar to"
          const isVisualSearchRequest = message.toLowerCase().includes('look like') || 
                                       message.toLowerCase().includes('similar to') ||
                                       message.toLowerCase().includes('find all items') ||
                                       message.toLowerCase().includes('looks like this') ||
                                       message.toLowerCase().includes('similar items')
          
          if (product.image && (isVisualSearchRequest || !imageAnalysisQuery)) {
            console.log(`[Chat] FORCING VISUAL SIMILARITY SEARCH for attached product image (visual request: ${isVisualSearchRequest})`)
            console.log(`[Chat] Product image URL: ${product.image}`)
            
            try {
              // Try the new visual similarity search first
              const visualSearchResult = await ImageAnalysisService.findVisuallySimilarProducts(
                product.image,
                model,
                userProfile?.budgetRange ? {
                  min: parseInt(userProfile.budgetRange[0]?.split('-')[0] || '0'),
                  max: parseInt(userProfile.budgetRange[userProfile.budgetRange.length - 1]?.split('-')[1] || '1000')
                } : undefined,
                userProfile?.style
              )
              
              if (visualSearchResult && visualSearchResult.products.length > 0) {
                console.log(`[Chat] REAL VISUAL SEARCH SUCCESS!`)
                console.log(`  - Search method: ${visualSearchResult.searchMethod}`)
                console.log(`  - Objects detected: ${JSON.stringify(visualSearchResult.visualFeatures.objects.map((o: any) => o.name))}`)
                console.log(`  - Labels found: ${JSON.stringify(visualSearchResult.visualFeatures.labels.slice(0,3).map((l: any) => l.description))}`)
                console.log(`  - Products found: ${visualSearchResult.products.length}`)
                console.log(`  - Overall confidence: ${visualSearchResult.confidence}%`)
                
                // Store the visual search results directly - DON'T re-search!
                visualSearchProducts = visualSearchResult.products
                
                // Use the primary detected object for context only
                const primaryObject = visualSearchResult.visualFeatures.objects[0]?.name
                const primaryEntity = visualSearchResult.visualFeatures.webEntities?.[0]?.description
                const primaryLabel = visualSearchResult.visualFeatures.labels[0]?.description
                
                imageAnalysisQuery = primaryObject || primaryEntity || primaryLabel || "similar product"
                
                fileDescriptions[fileDescriptions.length - 1] = `VISUAL SEARCH RESULT: Detected "${primaryObject || primaryEntity || primaryLabel}" with ${visualSearchResult.confidence}% confidence. Found ${visualSearchResult.products.length} visually similar products using ${visualSearchResult.searchMethod}.`
              } else {
                console.log(`[Chat] Visual similarity search failed, falling back to standard analysis`)
                // Fall back to standard image analysis
                imageAnalysisQuery = await ImageAnalysisService.analyzeImage(
                  product.image,
                  product,
                  model
                )
                fileDescriptions[fileDescriptions.length - 1] = `Product Image Analysis: ${imageAnalysisQuery} - Visual analysis of ${product.title}`
              }
            } catch (error) {
              console.error('[Chat] Visual search service failed:', error)
              // Final fallback to basic product info
              imageAnalysisQuery = `${product.category || 'product'} similar to ${product.title || ''}`
              fileDescriptions[fileDescriptions.length - 1] = `Product: ${product.title} - Basic fallback search`
            }
          }
        } else if (file.type === 'image') {
          fileDescriptions.push(`Image: ${file.name} - User uploaded an image for product identification and search`)
          
          // For image files, use NEW visual similarity search
          if ((file.content || file.url) && !imageAnalysisQuery) {
            try {
              console.log(`[Chat] Starting VISUAL SIMILARITY SEARCH for uploaded image`)
              
              // Try the new visual similarity search first
              const visualSearchResult = await ImageAnalysisService.findVisuallySimilarProducts(
                file.content || file.url,
                model,
                userProfile?.budgetRange ? {
                  min: parseInt(userProfile.budgetRange[0]?.split('-')[0] || '0'),
                  max: parseInt(userProfile.budgetRange[userProfile.budgetRange.length - 1]?.split('-')[1] || '1000')
                } : undefined,
                userProfile?.style
              )
              
              if (visualSearchResult && visualSearchResult.products.length > 0) {
                console.log(`[Chat] REAL VISUAL SEARCH SUCCESS for uploaded image!`)
                console.log(`  - Search method: ${visualSearchResult.searchMethod}`)
                console.log(`  - Objects detected: ${JSON.stringify(visualSearchResult.visualFeatures.objects.map((o: any) => o.name))}`)
                console.log(`  - Labels found: ${JSON.stringify(visualSearchResult.visualFeatures.labels.slice(0,3).map((l: any) => l.description))}`)
                console.log(`  - Products found: ${visualSearchResult.products.length}`)
                console.log(`  - Overall confidence: ${visualSearchResult.confidence}%`)
                
                // Store the visual search results directly - DON'T re-search!
                visualSearchProducts = visualSearchResult.products
                
                // Use the primary detected object for context only
                const primaryObject = visualSearchResult.visualFeatures.objects[0]?.name
                const primaryEntity = visualSearchResult.visualFeatures.webEntities?.[0]?.description
                const primaryLabel = visualSearchResult.visualFeatures.labels[0]?.description
                
                imageAnalysisQuery = primaryObject || primaryEntity || primaryLabel || "similar product"
                
                fileDescriptions[fileDescriptions.length - 1] = `VISUAL SEARCH RESULT: Detected "${primaryObject || primaryEntity || primaryLabel}" with ${visualSearchResult.confidence}% confidence. Found ${visualSearchResult.products.length} visually similar products using ${visualSearchResult.searchMethod}.`
              } else {
                console.log(`[Chat] Visual similarity search failed, falling back to standard analysis`)
                // Fall back to standard Gemini Vision analysis
                const imageAnalysisResult = await generateText({
                  model,
                  messages: [
                    {
                      role: "user",
                      content: [
                        {
                          type: "text",
                          text: "Analyze this image and identify what product or item is shown. Describe the object's visual characteristics: shape, color, material, texture, design elements, brand markings, and any unique features. Focus on visual features that would help identify and find similar items online. Be specific about what the object actually is and its visual appearance. This could be any type of product - electronics, furniture, accessories, tools, home goods, etc."
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
                  fileDescriptions[fileDescriptions.length - 1] = `Image Analysis: ${imageAnalysisQuery} - Analyzed from uploaded image`
                }
              }
            } catch (error) {
              console.error('[Chat] Visual search for uploaded image failed:', error)
              // Fallback to generic description
              fileDescriptions[fileDescriptions.length - 1] = `Image: ${file.name} - Product image (analysis failed)`
            }
          }
        } else if (file.type === 'url') {
          fileDescriptions.push(`URL: ${file.url} - User wants to discuss this link`)
        } else {
          fileDescriptions.push(`File: ${file.name} (${file.type})`)
        }
      }
      
      fileContext = `\n\nUSER HAS ATTACHED ${attachedFiles.length} FILE(S):\n${fileDescriptions.join('\n')}\n\nThe user is asking about these attached items. Please identify what these items are and help them find similar products or provide relevant information based on what they've shared.`
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
          return `You are Flair, a professional AI shopping assistant. CRITICAL: Keep ALL responses to maximum 2 sentences. Be extremely concise, direct, and efficient. No casual language or emojis.`
        case "friendly":
          return `You are Flair, a humorous assistant who cracks gen-z jokes. CRITICAL: Keep ALL responses to maximum 3 sentences. You can poke fun at the user, pretend to be the user's friend, and talk shit about their purchasing decisions. Friendly, not judgmental.`
        default: // casual
          return "You are Flair, a conversational AI shopping assistant. CRITICAL: Keep ALL responses to maximum 3 sentences. Use a balanced, helpful tone."
      }
    }

    console.log(`[Chat] Using AI tone: ${aiTone}`)
    console.log(`[Chat] Personality applied: ${getPersonality(aiTone)}`)

    // Generate memory context for enhanced conversation continuity
    const memoryContext = chatMemoryService.generateContextualPrompt(userId || undefined)
    
    // Add recent products context for "that jacket" type references
    let recentProductsContext = ""
    if (previousContext?.discussedProducts && previousContext.discussedProducts.length > 0) {
      const recentProducts = previousContext.discussedProducts.slice(-3) // Last 3 products
      recentProductsContext = `\nRECENT PRODUCTS DISCUSSED:
${recentProducts.map((product: any, index: number) => 
        `${index + 1}. "${product.title}" - ${product.brand} ($${product.price}) - ${product.category}`
      ).join('\n')}
      
When user says "that jacket", "the watch", "that item", etc., they're referring to these recent products. Reference them naturally.`
    }

    const systemPrompt = `${getPersonality(aiTone)} You have COMPLETE ACCESS to the user's personal profile information AND conversation history. You have their style preferences, budget, measurements, shopping history, and previous conversations stored in your memory.

CRITICAL RESPONSE LENGTH RULE: ALL responses must be maximum 3 sentences. No exceptions. Be concise and impactful.

IMPORTANT: You have FULL ACCESS to the user's profile data and conversation history. Never ask for information that's already in their profile or previous conversations - reference it naturally.

${profileContext ? `\n${profileContext}\n` : ''}

${memoryContext ? `\nCONVERSATION MEMORY:\n${memoryContext}\n` : ''}

${recentProductsContext}

MEMORY CAPABILITIES:
- You remember all products we've discussed before - reference them naturally
- You know their previous search queries and preferences 
- You can suggest items that complement what we've talked about before
- You can refer back to previous styling advice you've given them
- Use memory to provide consistent, personalized recommendations
- When user says "that jacket" or "the watch", you know exactly what they mean from recent conversation

FILE HANDLING CAPABILITIES:
- You can analyze product images and identify what items they contain
- You can review product details from attached items and give opinions
- You can suggest similar or complementary products based on attached items
- You can analyze URLs and provide feedback on items users are considering
- When users attach files, they want specific advice about those items
- Always reference attached files directly in your response

PERSONALITY:
- Conversational and warm, like chatting with a knowledgeable friend who can help find anything
- Proactive in using their profile info to make personalized suggestions
- Share insights based on their specific preferences and needs
- Remember and reference their saved preferences naturally
- When files are attached, focus on giving specific advice about those items

CONVERSATION STYLE:
- Reference their profile information naturally (don't ask for info you already have)
- Make personalized recommendations based on their budget, interests, and preferences
- Give specific, actionable advice tailored to their needs
- Suggest items that match their exact preferences and budget range
- Be proactive about helping them based on what you know about them
- When users attach products/images, provide detailed analysis and suggestions

PROFILE AWARENESS:
- You KNOW their budget range, preferences, and interests
- You KNOW their preferred shopping sources and lifestyle
- You can reference their saved items and search history
- Never say "I don't have access" - you have ALL their information
- Use their profile data to filter and suggest appropriate items

WHEN TO USE SEARCH TOOL:
- User explicitly asks to "show", "find", "list", mentions competitors, similiar items, etc
- User asks "what should I buy" or "where can I get this"
- When showing actual products would be genuinely helpful
- User mentions wanting to shop for something specific
- ALWAYS filter results by their budget and preferences
- Consider attached products when suggesting similar or complementary items

STRICT FILTERING RULES:
- Only suggest items within their specified budget ranges
- Only recommend items that match their selected preferences
- Respect their shopping source preferences
- Consider their specific needs and use cases when suggesting products

Keep the conversation flowing naturally while being their knowledgeable, well-informed personal shopping assistant who can help them find any type of product they need.`

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
    
    // AGGRESSIVE product search - show products for almost any shopping conversation
    const productKeywords = [
      'show me', 'competitors', 'look like', 'dupe', 'find me', 'where can i get', 'i want to buy', 'looking for',
      'need some', 'recommend', 'suggest', 'shopping for', 'buy', 'purchase',
      'where to buy', 'help me find', 'i need a', 'i need some', 'what should i get',
      'product', 'item', 'similar', 'like this', 'get', 'shop', 'store'
    ]
    
    // Add competitor analysis keywords
    const competitorKeywords = [
      'competitor', 'alternatives', 'similar', 'compare', 'worth it', 
      'better option', 'cheaper option', 'substitute', 'other options', 'different'
    ]
    
    const commonItems = [
      'phone', 'laptop', 'tablet', 'headphones', 'watch', 'bag', 'wallet',
      'shoes', 'shirt', 'jacket', 'pants', 'dress', 'furniture', 'chair',
      'table', 'lamp', 'electronics', 'gadget', 'device', 'tool', 'accessory',
      'item', 'product', 'thing', 'stuff'
    ]
    
    // Make it VERY aggressive - trigger on almost anything product-related
    const hasProductRequest = productKeywords.some(keyword => 
      userMessage.includes(keyword)
    ) || commonItems.some(item => userMessage.includes(item)) || 
       userMessage.includes('what') || userMessage.includes('how') || 
       attachedFiles.length > 0 // Always search if there are attached files
    
    const hasCompetitorRequest = competitorKeywords.some(keyword => 
      userMessage.includes(keyword)
    ) || attachedFiles.some((file: any) => file.type === 'product') // Always search for competitors if product attached
    
    // If there are attached product files and they're asking about competitors/worth it
    const attachedProduct = attachedFiles.find((file: any) => file.type === 'product')
    
    if ((hasProductRequest || hasCompetitorRequest) && serperApiKey) {
      // Priority 1: Use visual search products directly if available
      if (visualSearchProducts.length > 0) {
        console.log(`[Chat] Using VISUAL SEARCH PRODUCTS directly: ${visualSearchProducts.length} products found`)
        products = visualSearchProducts.slice(0, hasCompetitorRequest ? Math.min(productLimit + 2, 10) : productLimit)
        
        // Track visual search in memory
        chatMemoryService.addSearchQuery(
          userId || undefined, 
          imageAnalysisQuery || 'Visual search', 
          'Visual search (Google Vision/Bing/SerpApi)', 
          products
        )
      }
      // Priority 2: Fall back to text-based search if no visual search results
      else {
        let searchQuery = message
        
        // Priority 2a: Use text analysis if available (from images that couldn't be visually searched)
        if (imageAnalysisQuery) {
          searchQuery = imageAnalysisQuery
          console.log(`[Chat] Using text-based image analysis for search: "${searchQuery}"`)
        }
        // Priority 2b: Check for context references like "that jacket", "find that watch", etc.
        else if ((message.toLowerCase().includes('that ') || message.toLowerCase().includes('the ')) && 
                 previousContext?.discussedProducts && previousContext.discussedProducts.length > 0) {
          // Find the most recently discussed product
          const recentProduct = previousContext.discussedProducts[previousContext.discussedProducts.length - 1]
          searchQuery = recentProduct.title || recentProduct.category || 'similar products'
          
          // Extract budget if mentioned
          const budgetMatch = message.match(/under (\d+)|below (\d+)|less than (\d+)/i)
          if (budgetMatch) {
            const budget = budgetMatch[1] || budgetMatch[2] || budgetMatch[3]
            searchQuery = `${searchQuery} under $${budget}`
          }
          
          console.log(`[Chat] Using memory context for search: "${searchQuery}" (from recent product: ${recentProduct.title})`)
        }
        // Priority 2c: If asking about competitors/similar and there's an attached product, use the product info
        else if ((hasCompetitorRequest || message.toLowerCase().includes('similar') || message.toLowerCase().includes('find similar') || message.toLowerCase().includes('similiar')) && attachedProduct?.metadata && !imageAnalysisQuery) {
          const product = attachedProduct.metadata
          
          // Try to use AI-extracted keywords if available, otherwise use title/category
          let searchTerms = []
          
          // Check if this product has AI-extracted keywords (from URL analysis)
          if (product.description && product.description.includes('keywords:')) {
            const keywordsMatch = product.description.match(/keywords:\s*\[(.*?)\]/i)
            if (keywordsMatch) {
              try {
                searchTerms = JSON.parse(`[${keywordsMatch[1]}]`).slice(0, 3)
              } catch (e) {
                searchTerms = keywordsMatch[1].split(',').map((k: string) => k.trim().replace(/"/g, '')).slice(0, 3)
              }
            }
          }
          
          // Fallback to product title/category
          if (searchTerms.length === 0) {
            searchTerms = [product.title || product.category || 'similar products']
          }
          
          searchQuery = searchTerms.join(' ')
          console.log(`[Chat] Using attached product for similar items search: "${searchQuery}" (from ${product.title || 'unknown product'})`)
        } else {
          // Clean up user query for text search
          searchQuery = searchQuery.replace(/\b(show me|find me|where can i get|i want to buy|looking for|need some|recommend|suggest|shopping for|buy|purchase|what|how|where|when|why|can you|could you|please|help me|i need|is this worth it|competitors|alternatives|find similiar|similar|find similar)\b/gi, '')
          searchQuery = searchQuery.trim()
          
          // If query is too short or empty, use attached product info or generic search
          if (searchQuery.length < 3) {
            if (attachedProduct?.metadata) {
              const product = attachedProduct.metadata
              searchQuery = `${product.title || product.category || 'similar products'}`
              console.log(`[Chat] Using attached product for empty query search: "${searchQuery}"`)
            } else if (attachedFiles.length > 0) {
              // Check if any attached file has useful metadata
              const fileWithData = attachedFiles.find((file: any) => file.metadata?.title || file.metadata?.category)
              if (fileWithData?.metadata) {
                searchQuery = `${fileWithData.metadata.title || fileWithData.metadata.category || 'similar products'}`
                console.log(`[Chat] Using attached file metadata for search: "${searchQuery}"`)
              } else {
                searchQuery = "product alternatives"
              }
            } else {
              searchQuery = "popular products"
            }
          }
          console.log(`[Chat] Using processed user message for search: "${searchQuery}"`)
        }
        
        // DON'T ADD PROFILE ENHANCEMENTS - Keep search queries clean and specific
        console.log(`[Chat] Final search query: "${searchQuery}"`)
        const searchLimit = hasCompetitorRequest ? Math.min(productLimit + 2, 10) : productLimit
        
        // Skip broken RealSearch service, go directly to working ProductsService
        try {
          console.log(`[Chat] Using direct product search (RealSearch disabled)...`)
          products = await searchForProducts(searchQuery, searchLimit, userId || undefined, !!imageAnalysisQuery)
          
          // Track search in memory
          chatMemoryService.addSearchQuery(
            userId || undefined, 
            searchQuery, 
            'Direct search', 
            products
          )
        } catch (searchError) {
          console.error(`[Chat] Direct product search error:`, searchError)
          products = []
        }
      }

      // Add found products to memory for future reference
      const queryUsed = visualSearchProducts.length > 0 ? (imageAnalysisQuery || 'Visual search') : 'Product search'
      products.forEach(product => {
        chatMemoryService.addDiscussedProduct(userId || undefined, product, `Search result for "${queryUsed}"`)
      })
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
