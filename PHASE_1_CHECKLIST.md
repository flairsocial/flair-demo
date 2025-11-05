# Phase 1 Integration Checklist

**Status**: Ready for integration
**Date**: 2025-11-05
**Deployed**: ✅ All 6 migrations, 3 APIs, 1 hook

---

## ✅ Backend Infrastructure (COMPLETE)

- ✅ Database schema with 6 core tables
- ✅ `/api/feed` – personalized feed generation
- ✅ `/api/analytics/track` – event capture
- ✅ `/api/preferences/update` – preference aggregation
- ✅ `useAnalytics` hook – client tracking library

---

## 🔧 IMMEDIATE TASKS (Next 24–48 hours)

### 1. Create Feed Hook (30 min)
- [ ] Create `lib/hooks/useFeed.ts` (template in PHASE_1_IMPLEMENTATION.md)
- [ ] Returns: `impression_id`, `session_id`, `items`, `generateFeed()`
- [ ] Manages feed state across page reloads

### 2. Update Discovery/Feed Component (1–2 hours)
- [ ] Import `useFeed` and `useAnalytics` hooks
- [ ] Initialize on page load: `generateFeed('discovery', 20)`
- [ ] Pass `impression_id` and `session_id` to ProductCards
- [ ] Add click handler: `trackClick(product_id, impression_id, session_id)`
- [ ] Add save handler: `trackSave(product_id, product_data, impression_id)`
- [ ] Test: Generate feed, verify impression created in DB

### 3. Update ProductCard Component (30 min)
- [ ] Import `useAnalytics` hook
- [ ] Add click tracking:
  ```typescript
  const { trackClick } = useAnalytics()
  onClick={() => {
    trackClick(product.product_id, impression_id, session_id)
    handleProductClick() // existing navigation
  }}
  ```
- [ ] Add save tracking (already exists? enhance with tracking call)
- [ ] Test: Click/save, verify events in user_events table

### 4. Update Chat Component (1 hour)
- [ ] Import `useAnalytics`
- [ ] On chat open: `trackChatOpen(product_id, session_id)`
- [ ] On message send: `trackChatMessage(product_id, chatText, session_id)`
- [ ] Test: Send chat message, verify keywords extracted to preference cache

### 5. Setup Preference Update (1 hour)
Option A (Quick): Manual trigger on demand
- [ ] Add button to settings: "Update Preferences"
- [ ] Call `POST /api/preferences/update`
- [ ] Show results (top brands, categories, price range)

Option B (Recommended): Hourly cron job
- [ ] Create `app/api/cron/update-preferences/route.ts` (see PHASE_1_IMPLEMENTATION.md)
- [ ] Setup cron trigger (e.g., EasyCron, Vercel cron, GitHub Actions)
- [ ] Validate cron secret header

### 6. Verify Data Flow (1–2 hours)
- [ ] Create test user account
- [ ] Generate feed → check impressions table has entry
- [ ] Click product → check user_events has event + impression_id
- [ ] Save product → check saved_items, user_events
- [ ] Send chat message → check user_events, keyword extraction
- [ ] Run preference update → check user_preference_cache

---

## 📋 Testing Queries

Run these after each step to verify data:

```sql
-- Check impressions created
SELECT COUNT(*) FROM impressions WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check events captured (per action type)
SELECT action, COUNT(*) FROM user_events 
WHERE created_at > NOW() - INTERVAL '1 hour' 
GROUP BY action;

-- Check event-impression join rate
SELECT 
  COUNT(CASE WHEN impression_id IS NOT NULL THEN 1 END)::float / COUNT(*) * 100 
FROM user_events WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check product catalog
SELECT COUNT(*) FROM product_catalog WHERE last_seen_at > NOW() - INTERVAL '1 day';

-- Check preferences updated
SELECT profile_id, favorite_brands, favorite_categories 
FROM user_preference_cache 
WHERE updated_at > NOW() - INTERVAL '1 hour';

-- Check recommendation performance
SELECT rec_type, action, COUNT(*) 
FROM recommendation_performance 
WHERE created_at > NOW() - INTERVAL '1 hour' 
GROUP BY rec_type, action;
```

---

## 🎯 Success Criteria (Before Going Live)

- [ ] **Data capture works**: ≥95% of events linked to impressions
- [ ] **Feed generates**: <300ms p95 latency (excluding Serper)
- [ ] **Tracking persists**: All 4 signals (click, save, chat, dwell) captured
- [ ] **Preferences update**: Manual or cron trigger works, cache refreshes
- [ ] **No errors**: Zero 500 errors in API logs
- [ ] **Cold-start works**: New users without preferences get fallback queries

---

## 📊 What to Monitor (Once Live)

### Daily Checks
```sql
-- Impressions per user
SELECT profile_id, COUNT(*) as impr_count 
FROM impressions WHERE created_at > NOW() - INTERVAL '1 day' 
GROUP BY profile_id ORDER BY impr_count DESC LIMIT 10;

-- Event distribution
SELECT action, COUNT(*) FROM user_events 
WHERE created_at > NOW() - INTERVAL '1 day' GROUP BY action;

-- CTR proxy (clicks / impressions)
SELECT 
  (SELECT COUNT(*) FROM user_events WHERE action = 'click' AND created_at > NOW() - INTERVAL '1 day')::float /
  (SELECT COUNT(*) * 20 FROM impressions WHERE created_at > NOW() - INTERVAL '1 day')::float * 100
AS ctr_pct;
```

### Weekly Checks
- Trends: Is CTR increasing? Save rate? Chat adoption?
- Preferences: Do users show stable brand/category preferences?
- Catalog growth: How many unique products are captured?

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Impressions not created | Check `/api/feed` returns `impression_id` in response |
| Events not linked to impressions | Verify `impression_id` passed to `/api/analytics/track` |
| Product_id hash collisions | Check `generateProductId()` uniqueness |
| Preference cache not updating | Manually call `/api/preferences/update` endpoint |
| Serper API errors | Check API key, rate limits, query format |

---

## 📁 Files to Create/Modify

| File | Action | Why |
|------|--------|-----|
| `lib/hooks/useFeed.ts` | **Create** | Manage feed state + session |
| `app/page.tsx` (or feed component) | **Modify** | Add hooks, wire up tracking |
| `components/ProductCard.tsx` | **Modify** | Add click/save tracking |
| `components/ItemChat.tsx` | **Modify** | Add chat tracking |
| `app/api/cron/update-preferences/route.ts` | **Create** | Hourly preference refresh (optional) |

---

## 🚀 Launch Readiness

### Before pushing to production:
- [ ] Test data capture on staging
- [ ] Verify latency <300ms
- [ ] Check error logs are clean
- [ ] Validate that saved_items sync with tracked saves
- [ ] Ensure no sensitive data in payloads
- [ ] Document any environment variables

### Deployment order:
1. Deploy updated components (with tracking calls)
2. Verify events flowing in
3. Deploy cron job for preference updates
4. Monitor metrics for 24 hours
5. Adjust feed queries based on performance data

---

## 📞 Questions Before Launch

1. **Product ID stability**: Should we version hash if product updates (title/brand/price change)?
2. **Preference staleness**: Max age before cache is considered stale?
3. **Feedback loop timing**: How often should preference cache refresh? (hourly OK?)
4. **Privacy**: Do we need user consent for event tracking? (GA-style disclosure?)
5. **Cold-start**: For new users with no preferences, use global trending or profile defaults?

---

## 📝 Phase 1 → Phase 2 Transition

Once live for 2 weeks:
1. **Collect data**: Should have ~1000+ events per active user
2. **Analyze**: What signals are strongest (click, save, chat)?
3. **Review metrics**: CTR, save rate, retention vs baseline
4. **Decide**: Proceed with Phase 2 (embeddings + LTR)?

**Phase 2 kickoff dependencies:**
- ✅ Event data flowing correctly
- ✅ Impressions captured with positions
- ✅ Preference cache populated
- 🔜 Ready for ML model training (need ~2 weeks of data)

---

## 🎉 Status

**Phase 1 Ready**: YES ✅
**Next Step**: Integrate hooks and components
**ETA to live**: 3–5 days (depending on testing thoroughness)
