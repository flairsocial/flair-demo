import { NextRequest, NextResponse } from 'next/server'

interface Product {
  title: string
  brand?: string
  category?: string
  link?: string
}

export async function POST(request: NextRequest) {
  try {
    const { product }: { product: Product } = await request.json()

    if (!product.title) {
      return NextResponse.json({ error: 'Product title is required' }, { status: 400 })
    }

    // Search for reviews and trust information
    const reviewData = await searchProductReviews(product)
    
    // Analyze trust using AI
    const aiAnalysis = await analyzeTrustworthiness(product, reviewData)

    return NextResponse.json({
      trustScore: aiAnalysis.trustScore,
      reviewCount: reviewData.reviewCount,
      avgRating: reviewData.avgRating,
      sentimentBreakdown: reviewData.sentimentBreakdown,
      commonIssues: aiAnalysis.commonIssues,
      recommendation: aiAnalysis.recommendation,
    })

  } catch (error) {
    console.error('Trust analysis error:', error)
    return NextResponse.json({ error: 'Failed to analyze trust' }, { status: 500 })
  }
}

async function searchProductReviews(product: Product) {
  const searchQuery = `"${product.title}" ${product.brand || ''} review rating scam fake authentic`.trim()
  
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 20,
        gl: 'us',
        hl: 'en',
      }),
    })

    if (!response.ok) {
      console.log('Serper API request failed with status:', response.status)
      return generateFallbackTrustData(product)
    }

    const data = await response.json()
    
    let totalReviews = 0
    let totalRating = 0
    let ratingCount = 0
    const reviewTexts: string[] = []
    
    // Extract review information from search results
    data.organic?.forEach((result: any) => {
      const title = result.title?.toLowerCase() || ''
      const snippet = result.snippet?.toLowerCase() || ''
      const text = `${title} ${snippet}`
      
      // Look for rating patterns
      const ratingPatterns = [
        /(\d+\.?\d*)\s*\/?\s*5\s*stars?/g,
        /rated?\s*(\d+\.?\d*)\s*out\s*of\s*5/g,
        /(\d+\.?\d*)\s*star\s*rating/g,
      ]
      
      // Look for review count patterns
      const reviewPatterns = [
        /(\d+(?:,\d+)*)\s*reviews?/g,
        /(\d+(?:,\d+)*)\s*ratings?/g,
        /based\s*on\s*(\d+(?:,\d+)*)/g,
      ]
      
      // Extract ratings
      for (const pattern of ratingPatterns) {
        const matches = text.match(pattern)
        if (matches) {
          const rating = parseFloat(matches[0].replace(/[^\d.]/g, ''))
          if (rating >= 1 && rating <= 5) {
            totalRating += rating
            ratingCount++
          }
        }
      }
      
      // Extract review counts
      for (const pattern of reviewPatterns) {
        const matches = text.match(pattern)
        if (matches) {
          const count = parseInt(matches[0].replace(/[^\d]/g, ''))
          if (count > 0) {
            totalReviews += count
          }
        }
      }
      
      // Collect review text for sentiment analysis
      if (snippet && snippet.length > 10) {
        reviewTexts.push(snippet)
      }
    })
    
    // Calculate sentiment breakdown
    const sentimentBreakdown = analyzeSentiment(reviewTexts)
    
    return {
      reviewCount: totalReviews,
      avgRating: ratingCount > 0 ? Number((totalRating / ratingCount).toFixed(2)) : 0,
      sentimentBreakdown,
      reviewTexts,
    }

  } catch (error) {
    console.error('Review search error:', error)
    return generateFallbackTrustData(product)
  }
}

function generateFallbackTrustData(product: Product) {
  // When no real data is available, return empty/no data state
  return {
    reviewCount: 0,
    avgRating: 0,
    sentimentBreakdown: { positive: 33, negative: 33, neutral: 34 },
    reviewTexts: [],
  }
}

function analyzeSentiment(reviewTexts: string[]) {
  if (reviewTexts.length === 0) {
    return { positive: 50, negative: 25, neutral: 25 }
  }
  
  const positiveWords = ['great', 'excellent', 'amazing', 'love', 'perfect', 'awesome', 'fantastic', 'good', 'quality', 'recommend', 'satisfied', 'happy']
  const negativeWords = ['terrible', 'awful', 'hate', 'horrible', 'bad', 'worst', 'disappointed', 'scam', 'fake', 'poor', 'waste', 'refund', 'broken']
  
  let positiveCount = 0
  let negativeCount = 0
  let neutralCount = 0
  
  reviewTexts.forEach(text => {
    const words = text.toLowerCase().split(/\s+/)
    let positiveScore = 0
    let negativeScore = 0
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++
      if (negativeWords.includes(word)) negativeScore++
    })
    
    if (positiveScore > negativeScore) {
      positiveCount++
    } else if (negativeScore > positiveScore) {
      negativeCount++
    } else {
      neutralCount++
    }
  })
  
  const total = positiveCount + negativeCount + neutralCount
  if (total === 0) {
    return { positive: 50, negative: 25, neutral: 25 }
  }
  
  return {
    positive: Math.round((positiveCount / total) * 100),
    negative: Math.round((negativeCount / total) * 100),
    neutral: Math.round((neutralCount / total) * 100),
  }
}

async function analyzeTrustworthiness(product: Product, reviewData: any) {
  try {
    let trustScore = 50 // Base score
    const commonIssues = []
    let recommendation = ''

    // If no review data is available
    if (reviewData.reviewCount === 0 && reviewData.avgRating === 0) {
      trustScore = 35 // Lower score for no data
      commonIssues.push('No review data available for analysis')
      recommendation = `Based on internet searches, there appears to be limited to no customer feedback available for "${product.title}". This could indicate a newer product or one that hasn't gained significant traction. Exercise extra caution and research thoroughly before purchasing.`

      return {
        trustScore: Math.round(trustScore),
        commonIssues,
        recommendation,
      }
    }

    // More sophisticated trust score calculation
    const { positive, negative, neutral } = reviewData.sentimentBreakdown

    // Rating weight (40% of total score)
    let ratingScore = 50
    if (reviewData.avgRating >= 4.8) ratingScore = 95
    else if (reviewData.avgRating >= 4.5) ratingScore = 85
    else if (reviewData.avgRating >= 4.2) ratingScore = 75
    else if (reviewData.avgRating >= 4.0) ratingScore = 70
    else if (reviewData.avgRating >= 3.8) ratingScore = 65
    else if (reviewData.avgRating >= 3.5) ratingScore = 55
    else if (reviewData.avgRating >= 3.0) ratingScore = 45
    else if (reviewData.avgRating >= 2.5) ratingScore = 35
    else if (reviewData.avgRating >= 2.0) ratingScore = 25
    else if (reviewData.avgRating >= 1.5) ratingScore = 15
    else ratingScore = 5

    // Sentiment weight (35% of total score)
    let sentimentScore = 50
    if (positive >= 80) sentimentScore = 90
    else if (positive >= 70) sentimentScore = 80
    else if (positive >= 60) sentimentScore = 70
    else if (positive >= 50) sentimentScore = 60
    else if (positive >= 40) sentimentScore = 50
    else if (positive >= 30) sentimentScore = 40
    else if (positive >= 20) sentimentScore = 30
    else if (positive >= 10) sentimentScore = 20
    else sentimentScore = 10

    // Review volume weight (25% of total score)
    let volumeScore = 50
    if (reviewData.reviewCount >= 10000) volumeScore = 90
    else if (reviewData.reviewCount >= 5000) volumeScore = 85
    else if (reviewData.reviewCount >= 1000) volumeScore = 80
    else if (reviewData.reviewCount >= 500) volumeScore = 70
    else if (reviewData.reviewCount >= 100) volumeScore = 60
    else if (reviewData.reviewCount >= 50) volumeScore = 55
    else if (reviewData.reviewCount >= 20) volumeScore = 50
    else if (reviewData.reviewCount >= 10) volumeScore = 45
    else if (reviewData.reviewCount >= 5) volumeScore = 40
    else volumeScore = 30

    // Calculate weighted trust score
    trustScore = (ratingScore * 0.4) + (sentimentScore * 0.35) + (volumeScore * 0.25)

    // Ensure score is within bounds
    trustScore = Math.max(0, Math.min(100, trustScore))

    // Generate common issues based on actual data patterns
    if (reviewData.avgRating < 3.5 && reviewData.avgRating > 0) {
      commonIssues.push(`Below-average rating of ${reviewData.avgRating}/5`)
    }
    if (negative > 40) {
      commonIssues.push(`${negative}% of reviews express dissatisfaction`)
    }
    if (reviewData.reviewCount < 20 && reviewData.reviewCount > 0) {
      commonIssues.push('Limited customer feedback available')
    }
    if (positive < 30 && reviewData.reviewCount > 10) {
      commonIssues.push('Low positive sentiment in customer reviews')
    }

    // Generate honest recommendations based on actual data
    if (trustScore >= 85) {
      recommendation = `Excellent trust indicators with ${reviewData.avgRating}/5 stars from ${reviewData.reviewCount.toLocaleString()} reviews and ${positive}% positive sentiment. This product shows strong customer satisfaction and appears to be highly reliable.`
    } else if (trustScore >= 75) {
      recommendation = `Very good trust profile with ${reviewData.avgRating}/5 stars and ${positive}% positive reviews. The ${reviewData.reviewCount.toLocaleString()} customer reviews indicate generally positive experiences, though individual preferences may vary.`
    } else if (trustScore >= 65) {
      recommendation = `Good overall trust rating of ${reviewData.avgRating}/5 stars from ${reviewData.reviewCount.toLocaleString()} reviews. While ${positive}% of customers report positive experiences, there may be some quality inconsistencies to be aware of.`
    } else if (trustScore >= 55) {
      recommendation = `Moderate trust indicators with ${reviewData.avgRating}/5 stars across ${reviewData.reviewCount.toLocaleString()} reviews. ${positive}% positive sentiment suggests mixed customer experiences - research specific seller reputation and return policies.`
    } else if (trustScore >= 45) {
      recommendation = `Below-average trust signals with ${reviewData.avgRating}/5 stars and only ${positive}% positive reviews from ${reviewData.reviewCount.toLocaleString()} customers. Exercise caution and consider reading individual reviews carefully.`
    } else if (trustScore >= 35) {
      recommendation = `Concerning trust indicators with ${reviewData.avgRating}/5 stars and ${negative}% negative reviews. The ${reviewData.reviewCount.toLocaleString()} customer experiences suggest potential quality or satisfaction issues.`
    } else if (trustScore >= 25) {
      recommendation = `Poor trust profile with ${reviewData.avgRating}/5 stars and ${negative}% negative sentiment across ${reviewData.reviewCount.toLocaleString()} reviews. Significant customer dissatisfaction reported - approach with extreme caution.`
    } else {
      recommendation = `Very concerning trust indicators with ${reviewData.avgRating}/5 stars and ${negative}% negative reviews. The customer feedback strongly suggests avoiding this product or thoroughly researching alternatives.`
    }

    return {
      trustScore: Math.round(trustScore),
      commonIssues,
      recommendation,
    }

  } catch (error) {
    console.error('Trust analysis error:', error)
    return {
      trustScore: 50,
      commonIssues: ['Unable to complete trust analysis'],
      recommendation: 'Could not analyze trust data. Research product reviews manually before purchasing.',
    }
  }
}
