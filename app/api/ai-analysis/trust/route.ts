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
      avgRating: ratingCount > 0 ? Number((totalRating / ratingCount).toFixed(1)) : 0,
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
      trustScore = 40 // Lower score for no data
      commonIssues.push('No review data available for analysis')
      recommendation = 'Insufficient review data to assess trustworthiness. Research this product manually and verify seller authenticity before purchasing.'
      
      return {
        trustScore,
        commonIssues,
        recommendation,
      }
    }
    
    // Factor in review count
    if (reviewData.reviewCount > 1000) trustScore += 20
    else if (reviewData.reviewCount > 100) trustScore += 10
    else if (reviewData.reviewCount > 10) trustScore += 5
    else if (reviewData.reviewCount === 0) trustScore -= 10
    
    // Factor in average rating
    if (reviewData.avgRating >= 4.5) trustScore += 20
    else if (reviewData.avgRating >= 4.0) trustScore += 15
    else if (reviewData.avgRating >= 3.5) trustScore += 10
    else if (reviewData.avgRating < 2.0 && reviewData.avgRating > 0) trustScore -= 20
    
    // Factor in sentiment
    const { positive, negative } = reviewData.sentimentBreakdown
    if (positive > 70) trustScore += 15
    else if (positive > 50) trustScore += 5
    if (negative > 40) trustScore -= 15
    else if (negative > 25) trustScore -= 5
    
    // Ensure score is within bounds
    trustScore = Math.max(0, Math.min(100, trustScore))
    
    // Generate common issues and recommendations based on actual data
    if (reviewData.reviewCount > 0 && reviewData.avgRating < 3.0) {
      commonIssues.push('Low customer satisfaction ratings')
    }
    if (reviewData.sentimentBreakdown.negative > 30) {
      commonIssues.push('Significant number of negative reviews')
    }
    if (reviewData.reviewCount > 0 && reviewData.reviewCount < 10) {
      commonIssues.push('Limited review data available')
    }
    
    // Generate recommendations based on trust score and data quality
    if (trustScore >= 80) {
      recommendation = 'This product appears to be trustworthy with good customer feedback. Safe to purchase from reputable sellers.'
    } else if (trustScore >= 60) {
      recommendation = 'Generally trustworthy but do some additional research. Check seller reputation and return policies.'
    } else if (trustScore >= 40) {
      recommendation = 'Mixed reviews and moderate trust signals. Proceed with caution and verify authenticity.'
    } else {
      recommendation = 'Low trust score detected. Be very careful and consider alternative products or sellers.'
    }
    
    return {
      trustScore,
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
