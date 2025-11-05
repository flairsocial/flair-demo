# Phase 1 Anonymous Tracking Implementation - Complete

## What Was Built

A fully functional **anonymous product recommendation system** that works **without Clerk authentication**. Users can click products, and the system learns their preferences to recommend similar items.

## Key Features Implemented

### 1. Anonymous User Identification
- **File**: `lib/hooks/useAnonymousUser.ts`
- Generates unique ID: `anon_<timestamp>_<random>`
- Persists in localStorage for session continuity
- No server-side user account needed

### 2. Frontend Integration
- **Discovery Page** (`app/page.tsx`):
  - Calls `useFeed()` to generate personalized feed
  - Tracks clicks with `trackClick()`
  - Logs all actions with `[Discovery]` prefix

- **ProductCard Component** (`components/ProductCard.tsx`):
  - Tracks clicks: `[ProductCard] Clicked`
  - Tracks saves/unsaves: `[ProductCard] Save clicked`
  - Integrates with analytics hook

- **ProductDetail Component** (`components/ProductDetail.tsx`):
  - Tracks chat opens: `[ProductDetail] Chat opened`
  - Supports future chat message tracking

### 3. Backend APIs (Now Anonymous-Friendly)

**Feed Endpoint** (`/api/feed`):
- Accepts `anonymous_id` parameter
- Creates sessions without requiring Clerk auth
- For anonymous users: queries recent clicks to extract brands/categories
- Returns personalized products based on click history
- Stores impressions with anonymous tracking

**Analytics Endpoint** (`/api/analytics/track`):
- Accepts `anonymous_id` parameter
- Records all user actions (click, save, unsave, chat_open, etc.)
- Links events to impressions for join rate tracking
- Updates preference cache for authenticated users

### 4. Database Changes

**New Columns** (Applied via migration):
```sql
ALTER TABLE sessions ADD COLUMN anonymous_id TEXT;
ALTER TABLE user_events ADD COLUMN anonymous_id TEXT;
CREATE INDEX idx_sessions_anonymous_id ON sessions(anonymous_id);
CREATE INDEX idx_user_events_anonymous_id ON user_events(anonymous_id);
```

## Data Flow

```
User opens page
    ↓
Generate anonymous_id (or restore from localStorage)
    ↓
Call /api/feed?anonymous_id=anon_xxx
    ↓
Backend: Query recent clicks for this anonymous_id
         Extract brands/categories from clicked products
         Generate personalized search queries
         Fetch products, store impression
    ↓
Display 20 products
    ↓
User clicks product
    ↓
POST /api/analytics/track {action: "click", product_id: "...", anonymous_id: "anon_xxx"}
    ↓
Backend: Store event, update session activity
    ↓
User refreshes or scrolls
    ↓
Call /api/feed again
    ↓
Backend: Find recent clicks, identify preferred brands/categories
         NEXT FEED SHOWS SIMILAR PRODUCTS
```

## How Personalization Works

1. **First Load**: Shows default high-quality designer products
2. **After 1st Click**: Stores click with product's brand/category
3. **Second Load**: Queries `SELECT brand, category FROM product_catalog WHERE product_id IN (recent_clicks)`
4. **Generates Personalized Queries**: E.g., "Gucci designer", "luxury fashion"
5. **Next Feed**: Shows products matching those queries
6. **Continuous Loop**: Each refresh learns from more clicks

## Testing Instructions

Follow the comprehensive test guide: `PHASE_1_ANONYMOUS_TEST.md`

**Quick Test**:
1. Open http://localhost:3000 in incognito window
2. Click 5-10 products (try mix of designer/luxury items)
3. Check console: `[ProductCard] Clicked: prod_xxx`
4. Refresh page
5. **Verify**: Next feed shows similar products to what you clicked

## Files Modified

### Core Hooks
- `lib/hooks/useFeed.ts` - Added anonymous_id support, removed auth retry
- `lib/hooks/useAnalytics.ts` - Added anonymous_id to track events
- `lib/hooks/useAnonymousUser.ts` - NEW: Manages anonymous user ID

### Components
- `app/page.tsx` - Integrated feed + analytics tracking
- `components/ProductCard.tsx` - Added click/save tracking
- `components/ProductDetail.tsx` - Added chat open tracking

### API Routes
- `app/api/feed/route.ts` - Support for anonymous sessions + personalization
- `app/api/analytics/track/route.ts` - Support for anonymous event tracking

## Database Schema

### Sessions Table
```
- session_id (UUID) PRIMARY KEY
- profile_id (UUID) NULLABLE - for authenticated users
- anonymous_id (TEXT) NULLABLE - for anonymous users
- started_at, last_activity_at
- device, user_agent
```

### User Events Table
```
- id (UUID) PRIMARY KEY
- profile_id (UUID) NULLABLE
- anonymous_id (TEXT) NULLABLE
- session_id, impression_id, product_id
- action (ENUM: click, save, unsave, view, share, like, chat_open, chat_message)
- dwell_time_seconds, payload (JSONB)
- created_at
```

### Product Catalog Table
```
- product_id (TEXT) PRIMARY KEY
- title, brand, category, price, image_url
- attributes (JSONB with full product data)
```

### Impressions Table
```
- impression_id (UUID) PRIMARY KEY
- profile_id (UUID) NULLABLE
- session_id (UUID)
- surface (TEXT: "discovery", etc.)
- items (JSONB array: [{product_id, rank, rec_type, score}])
- context (JSONB: {queries: [], anonymous_id: ""})
- created_at
```

## Personalization Algorithm

### For Anonymous Users
```
1. Get last 20 clicks: SELECT product_id FROM user_events WHERE anonymous_id = ? AND action = 'click'
2. Get brand/category of those products
3. Build queries: ["gucci designer", "luxury fashion", "premium clothing"]
4. Fetch products for those queries
5. Deduplicate by link
6. Return top 20, store impression with context
```

### For Authenticated Users (Future)
```
1. Look up user_preference_cache
2. Use stored favorite_brands, favorite_categories, style_keywords
3. Build personalized queries
4. Fetch and return products
```

## Success Metrics

When testing, verify:
- ✅ Feed loads without 401 errors
- ✅ 20 products displayed on initial load
- ✅ Clicks tracked to database (check analytics/track POST)
- ✅ Console shows `[ProductCard] Clicked:`, `[useFeed]` logs
- ✅ After refresh, similar products shown
- ✅ Save/unsave tracked
- ✅ Same anonymous_id persists across page reloads
- ✅ Event-impression join rate ≥ 90%

## Known Limitations

- **No authenticated user support yet** - Anonymous only (will add Clerk support next phase)
- **No preference cache auto-update** - Manual update job needed
- **No chat message keyword extraction** - Placeholder for future phases
- **No A/B testing** - Single algorithm for all users

## Next Steps

1. **Testing**: Follow `PHASE_1_ANONYMOUS_TEST.md`
2. **Debugging**: Check `PHASE_1_ANONYMOUS_TEST.md` troubleshooting section
3. **Production**: Deploy with env vars for Supabase
4. **Phase 2**: Add authenticated user preference caching
5. **Phase 3**: Add ML-based ranking and A/B testing

## Console Log Prefixes

When debugging, look for these prefixes:
- `[AnonymousUser]` - Anonymous ID generation/restoration
- `[useFeed]` - Feed generation, includes surface/limit/session_id
- `[ProductCard]` - Click/save events
- `[Discovery]` - Page-level actions
- `[ProductDetail]` - Product detail modal actions
- `[Analytics]` - Analytics tracking (debug level)

## Architecture Diagram

```
┌─ Browser ─────────────────────┐
│  localStorage: anon_id        │
│  Discovery Page               │
│  ├─ useFeed()                │
│  ├─ useAnalytics()           │
│  ├─ useAnonymousUser()       │
│  └─ ProductCard               │
└─────────┬──────────────────────┘
          │
          ├─→ GET /api/feed?anonymous_id=anon_xxx
          │   [Feed Generation]
          │   - Query recent clicks
          │   - Extract brands/categories
          │   - Build personalized queries
          │   - Return products
          │
          └─→ POST /api/analytics/track
              {action, product_id, anonymous_id}
              [Event Tracking]
              - Store event
              - Update session
              - (update preferences for auth users)
              
┌─ Supabase ────────────────────┐
│ sessions                       │
│   ├─ profile_id               │
│   ├─ anonymous_id ← anon_xxx  │
│   └─ ...                      │
│                               │
│ user_events                    │
│   ├─ profile_id               │
│   ├─ anonymous_id ← anon_xxx  │
│   ├─ action (click, save, ...) │
│   ├─ product_id               │
│   └─ ...                      │
│                               │
│ product_catalog               │
│   ├─ product_id               │
│   ├─ brand, category          │
│   └─ ...                      │
│                               │
│ impressions                    │
│   ├─ profile_id, anonymous_id │
│   ├─ items (product list)     │
│   └─ context (queries used)   │
└───────────────────────────────┘
```

---

**Ready to test!** Follow `PHASE_1_ANONYMOUS_TEST.md` to validate end-to-end.
