import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateProfile } from '@/lib/database-service-v2'
import { createClient } from '@supabase/supabase-js'
import { searchForProducts } from '@/lib/products-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface FeedGenerationRequest {
  surface?: string
  limit?: number
  session_id?: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const surface = searchParams.get('surface') || 'discovery'
    const limit = parseInt(searchParams.get('limit') || '20')
    const sessionId = searchParams.get('session_id')
    const anonymousId = searchParams.get('anonymous_id')

    // Support both authenticated and anonymous users
    const { userId } = await auth()
    let profileId: string | null = null

    if (userId) {
      profileId = await getOrCreateProfile(userId)
    } else if (!anonymousId) {
      return NextResponse.json(
        { error: 'Missing anonymous_id or authentication' },
        { status: 400 }
      )
    }

    // Ensure session exists or create new one
    let currentSessionId = sessionId
    if (!currentSessionId) {
      const sessionResult = await supabase
        .from('sessions')
        .insert({
          profile_id: profileId || null,
          anonymous_id: anonymousId || null,
          started_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          device: request.headers.get('user-agent') || 'unknown',
        })
        .select('session_id')
        .single()

      if (sessionResult.error) throw sessionResult.error
      currentSessionId = sessionResult.data.session_id
    }

    // Get user preference cache - for authenticated users
    let prefResult: any = { data: null }
    if (profileId) {
      prefResult = await supabase
        .from('user_preference_cache')
        .select('*')
        .eq('profile_id', profileId)
        .single()
    }

    // For anonymous users, get recent clicks to personalize
    let recentClicks: any[] = []
    if (anonymousId && !profileId) {
      const clickResult = await supabase
        .from('user_events')
        .select('product_id')
        .eq('anonymous_id', anonymousId)
        .eq('action', 'click')
        .order('created_at', { ascending: false })
        .limit(20)

      if (!clickResult.error && clickResult.data) {
        recentClicks = clickResult.data
      }
    }

    // Build personalized search queries
    const queries: string[] = []

    if (prefResult.data) {
      const prefs = prefResult.data
      const brands = prefs.favorite_brands?.slice(0, 2) || []
      const categories = prefs.favorite_categories?.slice(0, 2) || []
      const keywords = prefs.style_keywords?.slice(0, 1) || []

      if (brands.length > 0 && categories.length > 0) {
        queries.push(`${brands[0]} ${categories[0]}`)
      }
      if (keywords.length > 0) {
        queries.push(`${keywords[0]} fashion`)
      }
      if (brands.length > 1) {
        queries.push(`${brands[1]} style`)
      }
    } else if (recentClicks.length > 0) {
      // For anonymous users with clicks, fetch those products to get metadata
      const productIds = recentClicks.slice(0, 5).map(c => c.product_id)
      const productsResult = await supabase
        .from('product_catalog')
        .select('brand, category')
        .in('product_id', productIds)

      if (!productsResult.error && productsResult.data) {
        const brands = Array.from(new Set(productsResult.data.map(p => p.brand).filter(Boolean))).slice(0, 2)
        const categories = Array.from(new Set(productsResult.data.map(p => p.category).filter(Boolean))).slice(0, 2)
        
        if (brands.length > 0 && categories.length > 0) {
          queries.push(`${brands[0]} ${categories[0]}`)
        }
        if (brands.length > 1) {
          queries.push(`${brands[1]} fashion`)
        }
      }
    }

    // Fallback queries if no preferences exist
    if (queries.length === 0) {
      queries.push('designer fashion', 'high-end clothing', 'luxury brands')
    }

    // Fetch candidates from multiple queries
    const candidatePromises = queries.slice(0, 3).map(q =>
      searchForProducts(q, Math.ceil(limit * 1.5), userId)
    )
    const candidateArrays = await Promise.all(candidatePromises)
    const allCandidates = candidateArrays.flat()

    // Deduplicate by product link
    const seenLinks = new Set<string>()
    const dedupedProducts = allCandidates.filter(p => {
      const link = p.link || ''
      if (seenLinks.has(link)) return false
      seenLinks.add(link)
      return true
    })

    // Slice to requested limit
    const finalProducts = dedupedProducts.slice(0, limit)

    // Store products in catalog for future reference
    const catalogInserts = finalProducts.map(p => ({
      product_id: generateProductId(p),
      source: 'serper',
      source_key: p.link,
      title: p.title,
      brand: p.brand,
      category: p.category,
      price: p.price ? parseFloat(p.price.toString()) : null,
      currency: 'USD',
      image_url: p.image,
      url: p.link,
      attributes: {
        description: p.description,
      },
    }))

    // Upsert into product_catalog
    for (const insert of catalogInserts) {
      await supabase
        .from('product_catalog')
        .upsert(insert, { onConflict: 'product_id' })
    }

    // Create impression
    const impressionItems = finalProducts.map((p, idx) => ({
      product_id: generateProductId(p),
      rank: idx,
      rec_type: 'content',
      score: 1 - idx * 0.05, // Decay score by position
    }))

    const impressionResult = await supabase
      .from('impressions')
      .insert({
        profile_id: profileId || null,
        session_id: currentSessionId,
        surface,
        items: impressionItems,
        context: {
          queries: queries.slice(0, 3),
          anonymous_id: anonymousId,
        },
        created_at: new Date().toISOString(),
      })
      .select('impression_id')
      .single()

    if (impressionResult.error) throw impressionResult.error

    // Track recommendation performance
    for (const item of impressionItems) {
      await supabase.from('recommendation_performance').insert({
        profile_id: profileId || null,
        product_id: item.product_id,
        rec_type: item.rec_type,
        action: 'impression',
        position: item.rank,
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      impression_id: impressionResult.data.impression_id,
      session_id: currentSessionId,
      items: finalProducts.map((p, idx) => ({
        ...p,
        product_id: generateProductId(p),
        rank: idx,
        rec_type: 'content',
      })),
    })
  } catch (error) {
    console.error('Feed generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate feed' },
      { status: 500 }
    )
  }
}

function generateProductId(product: any): string {
  // SHA256-like stable hash from URL + brand + title
  const text = `${product.link || ''}|${product.brand || ''}|${product.title || ''}`
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `prod_${Math.abs(hash).toString(36)}`
}
