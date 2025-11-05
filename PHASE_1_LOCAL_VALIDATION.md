# Phase 1 Local Validation Guide

**Goal**: Validate Phase 1 implementation by running through user workflows locally and checking database state.

---

## Quick Start (5 minutes)

```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:3000 in browser

# 3. Open DevTools: F12 → Console tab

# 4. Navigate to Discovery page

# 5. Watch console for [useFeed] logs

# 6. Follow validation steps below
```

---

## Validation Step 1: Feed Generation ✅

**Duration**: 2 minutes  
**What to do**:
1. Navigate to Discovery page
2. Observe console logs
3. Check database

**Console Output to Expect**:
```
[useFeed] Generating feed: surface=discovery, limit=20, session_id=new
[useFeed] Feed generated successfully: {
  impression_id: "abc-123-def",
  session_id: "xyz-456-uvw",
  items_count: 20
}
[Discovery] Mounting, generating initial feed
```

**Network Tab (DevTools)**:
- Request: `GET /api/feed?surface=discovery&limit=20`
- Status: `200 OK`
- Response time: **should be <300ms**
- Response body should have: `impression_id`, `session_id`, `items` array

**Database Validation** (Supabase SQL Editor):

```sql
-- Check impression was created
SELECT 
  impression_id,
  profile_id,
  surface,
  jsonb_array_length(items) as item_count,
  created_at
FROM impressions
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**:
```
impression_id         | profile_id | surface   | item_count | created_at
----------------------|------------|-----------|------------|-----------
abc-123-def...        | xyz-id...  | discovery | 20         | 2025-11-05...
```

---

## Validation Step 2: Click Tracking ✅

**Duration**: 2 minutes  
**What to do**:
1. On Discovery page, click on any product card
2. Observe console logs
3. Check database

**Console Output to Expect**:
```
[ProductCard] Clicked - tracking click event
[Discovery] Product clicked: {
  product_id: "prod_abc123",
  product_name: "Designer Blazer",
  impression_id: "abc-123-def",
  session_id: "xyz-456-uvw",
  rank: 0
}
```

**Network Tab (DevTools)**:
- Request: `POST /api/analytics/track`
- Status: `200 OK`
- Response time: **should be <100ms**
- Request body should have:
  ```json
  {
    "action": "click",
    "product_id": "prod_abc123",
    "impression_id": "abc-123-def",
    "session_id": "xyz-456-uvw"
  }
  ```

**Database Validation**:

```sql
-- Check click event was recorded
SELECT 
  id,
  action,
  product_id,
  impression_id,
  created_at
FROM user_events
WHERE action = 'click'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**:
```
id           | action | product_id    | impression_id | created_at
-------------|--------|---------------|---------------|-----------
event-123... | click  | prod_abc123   | abc-123-def   | 2025-11-05...
```

**Verify Linking**:
```sql
-- Verify event is linked to impression
SELECT 
  u.id,
  u.action,
  u.impression_id,
  i.impression_id as impression_exists,
  CASE WHEN u.impression_id = i.impression_id THEN '✅ LINKED' ELSE '❌ UNLINKED' END as status
FROM user_events u
LEFT JOIN impressions i ON u.impression_id = i.impression_id
WHERE u.action = 'click'
ORDER BY u.created_at DESC
LIMIT 1;
```

**Expected**: Status = `✅ LINKED`

---

## Validation Step 3: Save Tracking ✅

**Duration**: 2 minutes  
**What to do**:
1. Click "Save" button on a product card
2. Observe console and button change
3. Check database

**Console Output to Expect**:
```
[ProductCard] Save clicked: {
  isSaved: true,
  product_id: "prod_xyz789",
  impression_id: "abc-123-def"
}
```

**UI Change Expected**:
- Button changes from "🤍 Save" to "❤️ Saved"
- Button background color changes to red

**Database Validation**:

```sql
-- Check save event was recorded
SELECT 
  action,
  product_id,
  impression_id,
  created_at
FROM user_events
WHERE action = 'save'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**: Row with action='save'

**Verify saved_items**:
```sql
-- Check saved_items table was updated
SELECT 
  id,
  product_id,
  saved_at
FROM saved_items
ORDER BY saved_at DESC
LIMIT 1;
```

**Expected**: Row created within last 1 minute

---

## Validation Step 4: Chat Tracking ✅

**Duration**: 3 minutes  
**What to do**:
1. Click "💬 Chat" button on a product
2. Chat modal opens (or component)
3. Type message: "I love minimalist beige cardigans"
4. Send message
5. Check console and database

**Console Output to Expect**:
```
[ItemChat] Chat opened for product: prod_xyz789
[ItemChat] Sending message: {
  message: "I love minimalist beige cardigans",
  productId: "prod_xyz789",
  sessionId: "xyz-456-uvw"
}
```

**Database Validation**:

```sql
-- Check chat_open event
SELECT 
  action,
  product_id,
  created_at
FROM user_events
WHERE action = 'chat_open'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**: Row with action='chat_open'

```sql
-- Check chat_message event
SELECT 
  action,
  product_id,
  payload,
  created_at
FROM user_events
WHERE action = 'chat_message'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**: Row with action='chat_message' and payload containing chat text

**Verify Keyword Extraction**:
```sql
-- Check if keywords were extracted to preference cache
SELECT 
  chat_keywords,
  updated_at
FROM user_preference_cache
WHERE chat_keywords IS NOT NULL
AND array_length(chat_keywords, 1) > 0
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected**: Keywords like `["minimalist", "beige", "cardigans"]`

---

## Validation Step 5: Session Persistence ✅

**Duration**: 2 minutes  
**What to do**:
1. Refresh the page (Ctrl+R or Cmd+R)
2. Observe console for session restoration
3. Generate new feed
4. Check that events use same session

**Console Output After Refresh to Expect**:
```
[useFeed] Restored session from localStorage: xyz-456-uvw
[useFeed] Saved session to localStorage: xyz-456-uvw
[useFeed] Generating feed: surface=discovery, limit=20, session_id=xyz-456-uvw
```

**Note**: session_id should be **same** as before refresh (not new)

**Database Validation**:

```sql
-- Check all events in session use same session_id
SELECT 
  session_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT action) as action_types,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM user_events
WHERE session_id = 'xyz-456-uvw'
GROUP BY session_id;
```

**Expected**: All events have same session_id across page refresh

---

## Validation Step 6: Event-Impression Join Rate ✅

**Duration**: 5 minutes  
**What to do**:
1. Run 10 clicks (click on 10 different products)
2. Run database query
3. Verify join rate ≥95%

**Database Validation**:

```sql
-- Calculate join rate
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN impression_id IS NOT NULL THEN 1 END) as linked_events,
  ROUND(
    COUNT(CASE WHEN impression_id IS NOT NULL THEN 1 END)::numeric / 
    NULLIF(COUNT(*)::numeric, 0) * 100,
    2
  ) as join_rate_pct
FROM user_events
WHERE created_at > NOW() - INTERVAL '30 minutes';
```

**Expected Result**:
```
total_events | linked_events | join_rate_pct
-------------|---------------|---------------
10+          | 10+           | 95.00+
```

---

## Full Data Flow Validation (Comprehensive)

**Duration**: 10 minutes

Run these commands in sequence in Supabase SQL Editor:

### Step 1: Check Tables Exist
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('product_catalog', 'sessions', 'impressions', 'user_events', 
                   'user_preference_cache', 'recommendation_performance')
ORDER BY table_name;
```
**Expected**: 6 rows

### Step 2: Check Impressions
```sql
SELECT COUNT(*) as impression_count FROM impressions 
WHERE created_at > NOW() - INTERVAL '1 hour';
```
**Expected**: ≥1

### Step 3: Check Events
```sql
SELECT action, COUNT(*) as count
FROM user_events
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY action
ORDER BY action;
```
**Expected Output Example**:
```
action        | count
--------------|-------
chat_message  | 1
chat_open     | 1
click         | 5
save          | 2
```

### Step 4: Check Join Rate
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN impression_id IS NOT NULL THEN 1 ELSE 0 END) as linked,
  ROUND(SUM(CASE WHEN impression_id IS NOT NULL THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as pct
FROM user_events
WHERE created_at > NOW() - INTERVAL '1 hour';
```
**Expected**: pct ≥ 95

### Step 5: Check Product Catalog
```sql
SELECT COUNT(*) as product_count FROM product_catalog 
WHERE last_seen_at > NOW() - INTERVAL '1 hour';
```
**Expected**: ≥20

### Step 6: Check Saved Items
```sql
SELECT COUNT(*) as saved_count FROM saved_items 
WHERE saved_at > NOW() - INTERVAL '1 hour';
```
**Expected**: ≥1

### Step 7: Check Recommendations Performance
```sql
SELECT rec_type, action, COUNT(*) as count
FROM recommendation_performance
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY rec_type, action;
```
**Expected**: impression actions tracked

---

## Performance Benchmarks (Local)

### Feed Generation Time
```bash
# In browser console:
console.time('feed-api')
fetch('/api/feed?surface=discovery&limit=20')
  .then(r => r.json())
  .then(() => console.timeEnd('feed-api'))
```
**Expected**: <300ms (excluding Serper)

### Event Tracking Time
```bash
# In browser console:
console.time('track-api')
fetch('/api/analytics/track', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    action: 'click',
    product_id: 'test_prod_123',
    impression_id: 'imp_123',
    session_id: 'sess_123'
  })
}).then(() => console.timeEnd('track-api'))
```
**Expected**: <100ms

---

## Troubleshooting

### Issue: "No impressions created"
**Check**:
1. Is Serper API key set? `echo $NEXT_PUBLIC_SUPABASE_URL`
2. Network tab: Does `/api/feed` return 200?
3. Server logs: Any errors?
4. Try: Refresh page, check console for errors

### Issue: "Events not linked (impression_id is NULL)"
**Check**:
1. Is `impression_id` passed from component to `/api/analytics/track`?
2. Network tab: POST to `/api/analytics/track` includes `impression_id`?
3. Browser console: `[Discovery] Product clicked` shows impression_id?

### Issue: "Chat keywords not extracted"
**Check**:
1. Is message actually being sent (console shows it)?
2. Check `user_preference_cache.chat_keywords` is populated
3. Try different keywords in message

### Issue: "Session not persisting"
**Check**:
1. Browser localStorage: Open DevTools → Application → Local Storage → `feed_session_id`
2. Console shows "Restored session"?
3. Same session_id in new requests after refresh?

---

## Success Checklist

After all validations, check all boxes:

- [ ] Feed generates with impression_id and 20 products
- [ ] Console shows [useFeed] logs with impression details
- [ ] Click tracking records 'click' events in user_events
- [ ] Save button works and records 'save' events
- [ ] Chat opens and records 'chat_open' events
- [ ] Chat message records 'chat_message' with payload
- [ ] All events linked to impression_id (join rate ≥95%)
- [ ] Session persists across page refresh
- [ ] Keywords extracted to user_preference_cache
- [ ] Feed latency <300ms
- [ ] Event tracking latency <100ms
- [ ] No errors in browser console or server logs

---

## Next Steps

Once all validations pass:

1. ✅ Phase 1 frontend is working
2. → Set up cron job for preference updates (optional)
3. → Monitor metrics for 24 hours
4. → Ready for Phase 2 (embeddings + LTR ranker)

See PHASE_1_CHECKLIST.md for full deployment checklist.
