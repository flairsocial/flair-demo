import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface PromptOptimizationResult {
  optimizedQuery: string
  searchIntent: 'similar' | 'specific' | 'category' | 'style' | 'brand' | 'general'
  productType: string
  attributes: {
    color?: string
    style?: string
    brand?: string
    material?: string
    season?: string
    occasion?: string
    priceRange?: string
    gender?: string
  }
  searchKeywords: string[]
}

export async function optimizePromptForProductSearch(userPrompt: string): Promise<PromptOptimizationResult> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    const prompt = `
You are a fashion search expert. Analyze the following user prompt and optimize it for accurate product search.

User Prompt: "${userPrompt}"

Your task is to:
1. Identify the user's search intent (similar, specific, category, style, brand, general)
2. Extract the specific product type they're looking for
3. Identify key attributes (color, style, brand, material, season, occasion, price range, gender)
4. Generate highly specific search keywords that will find exactly what they want
5. Create an optimized search query that will return relevant results

Pay special attention to:
- If they say "similar to" or "like this" - focus on finding similar items from DIFFERENT brands
- If they mention specific brands, include those in the search
- If they describe style details, prioritize those attributes
- If they mention occasions (work, party, casual), include relevant style keywords
- Gender context from the prompt

Return a JSON response with this exact structure:
{
  "optimizedQuery": "highly specific search query with key terms",
  "searchIntent": "similar|specific|category|style|brand|general",
  "productType": "specific product category (e.g., jeans, dress, sneakers, blazer)",
  "attributes": {
    "color": "extracted color if mentioned",
    "style": "extracted style descriptor",
    "brand": "brand name if mentioned",
    "material": "fabric/material if mentioned", 
    "season": "season/weather context",
    "occasion": "use case (work, casual, formal, etc.)",
    "priceRange": "budget level if mentioned",
    "gender": "men, women, unisex"
  },
  "searchKeywords": ["keyword1", "keyword2", "keyword3", ...]
}

Focus on being extremely precise and specific to avoid showing irrelevant products like dresses when someone asks for jeans.
`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const optimization = JSON.parse(jsonMatch[0]) as PromptOptimizationResult
      
      // Validate and ensure we have required fields
      return {
        optimizedQuery: optimization.optimizedQuery || userPrompt,
        searchIntent: optimization.searchIntent || 'general',
        productType: optimization.productType || 'clothing',
        attributes: optimization.attributes || {},
        searchKeywords: optimization.searchKeywords || [userPrompt]
      }
    } else {
      throw new Error('Failed to parse Gemini response')
    }
    
  } catch (error) {
    console.error('Prompt optimization failed:', error)
    
    // Fallback: Basic keyword extraction
    return {
      optimizedQuery: userPrompt,
      searchIntent: 'general',
      productType: extractBasicProductType(userPrompt),
      attributes: {},
      searchKeywords: userPrompt.toLowerCase().split(' ').filter(word => word.length > 2)
    }
  }
}

function extractBasicProductType(prompt: string): string {
  const productTypes = [
    'dress', 'dresses', 'shirt', 'shirts', 'pants', 'jeans', 'shoes', 'sneakers',
    'jacket', 'blazer', 'coat', 'sweater', 'top', 'tops', 'skirt', 'boots',
    'heels', 'bag', 'purse', 'accessories', 'jewelry', 'watch', 'scarf'
  ]
  
  const lowercasePrompt = prompt.toLowerCase()
  const found = productTypes.find(type => lowercasePrompt.includes(type))
  
  return found || 'clothing'
}

export async function optimizeChatPromptForContext(userMessage: string, chatHistory: any[]): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    const recentHistory = chatHistory.slice(-3).map(msg => 
      `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n')
    
    const prompt = `
You are helping optimize a user's message for a fashion AI assistant. 

Chat History:
${recentHistory}

Current User Message: "${userMessage}"

Enhance this message to be more specific and contextual while preserving the user's intent. If they're asking for product recommendations, make the request more specific and actionable.

Return only the optimized message, nothing else.
`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
    
  } catch (error) {
    console.error('Chat prompt optimization failed:', error)
    return userMessage
  }
}
