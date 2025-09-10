import { NextRequest, NextResponse } from 'next/server'

interface Product {
  title: string
  brand?: string
  category?: string
  price: number
}

export async function POST(request: NextRequest) {
  try {
    const { product }: { product: Product } = await request.json()

    if (!product.title || !product.price) {
      return NextResponse.json({ error: 'Product title and price are required' }, { status: 400 })
    }

    // Search for competitors on various platforms
    const competitors = await findCompetitors(product)
    
    // Generate AI recommendation
    const recommendation = generateCompetitorRecommendation(product, competitors)

    return NextResponse.json({
      competitors,
      recommendation,
    })

  } catch (error) {
    console.error('Competitors analysis error:', error)
    return NextResponse.json({ error: 'Failed to find competitors' }, { status: 500 })
  }
}

async function findCompetitors(product: Product) {
  const platforms = [
    'ebay.com',
    'stockx.com', 
    'goat.com',
    'grailed.com',
    'depop.com',
    'poshmark.com',
    'vestiaire.com',
    'therealreal.com',
    'etsy.com',
    'mercari.com',
    'offerup.com',
    'facebook.com/marketplace',
    'craigslist.org',
  ]
  
  const competitors: Array<{
    title: string
    price: number
    platform: string
    url: string
    image?: string
    savings: number
  }> = []
  
  // Search each platform for cheaper alternatives
  for (const platform of platforms) {
    try {
      const platformCompetitors = await searchPlatformForCompetitors(product, platform)
      competitors.push(...platformCompetitors)
      
      // Limit to prevent too many API calls
      if (competitors.length >= 20) break
      
    } catch (error) {
      console.error(`Error searching ${platform}:`, error)
      continue
    }
  }
  
  // Filter and sort competitors
  const cheaperCompetitors = competitors
    .filter(comp => comp.price < product.price && comp.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, 8) // Top 8 cheapest alternatives
  
  return cheaperCompetitors
}

async function searchPlatformForCompetitors(product: Product, platform: string) {
  const searchQuery = `site:${platform} "${product.title}" OR "${product.brand}" ${product.category || ''} price`.trim()
  
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 5, // Limit results per platform
        gl: 'us',
        hl: 'en',
      }),
    })

    if (!response.ok) {
      throw new Error(`Serper API request failed for ${platform}`)
    }

    const data = await response.json()
    const platformCompetitors: Array<{
      title: string
      price: number
      platform: string
      url: string
      image?: string
      savings: number
    }> = []
    
    data.organic?.forEach((result: any) => {
      const title = result.title
      const snippet = result.snippet || ''
      const url = result.link
      
      // Extract price from title and snippet
      const pricePatterns = [
        /\$([0-9,]+(?:\.[0-9]{2})?)/g,
        /USD\s*([0-9,]+(?:\.[0-9]{2})?)/g,
        /([0-9,]+(?:\.[0-9]{2})?)\s*dollars?/g,
      ]
      
      const text = `${title} ${snippet}`
      let extractedPrice = null
      
      for (const pattern of pricePatterns) {
        const matches = text.match(pattern)
        if (matches && matches.length > 0) {
          const priceStr = matches[0].replace(/[\$,USD\s]/g, '')
          const price = parseFloat(priceStr)
          
          // Filter reasonable prices
          if (price >= 1 && price <= 10000) {
            extractedPrice = price
            break
          }
        }
      }
      
      if (extractedPrice && extractedPrice < product.price) {
        const platformName = platform.split('.')[0]
        const savings = product.price - extractedPrice
        
        platformCompetitors.push({
          title: title.length > 80 ? title.substring(0, 80) + '...' : title,
          price: extractedPrice,
          platform: platformName.charAt(0).toUpperCase() + platformName.slice(1),
          url,
          savings: Math.round(savings),
        })
      }
    })
    
    return platformCompetitors

  } catch (error) {
    console.error(`Platform search error for ${platform}:`, error)
    return []
  }
}

function generateCompetitorRecommendation(product: Product, competitors: any[]) {
  if (competitors.length === 0) {
    return `No cheaper alternatives found for this ${product.title}. This might indicate it's already competitively priced or is a unique/limited item.`
  }
  
  const avgSavings = competitors.reduce((sum, comp) => sum + comp.savings, 0) / competitors.length
  const maxSavings = Math.max(...competitors.map(comp => comp.savings))
  const minPrice = Math.min(...competitors.map(comp => comp.price))
  
  const platforms = [...new Set(competitors.map(comp => comp.platform))]
  
  let recommendation = ''
  
  if (avgSavings > product.price * 0.3) {
    recommendation = `Significant savings available! You could save an average of $${Math.round(avgSavings)} with alternatives found on ${platforms.join(', ')}. `
  } else if (avgSavings > product.price * 0.15) {
    recommendation = `Moderate savings found. You could save up to $${maxSavings} by choosing alternatives. `
  } else {
    recommendation = `Limited cheaper options available, suggesting this product is reasonably priced for the market. `
  }
  
  recommendation += `The cheapest alternative is priced at $${minPrice}. `
  
  if (platforms.includes('Ebay') || platforms.includes('Grailed') || platforms.includes('Depop')) {
    recommendation += `Consider checking the condition and authenticity when buying from second-hand platforms.`
  } else {
    recommendation += `Most alternatives are from established retailers, reducing authenticity concerns.`
  }
  
  return recommendation
}
