# Phase 1 Summary: Recommendation System Foundation

## 🎯 What Was Built

A production-ready foundation for click/save/chat-driven personalization with:
- **Impressions logging**: tracks item shown at each rank (position bias aware)
- **Event capture**: clicks, saves, chats, dwell times linked to impressions
- **Preference aggregation**: extracts brands, categories, price ranges with recency decay
- **Catalog normalization**: canonicalized product IDs to prevent Serper deduplication issues

---

## 📦 Deliverables

### Database (6 migrations applied)
```
✅ product_catalog       – canonical product store with stable IDs
✅ sessions              – user session tracking for attribution
✅ impressions           – feed impressions with rank/rec_type metadata
✅ user_events           – event log (click/save/chat/dwell)
✅ user_preference_cache – cached user preferences (brands/categories/price)
✅ recommendation_performance – ranker training data
```

### APIs (3 endpoints)
```
✅ GET  /api/feed                 – generates personalized feed + impression
✅ POST /api/analytics/track      – logs user events + preference updates
✅ POST /api/preferences/update   – aggregates interactions → preference cache
```

### Client Library
```
✅ useAnalytics hook              – trackClick, trackSave, trackChatMessage, etc.
```

### Documentation
```
✅ RECOMMENDATION_SYSTEM_PRD.md   – full product requirements
✅ PHASE_1_IMPLEMENTATION.md      – integration guide + acceptance criteria
✅ PHASE_1_SUMMARY.md             – this file
```

---

## 🔑 Key Features

### 1. Impression Logging for Position Bias
Every feed call creates an impression with:
```json
{
  "impression_id": "uuid",
  "session_id": "uuid",
  "surface": "discovery",
  "items": [
    { "product_id": "prod_xyz", "rank": 0, "rec_type": "content", "score": 1.0 },
    { "product_id": "prod_abc", "rank": 1, "rec_type": "content", "score": 0.95 },
    ...
  ]
}
```
→ **Enables**: Position-bias correction, multi-armed bandit evaluation, counterfactual metrics.

### 2. Event-Impression Linking
All events (click, save, chat) are linked to impression_id:
```sql
user_events(
  id, profile_id, session_id, impression_id, product_id, action, dwell_time, payload
)
```
→ **Enables**: Learning which positions convert, measuring CTR@k, validating ranking.

### 3. Product Catalog Normalization
Canonicalized product IDs from Serper:
```
product_id = hash(url | brand | title)
```
→ **Enables**: Cross-session CF, deduplication, stable item-to-item similarity.

### 4. Preference Cache with Recency Decay
```
w(event) = exp(-days_since / 7) × action_weight
```
→ **Enables**: Recent activities influence feed more; saves weight 3x, clicks 1x.

### 5. Chat-to-Preference Extraction
Chat messages → keyword extraction → updates cache:
```
chat: "I love minimalist beige Loro Piana cardigans"
→ keywords: ["minimalist", "beige", "loro", "piana", "cardigan"]
→ preference cache: chat_keywords += these
```
→ **Enables**: LLM-driven preference refinement, context-aware recommendations.

---

## 🚀 How It Works (End-to-End)

### User Session Start
1. Frontend calls `GET /api/feed?surface=discovery`
2. Backend:
   - Looks up user preferences in `user_preference_cache`
   - Builds queries from top brands/categories (or fallback: "designer fashion")
   - Fetches candidates from Serper (multiple parallel queries)
   - Deduplicates by product_id
   - Creates **impression** with items + ranks
   - Upserts products into `product_catalog`
   - Returns impression_id + items to frontend

### User Interactions
- **Click**: `trackClick(product_id, impression_id, session_id)` → `/api/analytics/track`
- **Save**: `trackSave(product_id, product_data)` → `/api/analytics/track` → updates `saved_items`
- **Chat**: `trackChatMessage(product_id, chat_text)` → `/api/analytics/track` → extracts keywords

### Preference Update (hourly or on-demand)
1. Call `POST /api/preferences/update`
2. Backend:
   - Queries last 30 days of user_events (click/save/like)
   - Joins with product_catalog to get brand/category/price
   - Aggregates with recency decay: `w = exp(-days_since / 7)`
   - Extracts top 5 brands, top 5 categories, price range (P25–P75)
   - **Updates** `user_preference_cache`

### Next Feed Generation
- Uses updated preferences → more personalized queries
- Cycle repeats: interactions → updated cache → better feed

---

## ✨ What This Enables

### Immediate (Phase 1)
✅ **Capture all user behavior** with context (impression, position, session)
✅ **Adapt feed to user interests** (brands, categories, price)
✅ **Extract intent from chat** (keywords, budget, style)
✅ **Safe for A/B testing** (impression_id allows attribution)

### Short-term (Phase 2)
🔜 **Embeddings-based search** (semantic similarity)
🔜 **Learned-to-rank ranker** (logistic LTR with position-bias correction)
🔜 **Thompson sampling bandits** (multi-armed exploration)

### Long-term (Phase 3)
🔜 **Collaborative filtering** (implicit feedback models)
🔜 **Per-user mixture weights** (optimize which generator works best)
🔜 **Counterfactual evaluation** (offline policy learning)

---

## 📋 Integration Checklist (Before Going Live)

- [ ] **Create `useFeed` hook** to manage feed state + session
- [ ] **Update Discovery page** to use `/api/feed` + `useAnalytics`
- [ ] **Add tracking to ProductCard**:
  - `onClick()` → `trackClick()`
  - `onSave()` → `trackSave()`
- [ ] **Add tracking to chat component**:
  - `onSendMessage()` → `trackChatMessage()`
  - `onOpen()` → `trackChatOpen()`
- [ ] **Setup cron job** to call `POST /api/preferences/update` hourly (or manually)
- [ ] **Test data flow**:
  - Generate feed → verify impression created
  - Click product → verify event in user_events + linked to impression
  - Save product → verify in saved_items
  - Chat message → verify keywords extracted
  - Check preferences updated → verify cache has brands/categories

---

## 📊 Success Metrics (Phase 1 Exit Criteria)

| Metric | Target | How to Measure |
|--------|--------|-----------------|
| **Event-Impression join rate** | ≥97% | `SELECT COUNT(CASE WHEN impression_id IS NOT NULL THEN 1 END) / COUNT(*) FROM user_events` |
| **CTR@20 uplift** | ≥2x baseline | Compare old random feed CTR vs new personalized feed |
| **Product catalog coverage** | ≥95% | `SELECT COUNT(DISTINCT product_id) FROM product_catalog WHERE last_seen_at > NOW() - INTERVAL '1 day'` |
| **Preference cache freshness** | updated within 1h | Max age = `NOW() - MAX(updated_at) FROM user_preference_cache` |
| **Feed latency p95** | <300ms | Log endpoint timing (excluding Serper) |

---

## 🔧 Debugging & Queries

### Check data capture
```sql
-- Events captured today
SELECT action, COUNT(*) FROM user_events 
WHERE created_at > NOW() - INTERVAL '1 day' 
GROUP BY action;

-- Event-impression join rate
SELECT COUNT(CASE WHEN impression_id IS NOT NULL THEN 1 END)::float / COUNT(*) * 100 as join_pct
FROM user_events WHERE created_at > NOW() - INTERVAL '1 day';

-- Impressions per user
SELECT profile_id, COUNT(*) as imp_count FROM impressions 
WHERE created_at > NOW() - INTERVAL '1 day' GROUP BY profile_id;
```

### Check personalization
```sql
-- Preferences extracted
SELECT profile_id, favorite_brands, favorite_categories, price_min, price_max 
FROM user_preference_cache WHERE favorite_brands IS NOT NULL LIMIT 10;

-- Top product brands by interaction
SELECT p.brand, COUNT(*) as count FROM user_events u 
JOIN product_catalog p ON u.product_id = p.product_id 
WHERE u.created_at > NOW() - INTERVAL '1 day' GROUP BY p.brand ORDER BY count DESC;
```

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `RECOMMENDATION_SYSTEM_PRD.md` | Full PRD with algorithms, metrics, phased plan |
| `PHASE_1_IMPLEMENTATION.md` | Integration steps, acceptance criteria, testing |
| `PHASE_1_SUMMARY.md` | This file |
| `app/api/feed/route.ts` | Feed generation endpoint |
| `app/api/analytics/track/route.ts` | Event tracking endpoint |
| `app/api/preferences/update/route.ts` | Preference aggregation endpoint |
| `lib/hooks/useAnalytics.ts` | Client hook for tracking |

---

## 🎯 Next: Phase 2 (Weeks 3–5)

Once Phase 1 is live and data is flowing:

1. **Add embeddings** (Phase 2)
   - Generate product embeddings from text (title + brand + category)
   - Cosine-search for similar products in `/api/products/:id/similar`

2. **Build LTR ranker**
   - Train logistic LTR on logged impressions
   - Features: user (brands, price), item (category, popularity), cross (sim to liked items)
   - Deploy as ranker in `/api/feed` to re-rank candidates

3. **Implement Thompson sampling**
   - Track performance per candidate generator (content, trending, embedding)
   - Beta posteriors on each arm (clicks + saves)
   - Allocate traffic based on posterior

4. **A/B testing framework**
   - Experiment ID on impressions
   - Compare feed variants (heuristic vs LTR vs bandits)

---

## 💬 Questions for Review

1. **Serper dedupe**: Is product ID hash adequate, or need retailer-specific rules?
2. **Preference freshness**: Is hourly update too slow? Or can we do on-demand after certain event count?
3. **Chat intent extraction**: Should we use LLM for NLP (budget, occasion, style), or keyword heuristics sufficient for Phase 1?
4. **Cold-start handling**: Should new users get global trending or profile defaults (gender/style)?

---

## ✅ Status

**Phase 1: COMPLETE** ✅
- 6 migrations applied
- 3 APIs deployed
- 1 client hook ready
- Documentation complete

**Ready for integration**: Yes
**Ready for data collection**: Yes
**Ready for Phase 2**: Yes (awaiting ~2 weeks of data)
