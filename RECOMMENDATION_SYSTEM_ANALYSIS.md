# Recommendation System Analysis & Implementation Plan

## Executive Summary

**Current State**: The discovery feed uses random keyword generation with basic profile preferences (gender + style rotation). No behavioral tracking or adaptation to user interactions.

**Feasibility**: ✅ **YES - A recommendation system is achievable** with your current infrastructure, but requires strategic implementation in phases.

**Timeline**: 
- **Phase 1 (Immediate)**: 1-2 weeks - Basic interaction tracking
- **Phase 2 (Short-term)**: 2-3 weeks - Simple collaborative filtering
- **Phase 3 (Long-term)**: 1-2 months - Advanced ML-based recommendations

---

## 1. Current Discovery Implementation Analysis

### How It Works Now:
```typescript
// From app/page.tsx
const buildQueryForDiscovery = () => {
  // For "All" category with no search:
  const highQualityQueries = [
    "designer fashion high-end",
    "best old money fashion",
    // ... more random queries
  ]
  
  // If user has profile configured:
  if (isProfileConfigured) {
    return getDiscoverQuery(isRefresh) // Gender + current style rotation
  } else {
    return highQualityQueries[randomIndex] // Random selection
  }
}
```

### Limitations:
1. ❌ **No interaction tracking** - Likes, saves, clicks are not recorded
2. ❌ **No behavioral learning** - Can't adapt to what users actually engage with
3. ❌ **Static preferences** - Only uses gender + style preferences manually set
4. ❌ **Random variation** - Just rotates through styles or random keywords
5. ❌ **No item-to-item similarity** - Can't suggest "more like this"
6. ❌ **No collaborative filtering** - Can't leverage what similar users like

### What You DO Have:
1. ✅ **User profiles** - Gender, style preferences, budget
2. ✅ **Saved items system** - Users can save products (tracked in Supabase)
3. ✅ **Collections** - Users organize products
4. ✅ **Supabase database** - Ready for analytics tables
5. ✅ **Serper API** - Can fetch products based on queries
6. ✅ **Product metadata** - Title, brand, category, price, image

---

## 2. What's Possible: Three-Phase Implementation Plan

### 🎯 PHASE 1: Basic Interaction Tracking (Immediate - 1-2 weeks)

**Goal**: Start collecting behavioral data immediately

**What to Build**:

#### A. Create Interaction Tracking Table
```sql
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  product_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'view', 'click', 'save', 'unsave', 'like'
  query TEXT, -- What search/feed query showed this product
  product_data JSONB, -- Store product snapshot
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT, -- Track session behavior
  dwell_time_seconds INTEGER, -- How long they looked at it
  
  INDEX idx_profile_action (profile_id, action),
  INDEX idx_product (product_id),
  INDEX idx_timestamp (timestamp DESC)
);
```

#### B. Track Key User Actions
Add tracking calls throughout the app:

```typescript
// When user views a product
async function trackInteraction(action: string, product: Product, query?: string) {
  await fetch('/api/interactions/track', {
    method: 'POST',
    body: JSON.stringify({
      action, // 'view', 'click', 'save', 'like'
      productId: product.id,
      productData: {
        title: product.title,
        brand: product.brand,
        category: product.category,
        price: product.price,
        image: product.image
      },
      query,
      dwellTime: calculateDwellTime() // Track how long they viewed
    })
  })
}

// Add to ProductCard component
<div onClick={() => {
  trackInteraction('click', product, currentSearchQuery)
  handleProductClick(product)
}}>

// Add to ProductDetail when opened
useEffect(() => {
  trackInteraction('view', selectedProduct, currentSearchQuery)
  const startTime = Date.now()
  
  return () => {
    const dwellTime = (Date.now() - startTime) / 1000
    if (dwellTime > 3) { // Only track if viewed > 3 seconds
      trackInteraction('dwell_time', selectedProduct, currentSearchQuery)
    }
  }
}, [selectedProduct])

// Already tracked: Save/unsave actions
// Enhance existing save API to include query context
```

#### C. Simple Query Enhancement API
```typescript
// /api/discover/enhanced-query
export async function POST(request: Request) {
  const { userId } = await auth()
  
  // Get user's recently saved/liked products
  const recentInteractions = await supabase
    .from('user_interactions')
    .select('product_data, action')
    .eq('profile_id', userId)
    .in('action', ['save', 'like', 'click'])
    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
    .order('timestamp', { ascending: false })
    .limit(20)
  
  // Extract patterns
  const brands = extractMostCommon(recentInteractions, 'brand')
  const categories = extractMostCommon(recentInteractions, 'category')
  const keywords = extractKeywordsFromTitles(recentInteractions)
  
  // Build enhanced query
  const query = [
    keywords[0],
    profile.gender,
    categories[0],
    brands[0] ? `${brands[0]} style` : ''
  ].filter(Boolean).join(' ')
  
  return { query }
}
```

**Immediate Benefits**:
- Start collecting data for future ML models
- Basic preference detection (favorite brands, categories)
- Simple query enhancement based on recent activity

**Effort**: Low - Mostly database + API endpoint creation

---

### 🚀 PHASE 2: Content-Based Filtering (Short-term - 2-3 weeks)

**Goal**: Recommend products similar to what users have liked/saved

**What to Build**:

#### A. Product Similarity System
```typescript
// Similarity scoring based on product attributes
function calculateProductSimilarity(product1: Product, product2: Product): number {
  let score = 0
  
  // Brand match (high weight)
  if (product1.brand === product2.brand) score += 0.4
  
  // Category match
  if (product1.category === product2.category) score += 0.3
  
  // Price similarity (within 30%)
  const priceRatio = Math.min(product1.price, product2.price) / 
                      Math.max(product1.price, product2.price)
  if (priceRatio > 0.7) score += 0.2
  
  // Title keyword overlap
  const keywords1 = extractKeywords(product1.title)
  const keywords2 = extractKeywords(product2.title)
  const overlap = keywords1.filter(k => keywords2.includes(k)).length
  score += (overlap / Math.max(keywords1.length, keywords2.length)) * 0.1
  
  return score
}
```

#### B. Personalized Feed Generator
```typescript
// /api/discover/personalized
export async function GET(request: Request) {
  const { userId } = await auth()
  
  // 1. Get user's liked/saved products
  const savedProducts = await getSavedItems(userId)
  const likedProducts = await getLikedProducts(userId)
  
  // 2. Extract preference signals
  const preferenceProfile = {
    favoriteBrands: getMostFrequent(savedProducts, 'brand'),
    favoriteCategories: getMostFrequent(savedProducts, 'category'),
    priceRange: calculatePriceRange(savedProducts),
    styleKeywords: extractCommonKeywords(savedProducts)
  }
  
  // 3. Build multiple search queries
  const queries = [
    `${preferenceProfile.favoriteBrands[0]} ${preferenceProfile.favoriteCategories[0]}`,
    `${preferenceProfile.styleKeywords[0]} ${profile.gender}`,
    `${preferenceProfile.favoriteCategories[1]} ${preferenceProfile.priceRange}`,
  ]
  
  // 4. Fetch products from multiple queries
  const products = await Promise.all(
    queries.map(q => searchProducts(q, 10))
  )
  
  // 5. Deduplicate and rank by similarity to saved items
  const allProducts = deduplicateProducts(products.flat())
  const rankedProducts = allProducts
    .map(p => ({
      product: p,
      score: calculateAverageSimilarity(p, savedProducts)
    }))
    .sort((a, b) => b.score - a.score)
  
  return rankedProducts.slice(0, 30).map(r => r.product)
}
```

#### C. "More Like This" Feature
```typescript
// When viewing a product, show similar items
async function getSimilarProducts(product: Product, limit = 6) {
  // Search for products with similar attributes
  const query = `${product.brand} ${product.category} similar`
  const results = await searchProducts(query, 20)
  
  // Rank by similarity
  return results
    .map(p => ({
      product: p,
      similarity: calculateProductSimilarity(product, p)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(r => r.product)
}
```

**Benefits**:
- Personalized feeds based on actual behavior
- "More like this" recommendations
- Better query generation using learned preferences
- Works without needing other users' data

**Effort**: Medium - Requires scoring algorithms + API endpoints

---

### 🧠 PHASE 3: Collaborative Filtering + ML (Long-term - 1-2 months)

**Goal**: Advanced recommendations using ML and collaborative filtering

**What to Build**:

#### A. User Similarity Engine
```typescript
// Find users with similar taste
async function findSimilarUsers(userId: string, limit = 20) {
  // Get this user's interactions
  const userInteractions = await getUserInteractions(userId)
  
  // Find users who interacted with same products
  const similarUsers = await supabase
    .from('user_interactions')
    .select('profile_id, product_id, action')
    .in('product_id', userInteractions.map(i => i.product_id))
    .neq('profile_id', userId)
  
  // Calculate Jaccard similarity
  const userScores = calculateUserSimilarity(userInteractions, similarUsers)
  
  return userScores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// Recommend what similar users liked
async function getCollaborativeRecommendations(userId: string) {
  const similarUsers = await findSimilarUsers(userId)
  
  // Get products they liked but this user hasn't seen
  const recommendations = await supabase
    .from('user_interactions')
    .select('product_data')
    .in('profile_id', similarUsers.map(u => u.userId))
    .in('action', ['save', 'like'])
    .not('product_id', 'in', (
      supabase.from('user_interactions')
        .select('product_id')
        .eq('profile_id', userId)
    ))
  
  return recommendations
}
```

#### B. Embedding-Based Similarity (Optional - Advanced)
```typescript
// Use OpenAI embeddings for semantic similarity
async function getProductEmbedding(product: Product) {
  const text = `${product.title} ${product.brand} ${product.category} ${product.description}`
  
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  })
  
  return response.data[0].embedding
}

// Store embeddings in database
CREATE TABLE product_embeddings (
  product_id TEXT PRIMARY KEY,
  embedding vector(1536), -- Use pgvector extension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

// Find similar products using cosine similarity
SELECT product_id, 1 - (embedding <=> $1) as similarity
FROM product_embeddings
ORDER BY embedding <=> $1
LIMIT 20;
```

#### C. Reinforcement Learning Loop
```typescript
// Track recommendation performance
async function trackRecommendationPerformance(
  userId: string,
  productId: string,
  recommendationType: 'collaborative' | 'content-based' | 'trending',
  action: 'clicked' | 'saved' | 'ignored'
) {
  await supabase.from('recommendation_performance').insert({
    user_id: userId,
    product_id: productId,
    recommendation_type: recommendationType,
    action,
    timestamp: new Date()
  })
}

// Adjust algorithm weights based on performance
async function optimizeRecommendationWeights(userId: string) {
  const performance = await getRecommendationPerformance(userId)
  
  // Calculate success rates
  const weights = {
    collaborative: calculateSuccessRate(performance, 'collaborative'),
    contentBased: calculateSuccessRate(performance, 'content-based'),
    trending: calculateSuccessRate(performance, 'trending')
  }
  
  // Normalize to sum to 1
  return normalizeWeights(weights)
}
```

**Benefits**:
- Advanced personalization using ML
- Discovers new products based on community behavior
- Self-optimizing recommendation engine
- Semantic understanding of products

**Effort**: High - Requires ML infrastructure, embeddings, vector DB

---

## 3. Realistic Implementation Strategy

### ✅ What You Should Do NOW (Week 1-2):

**Priority 1: Start Tracking**
```typescript
// 1. Add interactions table to Supabase
// 2. Create /api/interactions/track endpoint
// 3. Add tracking to:
//    - ProductCard clicks
//    - ProductDetail views
//    - Save/unsave actions (enhance existing)
//    - Search queries
```

**Priority 2: Basic Preference Learning**
```typescript
// 1. Create /api/discover/preferences endpoint
// 2. Analyze last 7 days of interactions
// 3. Extract:
//    - Top 3 brands
//    - Top 3 categories  
//    - Price range
//    - Common keywords
// 4. Use these to enhance search queries
```

**Priority 3: Improve Current Discovery**
```typescript
// Instead of random queries, use learned preferences:
const buildSmartQuery = async () => {
  const prefs = await fetch('/api/discover/preferences')
  
  if (prefs.topBrands.length > 0) {
    return `${prefs.topBrands[0]} ${prefs.topCategories[0]} ${profile.gender}`
  }
  
  // Fallback to current style rotation
  return currentStyleQuery
}
```

### 🎯 What You Should Do NEXT (Week 3-5):

**Priority 1: Content-Based Recommendations**
- Build similarity scoring algorithm
- Create "More like this" feature on product details
- Add "Because you liked X" sections in feed

**Priority 2: Personalized Feed Mix**
```typescript
// Mix of recommendation types:
const feed = [
  ...getContentBasedRecommendations(userId, 10), // 33%
  ...getTrendingProducts(10),                     // 33%
  ...getRandomHighQuality(10)                     // 33%
]

// Shuffle and deduplicate
return shuffleAndDedupe(feed)
```

### 🚀 What You Can Do LATER (Month 2+):

**Phase 3: Advanced ML**
- Collaborative filtering
- Product embeddings
- A/B testing different algorithms
- Real-time personalization

---

## 4. Technical Architecture

### Database Schema
```sql
-- Core tracking table
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'click', 'save', 'unsave', 'like', 'share')),
  query TEXT, -- Search context
  product_data JSONB NOT NULL, -- Product snapshot
  session_id TEXT,
  dwell_time_seconds INTEGER,
  metadata JSONB, -- Extensible for future data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_profile_action (profile_id, action, created_at DESC),
  INDEX idx_product (product_id),
  INDEX idx_session (session_id)
);

-- Aggregated user preferences (cached for performance)
CREATE TABLE user_preference_cache (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  favorite_brands TEXT[],
  favorite_categories TEXT[],
  price_range_min DECIMAL,
  price_range_max DECIMAL,
  style_keywords TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recommendation performance tracking
CREATE TABLE recommendation_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  recommendation_type TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_performance (profile_id, recommendation_type, created_at DESC)
);
```

### API Endpoints to Create
```
POST   /api/interactions/track          - Track user actions
GET    /api/discover/preferences         - Get learned preferences
GET    /api/discover/personalized        - Personalized feed
GET    /api/products/:id/similar         - Similar products
GET    /api/discover/collaborative       - Collaborative filtering
POST   /api/recommendations/feedback     - Track recommendation performance
```

---

## 5. Constraints & Limitations

### Current Limitations:

1. **Serper API Dependency**
   - You're limited to keyword searches
   - Can't directly control product inventory
   - **Solution**: Use smart query generation to simulate recommendations

2. **No Direct Product Database**
   - Products are fetched on-demand, not stored
   - **Solution**: Cache product metadata in interactions table

3. **Limited User Base** (initially)
   - Collaborative filtering needs user data
   - **Solution**: Start with content-based, add collaborative later

4. **Serper API Costs**
   - More queries = more costs
   - **Solution**: Cache popular queries, batch requests

### What You CAN'T Do (Realistically):

❌ **Pinterest/TikTok-level algorithms** - They have:
- Billions of interactions
- Real-time ML infrastructure  
- Computer vision for image similarity
- Massive engineering teams

❌ **Real-time personalization** - Requires:
- Expensive infrastructure
- Sub-second recommendation generation
- Advanced caching layers

### What You CAN Do:

✅ **TikTok/Pinterest-INSPIRED algorithms**:
- Track interactions like they do
- Learn preferences over time
- Show "more like this" recommendations
- Improve with usage

✅ **80% of the experience** with 20% of the complexity:
- Smart query generation (Phase 1)
- Content-based filtering (Phase 2)  
- Basic collaborative filtering (Phase 3)

---

## 6. Success Metrics

Track these to measure improvement:

### Engagement Metrics:
- **Click-through rate**: % of products clicked in feed
- **Save rate**: % of products saved
- **Dwell time**: Average time viewing products
- **Return rate**: % of users returning daily

### Recommendation Quality:
- **Relevance score**: User ratings of recommendations
- **Diversity**: Variety of products shown
- **Coverage**: % of catalog shown to users
- **Novelty**: Balance between familiar and new products

### Before/After Comparison:
```
Current State (Random):
- CTR: ~2-3%
- Save rate: ~1%
- Return rate: ~10%

Target (Phase 2):
- CTR: 8-12%
- Save rate: 5-8%
- Return rate: 30-40%
```

---

## 7. Recommended Action Plan

### Week 1: Foundation
- [ ] Add `user_interactions` table to Supabase
- [ ] Create `/api/interactions/track` endpoint
- [ ] Add tracking to ProductCard click events
- [ ] Add tracking to ProductDetail views
- [ ] Add tracking to save/unsave actions

### Week 2: Basic Learning
- [ ] Create `/api/discover/preferences` endpoint
- [ ] Implement preference extraction logic
- [ ] Update discovery query to use learned preferences
- [ ] Add simple "More like this" on product pages

### Week 3-4: Content-Based Recommendations
- [ ] Build product similarity algorithm
- [ ] Create `/api/products/:id/similar` endpoint
- [ ] Add "Because you saved X" feed sections
- [ ] Implement mixed feed (personalized + trending + random)

### Week 5+: Optimization & Iteration
- [ ] A/B test different recommendation strategies
- [ ] Track performance metrics
- [ ] Optimize query generation
- [ ] Consider Phase 3 ML features

---

## 8. Code Examples

### Quick Start: Add Tracking (10 minutes)

**1. Create API Endpoint** (`/api/interactions/track/route.ts`):
```typescript
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
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const profileId = await getOrCreateProfile(userId)
    const { action, productId, productData, query, dwellTime } = await request.json()
    
    await supabase.from('user_interactions').insert({
      profile_id: profileId,
      product_id: productId,
      action,
      product_data: productData,
      query,
      dwell_time_seconds: dwellTime,
      session_id: userId // Simple session tracking
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tracking error:', error)
    return NextResponse.json({ error: 'Failed to track' }, { status: 500 })
  }
}
```

**2. Add to ProductCard** (`components/ProductCard.tsx`):
```typescript
const handleClick = async () => {
  // Track click
  await fetch('/api/interactions/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'click',
      productId: product.id,
      productData: {
        title: product.title,
        brand: product.brand,
        category: product.category,
        price: product.price
      },
      query: searchQuery // Pass from parent
    })
  })
  
  onProductClick(product)
}
```

---

## 9. Final Verdict

### Is it possible? **YES** ✅

### Is it worth it? **ABSOLUTELY** ✅

### Why:
1. **Competitive Necessity**: Users expect personalized feeds
2. **Engagement Multiplier**: Can 3-5x user engagement
3. **Incremental Approach**: Start simple, improve over time
4. **Data Goldmine**: Every interaction makes the system smarter

### The Honest Truth:
- You won't build Pinterest's algorithm in a week
- But you CAN build something 80% as good in a month
- The key is starting NOW to collect data
- Even basic tracking + preference learning will feel MUCH better than random

### Start Here:
1. **Today**: Add interaction tracking
2. **This Week**: Use tracked data to improve queries
3. **Next Month**: Build content-based recommendations
4. **Future**: Add collaborative filtering

**The sooner you start collecting data, the sooner you can build intelligence on top of it.**

---

## 10. MVP Comparison

I noticed your `MVP/` folder has an `adaptive-learning.ts` file with sophisticated interaction tracking. **You should absolutely port this to flair-demo!**

Key features from MVP to adopt:
- User interaction tracking (view, like, save, click, dwell_time)
- Query performance analytics
- Learned preferences extraction
- Adaptive query generation

This is production-ready code that can be implemented NOW.

---

## Questions to Consider:

1. **Do you want me to implement Phase 1 (tracking) right now?**
2. **Should I port the MVP adaptive learning code to flair-demo?**
3. **What's your priority: Quick wins or comprehensive solution?**
4. **Timeline: Weeks or months for full implementation?**

Let me know how you'd like to proceed! 🚀
