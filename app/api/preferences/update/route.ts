import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateProfile } from '@/lib/database-service-v2'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profileId = await getOrCreateProfile(userId)

    // Get recent interactions (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const eventsResult = await supabase
      .from('user_events')
      .select('action, product_id, created_at')
      .eq('profile_id', profileId)
      .in('action', ['click', 'save', 'like'])
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(500)

    if (eventsResult.error) throw eventsResult.error

    const events = eventsResult.data

    // Get product data for all interacted products
    const productIds = Array.from(
      new Set(events.map(e => e.product_id).filter(Boolean))
    )
    const productsResult = await supabase
      .from('product_catalog')
      .select('product_id, brand, category, price')
      .in('product_id', productIds)

    if (productsResult.error) throw productsResult.error

    const productMap = new Map(
      productsResult.data.map(p => [p.product_id, p])
    )

    // Aggregate preferences with recency weight
    const brandScores = new Map<string, number>()
    const categoryScores = new Map<string, number>()
    const priceValues: number[] = []

    for (const event of events) {
      const product = productMap.get(event.product_id)
      if (!product) continue

      // Recency weight (recent events matter more)
      const daysSince = (Date.now() - new Date(event.created_at).getTime()) / (24 * 60 * 60 * 1000)
      const weight = Math.exp(-daysSince / 7) // Half-life of 7 days

      // Action weight
      const actionWeight =
        event.action === 'save' ? 3 : event.action === 'like' ? 2 : 1

      const totalWeight = weight * actionWeight

      if (product.brand) {
        brandScores.set(
          product.brand,
          (brandScores.get(product.brand) || 0) + totalWeight
        )
      }

      if (product.category) {
        categoryScores.set(
          product.category,
          (categoryScores.get(product.category) || 0) + totalWeight
        )
      }

      if (product.price) {
        priceValues.push(product.price)
      }
    }

    // Get top brands and categories
    const topBrands = Array.from(brandScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand]) => brand)

    const topCategories = Array.from(categoryScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat)

    // Calculate price range (25th to 75th percentile)
    let priceMin: number | null = null
    let priceMax: number | null = null

    if (priceValues.length > 0) {
      priceValues.sort((a, b) => a - b)
      const p25 = Math.floor(priceValues.length * 0.25)
      const p75 = Math.floor(priceValues.length * 0.75)
      priceMin = priceValues[Math.max(0, p25)]
      priceMax = priceValues[Math.min(priceValues.length - 1, p75)]
    }

    // Update preference cache
    const updateResult = await supabase
      .from('user_preference_cache')
      .upsert(
        {
          profile_id: profileId,
          favorite_brands: topBrands,
          favorite_categories: topCategories,
          price_min: priceMin,
          price_max: priceMax,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      )
      .select()
      .single()

    if (updateResult.error) throw updateResult.error

    return NextResponse.json({
      success: true,
      preferences: updateResult.data,
    })
  } catch (error) {
    console.error('Preference update error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
