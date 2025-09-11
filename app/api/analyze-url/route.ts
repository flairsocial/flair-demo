import { NextResponse } from "next/server"
import { generateText } from "ai"
import { model } from "@/lib/ai-model"
import type { Product } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const { url, includeRealTimeData = true } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    console.log(`[AnalyzeURL] Analyzing URL: ${url}, real-time enhancement: ${includeRealTimeData}`)

    // Universal webpage scraping - no hardcoding
    let pageTitle = ""
    let pageContent = ""
    let imageUrl = ""
    let extractedText = ""
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      
      if (response.ok) {
        const html = await response.text()
        console.log(`[AnalyzeURL] Successfully fetched page content (${html.length} chars)`)
        
        // Extract title
        const titleMatch = html.match(/<title>(.*?)<\/title>/i)
        pageTitle = titleMatch ? titleMatch[1].replace(/&[^;]+;/g, ' ').trim() : ""
        
        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i)
        const description = descMatch ? descMatch[1] : ""
        
        // Universal image extraction - try ALL possible sources
        const imageUrls = new Set<string>()
        
        // 1. Open Graph image
        const ogMatches = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)/gi)
        if (ogMatches) {
          ogMatches.forEach(match => {
            const content = match.match(/content=["']([^"']*)/i)?.[1]
            if (content) imageUrls.add(content)
          })
        }
        
        // 2. Twitter card images
        const twitterMatches = html.match(/<meta[^>]*name=["']twitter:image[^"']*["'][^>]*content=["']([^"']*)/gi)
        if (twitterMatches) {
          twitterMatches.forEach(match => {
            const content = match.match(/content=["']([^"']*)/i)?.[1]
            if (content) imageUrls.add(content)
          })
        }
        
        // 3. JSON-LD structured data images
        const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
        if (jsonLdMatches) {
          jsonLdMatches.forEach(match => {
            try {
              const jsonContent = match.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1]
              if (jsonContent) {
                const data = JSON.parse(jsonContent)
                const extractImages = (obj: any): void => {
                  if (typeof obj === 'object' && obj !== null) {
                    if (obj.image) {
                      if (typeof obj.image === 'string') imageUrls.add(obj.image)
                      if (Array.isArray(obj.image)) obj.image.forEach((img: any) => {
                        if (typeof img === 'string') imageUrls.add(img)
                        if (img.url) imageUrls.add(img.url)
                      })
                      if (obj.image.url) imageUrls.add(obj.image.url)
                    }
                    Object.values(obj).forEach(extractImages)
                  }
                }
                extractImages(data)
              }
            } catch (e) {
              // Skip invalid JSON-LD
            }
          })
        }
        
        // 4. All img tags - prioritize by likely product images
        const imgMatches = html.match(/<img[^>]*src=["']([^"']*)[^>]*>/gi)
        if (imgMatches) {
          const productImageKeywords = ['product', 'item', 'main', 'hero', 'primary', 'large', 'zoom', 'detail']
          const goodImages: string[] = []
          const okImages: string[] = []
          
          imgMatches.forEach(imgTag => {
            const srcMatch = imgTag.match(/src=["']([^"']*)/i)
            if (srcMatch) {
              const src = srcMatch[1]
              const imgTagLower = imgTag.toLowerCase()
              
              // Skip obvious non-product images
              if (src.includes('logo') || src.includes('icon') || src.includes('button') || 
                  src.includes('arrow') || src.includes('social') || src.includes('badge') ||
                  src.includes('sprite') || src.includes('spacer') || src.includes('pixel') ||
                  src.includes('tracking') || src.includes('analytics') || src.includes('ads')) {
                return
              }
              
              // Prioritize images with product-related attributes
              if (productImageKeywords.some(keyword => imgTagLower.includes(keyword)) ||
                  imgTagLower.includes('alt="') && productImageKeywords.some(keyword => imgTagLower.includes(keyword))) {
                goodImages.push(src)
              } else if (src.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) {
                okImages.push(src)
              }
            }
          })
          
          // Add prioritized images
          goodImages.forEach(img => imageUrls.add(img))
          okImages.slice(0, 5).forEach(img => imageUrls.add(img)) // Limit fallback images
        }
        
        // Convert relative URLs to absolute
        const absoluteImageUrls = Array.from(imageUrls).map(imgUrl => {
          if (!imgUrl) return imgUrl
          try {
            if (imgUrl.startsWith('http')) return imgUrl
            const baseUrl = new URL(url)
            if (imgUrl.startsWith('//')) return baseUrl.protocol + imgUrl
            if (imgUrl.startsWith('/')) return baseUrl.origin + imgUrl
            return new URL(imgUrl, url).href
          } catch (e) {
            return imgUrl
          }
        }).filter(imgUrl => imgUrl && imgUrl.startsWith('http'))
        
        // Select best image (prefer larger, product-like URLs)
        imageUrl = absoluteImageUrls.find(img => 
          img.includes('product') || img.includes('item') || img.includes('main')
        ) || absoluteImageUrls[0] || ""
        
        console.log(`[AnalyzeURL] Found ${absoluteImageUrls.length} images, selected: ${imageUrl?.substring(0, 100)}...`)
        
        // Extract comprehensive text content
        let textContent = html
          // Remove script and style tags
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
          // Remove HTML tags but keep text
          .replace(/<[^>]*>/g, ' ')
          // Clean up entities and whitespace
          .replace(/&[^;]+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        
        // Extract key information sections
        const pricePattern = /[\$£€¥₹₪₩][\d,]+\.?\d*|\d+[\.,]\d{2}\s*[\$£€¥₹₪₩]?|\d{1,4}[\s]*(?:USD|EUR|GBP|CAD|AUD)/gi
        const brandPattern = /brand[:\s]*([a-zA-Z][a-zA-Z\s&]{1,30})/gi
        const categoryPattern = /(?:category|department|section)[:\s]*([a-zA-Z][a-zA-Z\s&]{1,30})/gi
        
        extractedText = `
        PAGE: ${pageTitle}
        DESCRIPTION: ${description}
        URL_PATH: ${url.split('/').slice(-2).join('/')}
        CONTENT: ${textContent.substring(0, 2000)}
        `.trim()
        
      } else {
        console.log(`[AnalyzeURL] Failed to fetch page: ${response.status} ${response.statusText}`)
      }
    } catch (fetchError) {
      console.error(`[AnalyzeURL] Network error:`, fetchError)
    }

    // Use AI to analyze the COMPLETE page content - no hardcoding
    const analysisPrompt = `You are a product information extraction expert. Analyze this webpage content and extract accurate product details:

URL: ${url}
${extractedText}

Your task:
1. Determine if this is a product page (ecommerce, marketplace, brand site, etc.)
2. Extract the EXACT product name/title
3. Find the price (convert to USD if needed)
4. Identify the brand/manufacturer
5. Determine the product category
6. Create a concise description
7. Generate search keywords that would find similar products

Be intelligent about:
- Sneaker sites (StockX, GOAT, Nike, etc.) - extract model names, colorways
- Fashion sites - extract brand, style, size info
- Electronics - extract brand, model, specs
- Home goods - extract type, brand, features
- Any other product type

Return ONLY this JSON structure (no markdown, no extra text):
{
  "isProduct": true/false,
  "title": "exact product name",
  "price": numeric_value_in_USD,
  "brand": "brand name",
  "category": "specific category like 'Sneakers', 'Electronics', 'Fashion', etc.",
  "description": "2-sentence product description",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "confidence": 0.0-1.0
}`

    try {
      const { text } = await generateText({
        model,
        messages: [{ role: "user", content: analysisPrompt }]
      })

      console.log(`[AnalyzeURL] AI response: ${text.substring(0, 200)}...`)

      // Parse AI response with robust error handling
      let productData
      try {
        // Clean response
        let cleanText = text.trim()
        
        // Remove any markdown formatting
        cleanText = cleanText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').replace(/^json\s*/gi, '')
        
        // Extract JSON object
        const jsonStart = cleanText.indexOf('{')
        const jsonEnd = cleanText.lastIndexOf('}')
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = cleanText.substring(jsonStart, jsonEnd + 1)
          productData = JSON.parse(jsonStr)
          console.log(`[AnalyzeURL] Successfully parsed AI response with confidence: ${productData.confidence || 'unknown'}`)
        } else {
          throw new Error('No valid JSON found in response')
        }
      } catch (parseError) {
        console.error('[AnalyzeURL] JSON parsing failed:', parseError)
        
        // Manual extraction as fallback
        const titleMatch = text.match(/"title":\s*"([^"]+)"/i)
        const priceMatch = text.match(/"price":\s*(\d+\.?\d*)/i) 
        const brandMatch = text.match(/"brand":\s*"([^"]+)"/i)
        const categoryMatch = text.match(/"category":\s*"([^"]+)"/i)
        const keywordsMatch = text.match(/"keywords":\s*\[(.*?)\]/i)
        
        let keywords: string[] = []
        if (keywordsMatch) {
          try {
            keywords = JSON.parse(`[${keywordsMatch[1]}]`)
          } catch (e) {
            keywords = keywordsMatch[1].split(',').map(k => k.replace(/"/g, '').trim()).filter(Boolean)
          }
        }
        
        productData = {
          isProduct: true,
          title: titleMatch?.[1] || pageTitle || 'Product from URL',
          price: priceMatch ? parseFloat(priceMatch[1]) : 0,
          brand: brandMatch?.[1] || 'Unknown',
          category: categoryMatch?.[1] || 'General',
          description: `Product from ${new URL(url).hostname}`,
          keywords: keywords.length > 0 ? keywords : ['product', 'shopping'],
          confidence: 0.6
        }
        console.log('[AnalyzeURL] Used manual extraction fallback')
      }

      // Ensure we have valid data
      if (!productData || typeof productData !== 'object') {
        throw new Error('Invalid product data structure')
      }

      // Create final product object
      const product: Product = {
        id: `url-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: productData.title || pageTitle || 'Product from URL',
        image: imageUrl || '/placeholder.svg',
        price: productData.price || 0,
        brand: productData.brand || 'Unknown',
        category: productData.category || 'General',
        description: `${productData.description || `Product from ${new URL(url).hostname}`}${productData.keywords ? ` keywords: [${productData.keywords.map((k: string) => `"${k}"`).join(', ')}]` : ''}`,
        hasAiInsights: true,
        saved: false,
        link: url
      }

      console.log(`[AnalyzeURL] Successfully created product:`, {
        title: product.title,
        image: product.image ? 'Found' : 'Missing',
        price: product.price,
        category: product.category,
        keywords: productData.keywords?.slice(0, 3) || []
      })

      return NextResponse.json(product)

    } catch (aiError) {
      console.error('[AnalyzeURL] AI analysis failed:', aiError)
      
      // Final fallback - basic extraction
      const fallbackProduct: Product = {
        id: `url-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: pageTitle || 'Product from URL',
        image: imageUrl || '/placeholder.svg',
        price: 0,
        brand: 'Unknown',
        category: 'General',
        description: `Product from ${new URL(url).hostname}`,
        hasAiInsights: false,
        saved: false,
        link: url
      }

      console.log('[AnalyzeURL] Using fallback product creation')
      return NextResponse.json(fallbackProduct)
    }

  } catch (error) {
    console.error('[AnalyzeURL] Critical error:', error)
    return NextResponse.json({ error: "Failed to analyze URL" }, { status: 500 })
  }
}
