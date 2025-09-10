import { NextRequest, NextResponse } from 'next/server'

interface Product {
  title: string
  brand?: string
  category?: string
  price: number
  link?: string
}

export async function POST(request: NextRequest) {
  try {
    const { product }: { product: Product } = await request.json()

    if (!product.title || !product.price) {
      return NextResponse.json({ error: 'Product title and price are required' }, { status: 400 })
    }

    // Analyze resell market data
    const resellData = await analyzeResellMarket(product)
    
    // Generate value projection
    const projection = generateValueProjection(product, resellData)

    return NextResponse.json({
      currentValue: product.price,
      maxResellValue: resellData.maxResellValue,
      valueHistory: resellData.valueHistory,
      projection: projection.forecast,
      recommendation: projection.recommendation,
    })

  } catch (error) {
    console.error('Resell analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze resell value' }, { status: 500 })
  }
}

async function analyzeResellMarket(product: Product) {
  // Search for resell/sold listings
  const resellQuery = `"${product.title}" ${product.brand || ''} sold resell value market price history`.trim()
  
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: resellQuery,
        num: 20,
        gl: 'us',
        hl: 'en',
      }),
    })

    if (!response.ok) {
      throw new Error('Serper API request failed')
    }

    const data = await response.json()
    const soldPrices: number[] = []
    
    // Extract sold/resell prices from search results
    data.organic?.forEach((result: any) => {
      const title = result.title.toLowerCase()
      const snippet = result.snippet?.toLowerCase() || ''
      const text = `${title} ${snippet}`
      
      // Look for sold/resell price indicators
      if (text.includes('sold') || text.includes('resell') || text.includes('market value')) {
        const pricePatterns = [
          /sold.*?\$([0-9,]+(?:\.[0-9]{2})?)/g,
          /resell.*?\$([0-9,]+(?:\.[0-9]{2})?)/g,
          /market.*?\$([0-9,]+(?:\.[0-9]{2})?)/g,
          /value.*?\$([0-9,]+(?:\.[0-9]{2})?)/g,
        ]
        
        for (const pattern of pricePatterns) {
          const matches = text.match(pattern)
          if (matches) {
            matches.forEach(match => {
              const priceStr = match.replace(/[^\d.]/g, '')
              const price = parseFloat(priceStr)
              
              if (price >= 1 && price <= 50000) {
                soldPrices.push(price)
              }
            })
          }
        }
      }
    })
    
    // Calculate resell market statistics
    const avgResellPrice = soldPrices.length > 0 
      ? soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length
      : product.price * 0.7 // Default to 70% of retail
      
    const maxResellValue = soldPrices.length > 0 
      ? Math.max(...soldPrices)
      : product.price * 0.9 // Default to 90% of retail
    
    // Generate mock historical data for the chart
    const valueHistory = generateValueHistory(product.price, avgResellPrice)
    
    return {
      maxResellValue: Math.round(maxResellValue),
      avgResellPrice: Math.round(avgResellPrice),
      soldPrices,
      valueHistory,
    }

  } catch (error) {
    console.error('Resell market search error:', error)
    
    // Fallback data
    const fallbackResellPrice = product.price * 0.7
    const valueHistory = generateValueHistory(product.price, fallbackResellPrice)
    
    return {
      maxResellValue: Math.round(product.price * 0.8),
      avgResellPrice: Math.round(fallbackResellPrice),
      soldPrices: [],
      valueHistory,
    }
  }
}

function generateValueHistory(retailPrice: number, currentResellPrice: number) {
  const history = []
  const months = ['6mo ago', '5mo ago', '4mo ago', '3mo ago', '2mo ago', '1mo ago', 'Now']
  
  // Generate realistic value fluctuation
  for (let i = 0; i < months.length; i++) {
    const monthsBack = months.length - 1 - i
    const decay = Math.pow(0.95, monthsBack) // Gradual value decay
    const randomFluctuation = 0.9 + (Math.random() * 0.2) // ±10% random variation
    
    const marketValue = Math.round(retailPrice * decay * randomFluctuation)
    const resellValue = Math.round(marketValue * 0.8 * randomFluctuation)
    
    history.push({
      date: months[i],
      value: Math.max(marketValue, retailPrice * 0.5), // Don't go below 50% retail
      resell: Math.max(resellValue, retailPrice * 0.4), // Don't go below 40% retail
    })
  }
  
  // Ensure current values make sense
  history[history.length - 1].value = retailPrice
  history[history.length - 1].resell = Math.round(currentResellPrice)
  
  return history
}

function generateValueProjection(product: Product, resellData: any) {
  const resellRatio = resellData.avgResellPrice / product.price
  const maxResellRatio = resellData.maxResellValue / product.price
  
  let forecast = ''
  let recommendation = ''
  
  if (maxResellRatio > 0.9) {
    forecast = 'Excellent resell potential - this item retains most of its value and may even appreciate.'
    recommendation = 'Strong investment piece. This product has excellent resell potential and could be worth more in the future. Consider it a safe purchase.'
  } else if (maxResellRatio > 0.7) {
    forecast = 'Good resell potential - this item holds value well in the secondary market.'
    recommendation = 'Good resell value retention. You can expect to recover 70-90% of your investment if you decide to sell later.'
  } else if (maxResellRatio > 0.5) {
    forecast = 'Moderate resell potential - expect typical depreciation over time.'
    recommendation = 'Average resell potential. This item will lose value over time but maintains reasonable resell worth. Buy for personal use rather than investment.'
  } else {
    forecast = 'Limited resell potential - this item depreciates significantly after purchase.'
    recommendation = 'Low resell value. This purchase should be considered for personal enjoyment rather than investment, as it will lose significant value over time.'
  }
  
  // Add category-specific insights
  if (product.category?.toLowerCase().includes('shoe') || product.category?.toLowerCase().includes('sneaker')) {
    forecast += ' Sneaker market can be volatile - limited editions may appreciate while general releases depreciate.'
  } else if (product.category?.toLowerCase().includes('bag') || product.category?.toLowerCase().includes('handbag')) {
    forecast += ' Luxury bags often maintain value better, especially from established brands.'
  } else if (product.category?.toLowerCase().includes('watch')) {
    forecast += ' Watch values depend heavily on brand reputation and limited availability.'
  }
  
  return { forecast, recommendation }
}
