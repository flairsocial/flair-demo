// Search Proxy API to handle CORS issues
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url, site, query, budget } = await request.json()
    
    console.log(`[SearchProxy] Searching ${site} for "${query}"`)
    
    // For now, we'll simulate real search results instead of actual scraping
    // In production, you'd use a proper scraping service or API
    const mockResults = generateMockSearchResults(site, query, budget)
    
    return NextResponse.json({
      success: true,
      results: mockResults,
      site,
      query
    })
    
  } catch (error) {
    console.error('[SearchProxy] Error:', error)
    return NextResponse.json(
      { error: 'Search proxy failed' },
      { status: 500 }
    )
  }
}

function generateMockSearchResults(site: string, query: string, budget?: { min: number, max: number }) {
  // Generate realistic results that would come from each site
  const results = []
  
  const siteConfigs = {
    'Poshmark': {
      basePrice: 30,
      priceVariance: 100,
      categories: ['Bags', 'Shoes', 'Dresses', 'Tops', 'Accessories']
    },
    'eBay Fashion': {
      basePrice: 20,
      priceVariance: 150,
      categories: ['Vintage', 'Designer', 'Casual', 'Formal']
    },
    'TheRealReal': {
      basePrice: 80,
      priceVariance: 300,
      categories: ['Luxury', 'Designer', 'Authenticated']
    }
  }
  
  const config = siteConfigs[site as keyof typeof siteConfigs] || siteConfigs['Poshmark']
  
  for (let i = 0; i < 4; i++) {
    const price = Math.random() * config.priceVariance + config.basePrice
    const finalPrice = budget ? 
      Math.max(budget.min, Math.min(budget.max, price)) : 
      price
    
    results.push({
      id: `${site.toLowerCase()}-${Date.now()}-${i}`,
      title: `${query} - ${config.categories[i % config.categories.length]} Item`,
      brand: ['Zara', 'Nike', 'Gucci', 'Adidas'][i % 4],
      price: Math.round(finalPrice * 100) / 100,
      category: config.categories[i % config.categories.length],
      image: '/placeholder.svg',
      description: `Found on ${site} - ${query} related item`,
      source: site
    })
  }
  
  return results
}
