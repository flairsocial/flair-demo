# Phase 1: Foundation + Heuristic Personalization (Weeks 1–2)

## ✅ Completed

### Migrations Applied
- ✅ `001_create_product_catalog_table` – canonicalized product storage
- ✅ `002_create_sessions_table` – session tracking
- ✅ `003_create_impressions_table` – feed impressions at rank/position
- ✅ `004_create_event_action_type_and_user_events_table` – user event logging
- ✅ `005_create_user_preference_cache_table` – cached user preferences
- ✅ `006_create_recommendation_performance_table` – rec algorithm performance tracking

### APIs Created
1. **`POST /api/feed`** (`app/api/feed/route.ts`)
   - Generates personalized feed based on user preferences
   - Creates impressions with rank/position metadata
   - Returns impression_id for event linking
   - Upserts products into product_catalog for deduplication

2. **`POST /api/analytics/track`** (`app/api/analytics/track/route.ts`)
   - Tracks: click, save, unsave, like, share, chat_open, chat_message
   - Links events to impressions for position-bias analysis
   - Updates saved_items on save/unsave
   - Extracts keywords from chat and updates preference cache
   - Updates recommendation_performance for model training

3. **`POST /api/preferences/update`** (`app/api/preferences/update/route.ts`)
   - Aggregates recent interactions (30 days) with recency decay
   - Extracts top brands, categories, price range
   - Uses exponential decay: half-life = 7 days for clicks, higher weight for saves
   - Updates user_preference_cache

### Client Library
- **`useAnalytics` hook** (`lib/hooks/useAnalytics.ts`)
  - `trackClick()` – product clicked
  - `trackSave()` – product saved
  - `trackUnsave()` – product unsaved
  - `trackChatMessage()` – user chatted about product
  - `trackChatOpen()` – user opened chat with product
  - `trackDwell()` – user viewed for N seconds

---

## 🔧 Integration Steps

### 1. Add Feed Hook (Frontend)
Create a new hook to manage feed state and session:

```typescript path=null start=null
// lib/hooks/useFeed.ts
import { useState, useEffect } from 'react'

interface FeedItem {
  product_id: string
  rank: number
  rec_type: string
  [key: string]: any
}

export function useFeed() {
  const [impression_id, setImpressionId] = useState<string>()
  const [session_id, setSessionId] = useState<string>()
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(false)

  const generateFeed = async (surface = 'discovery', limit = 20) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/feed?surface=${surface}&limit=${limit}&session_id=${session_id || ''}`
      )
      const data = await response.json()
      setImpressionId(data.impression_id)
      setSessionId(data.session_id)
      setItems(data.items)
    } catch (error) {
      console.error('Feed generation error:', error)
    } finally {
      setLoading(false)
    }
  }

  return { impression_id, session_id, items, loading, generateFeed }
}
```

### 2. Integrate Feed in Discovery Page
Update your discovery/feed component:

```typescript path=null start=null
// app/page.tsx or feed component
import { useFeed } from '@/lib/hooks/useFeed'
import { useAnalytics } from '@/lib/hooks/useAnalytics'

export default function DiscoveryPage() {
  const { impression_id, session_id, items, generateFeed } = useFeed()
  const { trackClick, trackSave, trackChatOpen, trackDwell } = useAnalytics()

  useEffect(() => {
    generateFeed('discovery', 20)
  }, [])

  const handleProductClick = (product: any, index: number) => {
    trackClick(product.product_id, impression_id, session_id)
    // Navigate to product detail
  }

  const handleSave = (product: any) => {
    trackSave(product.product_id, product, impression_id)
    // Update UI
  }

  const handleChatOpen = (product: any) => {
    trackChatOpen(product.product_id, session_id)
    // Open chat modal
  }

  return (
    <div>
      {items.map((product, idx) => (
        <ProductCard
          key={product.product_id}
          product={product}
          onClick={() => handleProductClick(product, idx)}
          onSave={() => handleSave(product)}
          onChatOpen={() => handleChatOpen(product)}
        />
      ))}
    </div>
  )
}
```

### 3. Track Chat Messages
In your chat component:

```typescript path=null start=null
// components/ItemChat.tsx
import { useAnalytics } from '@/lib/hooks/useAnalytics'

export function ItemChat({ productId, sessionId }: Props) {
  const { trackChatMessage } = useAnalytics()

  const handleSendMessage = async (message: string) => {
    // Send message to LLM/backend
    trackChatMessage(productId, message, sessionId)
    // Update chat UI
  }

  return (
    // Chat UI
  )
}
```

### 4. Setup Background Preference Update Job
Create a scheduled job to refresh preferences (e.g., via cron or edge function):

```typescript path=null start=null
// api/cron/update-preferences.ts (or similar)
export const config = {
  runtime: 'nodejs',
}

export default async function handler(req: any, res: any) {
  // Validate cron secret
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(...)
  
  // Get all active profiles
  const profiles = await supabase
    .from('profiles')
    .select('id')
    .limit(1000)

  // Trigger preference update for each
  for (const profile of profiles.data || []) {
    await fetch('/api/preferences/update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile_id: profile.id }),
    })
  }

  res.json({ success: true })
}
```

---

## 📊 Acceptance Criteria

### Data Capture
- [ ] **95%+ events linked to impressions**: Every product click/save/view includes impression_id
- [ ] **99%+ product catalog coverage**: Products in feed stored in product_catalog within 1 minute
- [ ] **No data loss**: Event ingestion error rate <0.1%

### Personalization
- [ ] **2x CTR uplift**: Smoke test on 10% cohort shows CTR@20 ≥ 2x baseline
- [ ] **Non-zero brand preference**: >80% of users show preference for ≥1 brand after 5 interactions
- [ ] **Preference cache freshness**: Updated within 1 hour of new interactions

### Performance
- [ ] **<300ms p95 feed latency**: Feed endpoint returns within 300ms (excluding Serper)
- [ ] **<100ms p95 tracking latency**: Analytics endpoint acks within 100ms
- [ ] **Session creation <50ms**: Session table inserts in <50ms

### Quality
- [ ] **Zero duplicate products in feed**: Deduplication by product_id 100% effective
- [ ] **Diversity maintained**: Feed doesn't exceed 40% single brand in top 20
- [ ] **No cold-start failure**: All new users receive fallback queries

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Create test user
- [ ] Generate feed; verify impression created with all items
- [ ] Click on product; verify event captured with correct impression_id
- [ ] Save product; verify it appears in saved_items and recommendation_performance
- [ ] Send chat message; verify keywords extracted to preference cache
- [ ] Check preferences updated; verify brands/categories reflect recent saves

### Data Validation
- [ ] Query impressions table: `SELECT COUNT(*) FROM impressions WHERE created_at > NOW() - INTERVAL '1 day'`
- [ ] Query user_events table: `SELECT action, COUNT(*) FROM user_events GROUP BY action`
- [ ] Check product_catalog: `SELECT COUNT(*) FROM product_catalog`
- [ ] Verify joins: `SELECT u.* FROM user_events u JOIN impressions i ON u.impression_id = i.impression_id LIMIT 10`

### SQL Queries for Debugging
```sql
-- Event-Impression join rate
SELECT 
  COUNT(CASE WHEN u.impression_id IS NOT NULL THEN 1 END)::float / 
  COUNT(*)::float * 100 as join_rate
FROM user_events u;

-- Events per user
SELECT 
  profile_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT action) as action_types
FROM user_events
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY profile_id
ORDER BY event_count DESC;

-- Top products by interaction
SELECT 
  product_id,
  COUNT(*) as total_events,
  COUNT(CASE WHEN action = 'click' THEN 1 END) as clicks,
  COUNT(CASE WHEN action = 'save' THEN 1 END) as saves
FROM user_events
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY product_id
ORDER BY total_events DESC
LIMIT 20;

-- Recommendation performance
SELECT 
  rec_type,
  action,
  COUNT(*) as count,
  ROUND(AVG(position)::numeric, 2) as avg_position
FROM recommendation_performance
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY rec_type, action
ORDER BY rec_type, action;
```

---

## 📝 Next Steps (Post Phase 1)

1. **Monitor metrics** for 1-2 days to ensure data capture working
2. **Iterate feed queries** based on performance data (use top brands/cats from cache)
3. **Add more candidate generators** (Phase 2): embeddings, trending, etc.
4. **Implement A/B testing framework** for ranker experiments
5. **Plan Phase 2**: LTR ranker, Thompson sampling bandits

---

## 🔗 Related Files
- PRD: `RECOMMENDATION_SYSTEM_PRD.md`
- Feed endpoint: `app/api/feed/route.ts`
- Tracking endpoint: `app/api/analytics/track/route.ts`
- Preferences update: `app/api/preferences/update/route.ts`
- Hook: `lib/hooks/useAnalytics.ts`
