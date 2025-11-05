# Phase 1 Testing Guide

## Overview
This guide tests all Phase 1 components through direct SQL queries and curl API calls.

---

## Part 1: Database Schema Verification

### 1.1 Verify All 6 Tables Exist

Run these in Supabase SQL Editor:

```sql
-- Count all tables in public schema
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN (
  'product_catalog', 'sessions', 'impressions', 'user_events', 
  'user_preference_cache', 'recommendation_performance'
);
```

**Expected result**: 6 rows (one for each table)

### 1.2 Verify Table Schemas

```sql
-- Check product_catalog columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'product_catalog' ORDER BY ordinal_position;
```

**Expected columns**:
- product_id (text) - PRIMARY KEY
- source (text)
- source_key (text)
- title (text)
- brand (text)
- category (text)
- price (numeric)
- currency (text)
- image_url (text)
- url (text)
- attributes (jsonb)
- first_seen_at (timestamp with time zone)
- last_seen_at (timestamp with time zone)

```sql
-- Check user_events columns and enum type
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'user_events' ORDER BY ordinal_position;
```

**Expected columns**:
- id (uuid)
- profile_id (uuid) - FOREIGN KEY to profiles
- session_id (uuid) - FOREIGN KEY to sessions
- impression_id (uuid) - FOREIGN KEY to impressions
- product_id (text) - FOREIGN KEY to product_catalog
- action (event_action enum)
- dwell_time_seconds (integer)
- payload (jsonb)
- created_at (timestamp with time zone)

```sql
-- Verify event_action enum exists and has correct values
SELECT enum_range(NULL::event_action);
```

**Expected values**: view, click, save, unsave, like, share, chat_open, chat_message

---

## Part 2: Manual Data Insertion Tests

### 2.1 Insert Test Product

```sql
INSERT INTO product_catalog (
  product_id, source, source_key, title, brand, category, 
  price, currency, image_url, url, attributes
) VALUES (
  'test_prod_' || floor(extract(epoch from now()))::text,
  'serper',
  'https://example.com/product-' || floor(extract(epoch from now()))::text,
  'Test Designer Blazer',
  'TestBrand',
  'Blazers',
  299.99,
  'USD',
  'https://example.com/image.jpg',
  'https://example.com/product-test',
  '{"description": "Test product"}'::jsonb
) RETURNING product_id, brand, category;
```

**Expected result**: 1 row with product_id, brand='TestBrand', category='Blazers'

### 2.2 Create Test Session

```sql
-- First, ensure a test profile exists (or use existing profile_id)
INSERT INTO sessions (profile_id, started_at, last_activity_at, device)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  now(),
  now(),
  'test-browser'
) RETURNING session_id, profile_id, started_at;
```

**Expected result**: 1 row with valid UUID session_id

### 2.3 Create Test Impression

```sql
-- Create impression with items array
INSERT INTO impressions (
  profile_id, session_id, surface, items, context
) VALUES (
  (SELECT id FROM profiles LIMIT 1),
  (SELECT session_id FROM sessions ORDER BY started_at DESC LIMIT 1),
  'discovery',
  jsonb_build_array(
    jsonb_build_object('product_id', 'test_1', 'rank', 0, 'rec_type', 'content', 'score', 1.0),
    jsonb_build_object('product_id', 'test_2', 'rank', 1, 'rec_type', 'content', 'score', 0.95)
  ),
  jsonb_build_object('queries', jsonb_build_array('test query 1', 'test query 2'))
) RETURNING impression_id, surface, items, created_at;
```

**Expected result**: 1 row with valid UUID impression_id, items array of 2 objects

### 2.4 Track User Events

```sql
-- Insert click event
INSERT INTO user_events (
  profile_id, session_id, impression_id, product_id, action, created_at
) VALUES (
  (SELECT id FROM profiles LIMIT 1),
  (SELECT session_id FROM sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT impression_id FROM impressions ORDER BY created_at DESC LIMIT 1),
  'test_click_product',
  'click',
  now()
) RETURNING id, action, created_at;
```

**Expected result**: 1 row with action='click'

```sql
-- Insert save event
INSERT INTO user_events (
  profile_id, session_id, impression_id, product_id, action, payload, created_at
) VALUES (
  (SELECT id FROM profiles LIMIT 1),
  (SELECT session_id FROM sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT impression_id FROM impressions ORDER BY created_at DESC LIMIT 1),
  'test_save_product',
  'save',
  jsonb_build_object('product_data', jsonb_build_object('title', 'Test', 'brand', 'Test')),
  now()
) RETURNING id, action, payload;
```

**Expected result**: 1 row with action='save', payload with product_data

```sql
-- Insert chat event with keyword extraction
INSERT INTO user_events (
  profile_id, session_id, impression_id, product_id, action, payload, created_at
) VALUES (
  (SELECT id FROM profiles LIMIT 1),
  (SELECT session_id FROM sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT impression_id FROM impressions ORDER BY created_at DESC LIMIT 1),
  'test_chat_product',
  'chat_message',
  jsonb_build_object('chat_text', 'I love minimalist beige cardigans and elegant blazers'),
  now()
) RETURNING id, action, payload;
```

**Expected result**: 1 row with action='chat_message'

---

## Part 3: Event-Impression Linking Tests

### 3.1 Verify Event-Impression Join Rate

```sql
-- Calculate join rate for events in last 24 hours
SELECT 
  COUNT(CASE WHEN impression_id IS NOT NULL THEN 1 END)::float / 
  NULLIF(COUNT(*), 0)::float * 100 as join_rate_pct,
  COUNT(*) as total_events,
  COUNT(CASE WHEN impression_id IS NOT NULL THEN 1 END) as linked_events
FROM user_events
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Expected result**: 
- join_rate_pct ≥ 95
- total_events > 0
- linked_events ≥ total_events * 0.95

### 3.2 Verify Impression Items Have Correct Structure

```sql
-- Check impressions have valid items array with product_id, rank, rec_type
SELECT 
  impression_id,
  surface,
  jsonb_array_length(items) as num_items,
  items->>0 as first_item,
  created_at
FROM impressions
WHERE created_at > NOW() - INTERVAL '24 hours'
LIMIT 5;
```

**Expected result**: 
- Each row has num_items > 0
- first_item is valid JSON with product_id, rank, rec_type fields

---

## Part 4: Preference Cache Tests

### 4.1 Update Preference Cache

```sql
-- Insert/update preference cache
INSERT INTO user_preference_cache (
  profile_id, favorite_brands, favorite_categories, price_min, price_max, style_keywords
)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  ARRAY['TestBrand', 'LuxeBrand', 'DesignerBrand'],
  ARRAY['Blazers', 'Dresses', 'Cardigans'],
  100.00,
  500.00,
  ARRAY['minimalist', 'elegant', 'luxe']
)
ON CONFLICT (profile_id) DO UPDATE SET
  favorite_brands = EXCLUDED.favorite_brands,
  favorite_categories = EXCLUDED.favorite_categories,
  price_min = EXCLUDED.price_min,
  price_max = EXCLUDED.price_max,
  style_keywords = EXCLUDED.style_keywords,
  updated_at = NOW()
RETURNING profile_id, favorite_brands, favorite_categories, updated_at;
```

**Expected result**: 1 row with arrays populated and recent updated_at

### 4.2 Verify Preference Cache Structure

```sql
-- Check preference cache for all users with preferences
SELECT 
  profile_id,
  array_length(favorite_brands, 1) as num_brands,
  array_length(favorite_categories, 1) as num_categories,
  price_min,
  price_max,
  array_length(style_keywords, 1) as num_keywords,
  updated_at
FROM user_preference_cache
WHERE updated_at > NOW() - INTERVAL '24 hours'
LIMIT 10;
```

**Expected result**: Rows with populated arrays and price ranges

---

## Part 5: Recommendation Performance Tracking

### 5.1 Insert Performance Records

```sql
-- Insert multiple recommendation performance records
INSERT INTO recommendation_performance (
  profile_id, product_id, rec_type, action, position, created_at
) VALUES 
  ((SELECT id FROM profiles LIMIT 1), 'prod_1', 'content', 'clicked', 0, now()),
  ((SELECT id FROM profiles LIMIT 1), 'prod_2', 'trending', 'saved', 1, now()),
  ((SELECT id FROM profiles LIMIT 1), 'prod_3', 'content', 'ignored', 2, now())
RETURNING id, rec_type, action, position;
```

**Expected result**: 3 rows with rec_type, action, position filled in

### 5.2 Check Recommendation Performance Distribution

```sql
-- Group performance by rec_type and action
SELECT 
  rec_type,
  action,
  COUNT(*) as count,
  ROUND(AVG(position)::numeric, 2) as avg_position
FROM recommendation_performance
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY rec_type, action
ORDER BY rec_type, action;
```

**Expected result**: Rows showing distribution of recommendations and actions

---

## Part 6: Data Integrity Tests

### 6.1 Check for Orphaned Events

```sql
-- Find events without corresponding profiles
SELECT COUNT(*) as orphaned_count
FROM user_events
WHERE profile_id NOT IN (SELECT id FROM profiles)
AND created_at > NOW() - INTERVAL '24 hours';
```

**Expected result**: 0

### 6.2 Check for Orphaned Impressions

```sql
-- Find impressions without corresponding profiles
SELECT COUNT(*) as orphaned_count
FROM impressions
WHERE profile_id NOT IN (SELECT id FROM profiles)
AND created_at > NOW() - INTERVAL '24 hours';
```

**Expected result**: 0

### 6.3 Check for Orphaned Events Without Sessions

```sql
-- Find events with sessions that don't exist
SELECT COUNT(*) as orphaned_sessions
FROM user_events
WHERE session_id IS NOT NULL
AND session_id NOT IN (SELECT session_id FROM sessions)
AND created_at > NOW() - INTERVAL '24 hours';
```

**Expected result**: 0

### 6.4 Verify Foreign Key Integrity

```sql
-- Check all product_id references are valid
SELECT COUNT(*) as invalid_products
FROM user_events
WHERE product_id IS NOT NULL
AND product_id NOT IN (SELECT product_id FROM product_catalog);
```

**Expected result**: 0 (or acceptable if products are still being collected)

---

## Part 7: API Endpoint Simulation

### 7.1 Simulate Feed Generation

```sql
-- Simulate what /api/feed does:
-- 1. Get user preference cache
SELECT * FROM user_preference_cache 
WHERE profile_id = (SELECT id FROM profiles LIMIT 1);

-- 2. List candidate products (would come from Serper)
SELECT product_id, brand, category, price 
FROM product_catalog 
LIMIT 20;

-- 3. Create impression record (done in code)
-- 4. Return impression_id + products
```

**Expected**: Preference cache with brands/categories, product_catalog results

### 7.2 Simulate Analytics Track

```sql
-- Simulate what /api/analytics/track does:
-- 1. Insert event
INSERT INTO user_events (
  profile_id, session_id, impression_id, product_id, action, payload
) VALUES (
  (SELECT id FROM profiles LIMIT 1),
  (SELECT session_id FROM sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT impression_id FROM impressions ORDER BY created_at DESC LIMIT 1),
  'test_product_123',
  'click',
  NULL
) RETURNING id;

-- 2. Update session last_activity_at (simulated)
-- 3. Update saved_items if action is 'save' (simulated)
-- 4. Update preference_cache if action is 'chat_message' (simulated)
```

### 7.3 Simulate Preference Update

```sql
-- Simulate what /api/preferences/update does:
-- 1. Get recent interactions (last 30 days)
SELECT 
  action,
  COUNT(*) as count,
  extract(epoch from (NOW() - created_at)) / (24*3600) as days_ago
FROM user_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY action, extract(epoch from (NOW() - created_at)) / (24*3600);

-- 2. Calculate preference scores (with recency decay)
SELECT 
  action,
  COUNT(*) as events,
  COUNT(*) * CASE 
    WHEN action = 'save' THEN 3
    WHEN action = 'like' THEN 2
    ELSE 1
  END as weighted_score
FROM user_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY action;

-- 3. Extract top brands/categories
SELECT 
  brand,
  COUNT(*) as popularity
FROM product_catalog pc
WHERE pc.product_id IN (
  SELECT product_id FROM user_events
  WHERE created_at > NOW() - INTERVAL '30 days'
  AND action IN ('save', 'like', 'click')
)
GROUP BY brand
ORDER BY popularity DESC
LIMIT 5;
```

---

## Part 8: Performance Tests

### 8.1 Test Feed Query Performance

```sql
-- Measure feed generation query performance
EXPLAIN ANALYZE
SELECT 
  i.impression_id,
  i.surface,
  i.items,
  COUNT(e.id) as event_count
FROM impressions i
LEFT JOIN user_events e ON i.impression_id = e.impression_id
WHERE i.profile_id = (SELECT id FROM profiles LIMIT 1)
AND i.created_at > NOW() - INTERVAL '7 days'
GROUP BY i.impression_id
ORDER BY i.created_at DESC
LIMIT 20;
```

**Expected**: Planning time <100ms, total time <300ms

### 8.2 Test Event Insertion Performance

```sql
-- Measure event insertion speed
EXPLAIN ANALYZE
INSERT INTO user_events (
  profile_id, session_id, impression_id, product_id, action, created_at
)
SELECT 
  (SELECT id FROM profiles LIMIT 1),
  (SELECT session_id FROM sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT impression_id FROM impressions ORDER BY created_at DESC LIMIT 1),
  'test_' || floor(random() * 1000),
  'click',
  now()
WHERE false; -- Don't actually insert
```

---

## Part 9: Failure Case Tests

### 9.1 Test Invalid Event Action (Should Fail)

```sql
-- This should fail due to enum constraint
INSERT INTO user_events (
  profile_id, session_id, impression_id, product_id, action, created_at
) VALUES (
  (SELECT id FROM profiles LIMIT 1),
  (SELECT session_id FROM sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT impression_id FROM impressions ORDER BY created_at DESC LIMIT 1),
  'test_product',
  'invalid_action',  -- This violates enum
  now()
);
```

**Expected**: Error: "invalid_action" is not part of event_action enum

### 9.2 Test Missing Required Fields (Should Fail)

```sql
-- This should fail due to NOT NULL constraints
INSERT INTO user_events (
  profile_id
) VALUES (
  (SELECT id FROM profiles LIMIT 1)
);
```

**Expected**: Error on NOT NULL violations

### 9.3 Test Invalid Foreign Key (Should Fail)

```sql
-- This should fail due to FK constraint
INSERT INTO user_events (
  profile_id, session_id, impression_id, product_id, action, created_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',  -- Non-existent profile
  (SELECT session_id FROM sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT impression_id FROM impressions ORDER BY created_at DESC LIMIT 1),
  'test_product',
  'click',
  now()
);
```

**Expected**: Error: violates foreign key constraint on profiles

---

## Part 10: Full Data Flow Test

Run all these in sequence to test complete data flow:

```sql
-- 1. Insert test product
INSERT INTO product_catalog (product_id, source, source_key, title, brand, category, price, currency, image_url, url, attributes)
VALUES ('flow_test_' || floor(extract(epoch from now())), 'serper', 'https://test.com', 'Flow Test Product', 'FlowBrand', 'Test Category', 199.99, 'USD', 'https://test.com/img.jpg', 'https://test.com', '{}')
RETURNING product_id;

-- 2. Create session
INSERT INTO sessions (profile_id, started_at, last_activity_at, device)
VALUES ((SELECT id FROM profiles LIMIT 1), now(), now(), 'test-device')
RETURNING session_id;

-- 3. Create impression
INSERT INTO impressions (profile_id, session_id, surface, items, context)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  (SELECT session_id FROM sessions ORDER BY started_at DESC LIMIT 1),
  'discovery',
  jsonb_build_array(jsonb_build_object('product_id', 'flow_test_prod', 'rank', 0, 'rec_type', 'content', 'score', 1.0)),
  '{}'
)
RETURNING impression_id;

-- 4. Track event
INSERT INTO user_events (profile_id, session_id, impression_id, product_id, action, created_at)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  (SELECT session_id FROM sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT impression_id FROM impressions ORDER BY created_at DESC LIMIT 1),
  'flow_test_prod',
  'click',
  now()
)
RETURNING id, action;

-- 5. Verify complete flow
SELECT 
  e.id as event_id,
  e.action,
  e.impression_id,
  i.impression_id as impression_found,
  i.items,
  s.session_id,
  p.product_id
FROM user_events e
LEFT JOIN impressions i ON e.impression_id = i.impression_id
LEFT JOIN sessions s ON e.session_id = s.session_id
LEFT JOIN product_catalog p ON e.product_id = p.product_id
WHERE e.created_at > NOW() - INTERVAL '1 minute'
ORDER BY e.created_at DESC
LIMIT 5;
```

**Expected result**: Complete chain with all foreign keys resolved

---

## Checklist Summary

- [ ] All 6 tables exist and accessible
- [ ] Table schemas match expected columns
- [ ] event_action enum has 8 values
- [ ] Can insert products into product_catalog
- [ ] Can create sessions linked to profiles
- [ ] Can create impressions with item arrays
- [ ] Can track click, save, chat_message events
- [ ] Event-impression join rate ≥ 95%
- [ ] Preference cache stores brands/categories/keywords
- [ ] Recommendation performance records track clicks/saves
- [ ] No orphaned events, impressions, or sessions
- [ ] Feed query performance <300ms p95
- [ ] Foreign key constraints enforced
- [ ] Enum constraints enforced
- [ ] NOT NULL constraints enforced

---

## Known Issues & Fixes

| Issue | Expected Behavior | Status |
|-------|-------------------|--------|
| Serper deduplication | Product IDs stable across sessions | ✅ Handled via hash function |
| Null values in product fields | Handle gracefully | ✅ Fixed in feed/route.ts |
| Session creation without profile | Create new session for existing profile | ✅ Verified |
| Events without impression_id | Allow (for non-feed events) | ✅ Nullable impression_id |
| Chat keyword extraction | Extract brands, categories, keywords | 🔜 Implement in /api/analytics/track |

---

## Next Steps After Testing

1. ✅ All tests pass → Go live with Phase 1
2. Monitor metrics for 2 weeks
3. Check CTR uplift vs baseline
4. Validate preference cache accuracy
5. Proceed with Phase 2 (embeddings + LTR)
