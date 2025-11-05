# Phase 1 Anonymous User Testing Guide

This guide walks through validating the **completely anonymous** Phase 1 recommendation system without requiring Clerk authentication.

## Architecture Overview

- **Anonymous ID**: Generated in localStorage (`anon_<timestamp>_<random>`), persists across sessions
- **No Auth Required**: All APIs work for unauthenticated users via `anonymous_id` parameter
- **Click-Based Personalization**: Product clicks are tracked and influence the next feed generation
- **Supabase Tracking**: All events written to database for verification

## Prerequisites

- Dev server running: `npm run dev`
- Open browser DevTools (F12) → Console tab
- Supabase connection verified

## Test Flow

### Step 1: Verify Anonymous ID Generation

**Action**: Open http://localhost:3000 in a fresh incognito/private browser window

**Expected Console Output**:
```
[AnonymousUser] Generated new anonymous ID: anon_1730812345678_a1b2c3d4
[useFeed] Generating feed: surface=discovery, limit=20, session_id=new, anonymous_id=anon_1730812345678_a1b2c3d4
[useFeed] Feed generated successfully: {impression_id: "...", session_id: "...", items_count: 20}
```

**Verification**:
- Feed loads with 20 products ✓
- Console shows no 401 errors ✓
- Same anonymous_id used throughout ✓

### Step 2: Track Product Clicks

**Action**: Click on 5-10 products from different categories (e.g., 3 designer items, 3 casual items, 2 luxury)

**Expected Console Output for each click**:
```
[ProductCard] Clicked: <product_id>
[Discovery] Product clicked: {product_id: "...", impression_id: "...", session_id: "..."}
```

**Network Tab** (DevTools → Network):
- `POST /api/analytics/track` returns 200 ✓
- Request payload includes `anonymous_id` ✓
- Response: `{"success": true}` ✓

**Database Verification** (Run in Supabase dashboard):
```sql
-- Should show your clicks
SELECT COUNT(*) as click_count 
FROM user_events 
WHERE anonymous_id = 'anon_<your_id>' 
AND action = 'click'
AND created_at > NOW() - INTERVAL '5 minutes';

-- Should return: click_count = ~5-10
```

### Step 3: Verify Personalization Loop

**Action**: Refresh the page or click "Refresh" button

**Expected Console Output**:
```
[AnonymousUser] Restored anonymous ID: anon_1730812345678_a1b2c3d4
[useFeed] Generating feed: surface=discovery, limit=20, session_id=new, anonymous_id=anon_1730812345678_a1b2c3d4
[useFeed] Feed generated successfully: {impression_id: "...", session_id: "...", items_count: 20}
```

**Key Difference**: The second feed should show **similar products to what you clicked**
- If you clicked designer items → next feed emphasizes designer brands
- If you clicked luxury/premium → next feed shows premium items
- Products should be similar in brand/category to your recent clicks

**Verification**:
```sql
-- Check that feed used your clicked products for personalization
SELECT 
  i.impression_id,
  i.context->>'queries' as search_queries,
  COUNT(*) as items_shown
FROM impressions i
WHERE i.context->>'anonymous_id' = 'anon_<your_id>'
ORDER BY i.created_at DESC
LIMIT 5;

-- Queries should match brands/categories from your clicks
```

### Step 4: Save/Unsave Tracking

**Action**: Click heart icon to save 2-3 products

**Expected Console Output**:
```
[ProductCard] Save clicked: <product_id>
[ProductCard] Saving product: <product_id>
```

**Network Tab**:
- `POST /api/analytics/track` with action: "save" ✓

**Database Verification**:
```sql
SELECT COUNT(*) as save_count
FROM user_events
WHERE anonymous_id = 'anon_<your_id>'
AND action = 'save'
AND created_at > NOW() - INTERVAL '5 minutes';

-- Should return: save_count = ~2-3
```

### Step 5: Session Persistence

**Action**: Close and reopen browser (same incognito window), navigate back to http://localhost:3000

**Expected Behavior**:
- Same `anonymous_id` used (localStorage persisted) ✓
- Same `session_id` NOT reused (new session per visit, but same user) ✓
- Previous clicks influence new feed ✓

**Console Output**:
```
[AnonymousUser] Restored anonymous ID: anon_1730812345678_a1b2c3d4
[useFeed] Generating feed with personalized queries...
```

### Step 6: Full Event Join Rate

**Action**: After completing steps 1-5, run this query:

```sql
SELECT 
  COUNT(CASE WHEN impression_id IS NOT NULL THEN 1 END)::numeric / COUNT(*) * 100 as join_rate_pct,
  COUNT(*) as total_events,
  COUNT(CASE WHEN impression_id IS NOT NULL THEN 1 END) as events_with_impression
FROM user_events
WHERE anonymous_id = 'anon_<your_id>'
AND created_at > NOW() - INTERVAL '30 minutes';
```

**Expected Result**: `join_rate_pct >= 90%` (some events may not have impression_id, which is OK)

### Step 7: Scroll & Load More Products

**Action**: Scroll to bottom of page to trigger "Load More"

**Expected Behavior**:
- More products load ✓
- Still personalized to your previous clicks ✓
- New `impression_id` created for each "load more" ✓

**Database Verification**:
```sql
-- Should see multiple impressions for same anonymous_id
SELECT 
  impression_id,
  created_at,
  items->0->>'rec_type' as first_rec_type,
  jsonb_array_length(items) as total_items
FROM impressions
WHERE context->>'anonymous_id' = 'anon_<your_id>'
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Issue: "401 Unauthorized" on /api/feed

**Solution**: Verify `anonymous_id` is being passed:
```
// In browser console, check if it's in localStorage:
localStorage.getItem('flair_anonymous_id')

// Should return something like: anon_1730812345678_a1b2c3d4
```

### Issue: Clicks not appearing in database

**Solution**: Check that analytics endpoint receives `anonymous_id`:
```
// In DevTools Network tab, find POST /api/analytics/track
// Click on it → Payload tab → verify:
{
  "action": "click",
  "product_id": "prod_...",
  "anonymous_id": "anon_..."  // ← This MUST be present
}
```

### Issue: Feed not personalizing based on clicks

**Solution**: Verify clicks were saved:
```sql
SELECT * FROM user_events 
WHERE anonymous_id = 'anon_<your_id>' 
AND action = 'click'
LIMIT 5;

-- If empty, clicks aren't being tracked. Check network tab for POST errors.
```

## Success Criteria Checklist

- ✅ Anonymous ID generated and persisted in localStorage
- ✅ Feed endpoint works without Clerk auth (returns 200, not 401)
- ✅ Product clicks tracked to Supabase with anonymous_id
- ✅ Clicked products' brands/categories influence next feed
- ✅ Similar products appear after refresh
- ✅ Save/unsave tracked successfully
- ✅ Session persists across page refreshes
- ✅ Event-impression join rate ≥ 90%
- ✅ Console logs show [ProductCard], [Discovery], [useFeed] prefixes
- ✅ No errors in browser console (warnings OK)

## Example Test Session

```
1. Open http://localhost:3000 (incognito)
   → See 20 designer products loaded
   → [AnonymousUser] Generated new ID
   → [useFeed] Feed generated successfully

2. Click on 5 designer/luxury items
   → [ProductCard] Clicked: prod_abc123
   → Network shows POST /api/analytics/track 200

3. Scroll down, load 15 more products
   → Still designer/luxury focused
   → [useFeed] Feed generated: items_count: 15

4. Refresh page
   → [AnonymousUser] Restored ID (same one)
   → Feed shows similar designer items again
   → [useFeed] Feed generated with personalized queries

5. Query database:
   → 5 click events found
   → 2 impressions created
   → join_rate = 100%

✅ System working as expected!
```

## Next Steps

Once this test passes, proceed with:
1. Testing authenticated users (with Clerk)
2. Testing preference cache updates
3. Testing preference-based recommendations
4. E2E testing with multiple sessions
