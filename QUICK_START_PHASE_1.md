# Phase 1 Quick Start - 5 Minute Test

## Start Server

```bash
cd C:\Users\huliu\FlairSocial\flair-demo
npm run dev
```

Wait for: `Ready in XXX ms` → Open http://localhost:3000

## Test Flow (5 minutes)

### 1. Open Browser Console (F12)
Open http://localhost:3000 in **incognito/private window**

Expected in console:
```
[AnonymousUser] Generated new anonymous ID: anon_...
[useFeed] Generating feed: surface=discovery, limit=20, session_id=new, anonymous_id=anon_...
[useFeed] Feed generated successfully: {impression_id: "...", session_id: "...", items_count: 20}
```

✅ If you see this → Feed works without auth

❌ If you see 401 errors → Check Supabase connection

### 2. Click 5-10 Products

As you click products, you should see in console:
```
[ProductCard] Clicked: prod_abc123
[Discovery] Product clicked: {product_id: "prod_abc123", impression_id: "...", session_id: "..."}
```

Check DevTools **Network** tab:
- Look for `POST /api/analytics/track`
- Response should be: `{"success": true}`
- Status: 200

### 3. Refresh the Page (Cmd+R or Ctrl+R)

After refresh, expected console output:
```
[AnonymousUser] Restored anonymous ID: anon_... (SAME ID)
[useFeed] Generating feed: surface=discovery, limit=20, session_id=new, anonymous_id=anon_...
[useFeed] Feed generated successfully: {impression_id: "...", session_id: "...", items_count: 20}
```

### 4. Verify Personalization

**The KEY Test**: Does the new feed show similar products to what you clicked?

**Example**:
- Clicked: 5 Gucci, Prada, Louis Vuitton items (luxury brands)
- After refresh: Feed shows more luxury designer items ✅

Or:
- Clicked: 3 casual streetwear, 2 minimalist items  
- After refresh: Feed shows casual/streetwear focused ✅

### 5. Check Database (Optional)

Open Supabase dashboard → SQL editor → Run:

```sql
-- Count your clicks
SELECT COUNT(*) as clicks
FROM user_events 
WHERE action = 'click'
AND created_at > NOW() - INTERVAL '10 minutes'
LIMIT 1;

-- Check impressions
SELECT COUNT(*) as impressions
FROM impressions
WHERE created_at > NOW() - INTERVAL '10 minutes'
LIMIT 1;
```

Expected: clicks > 0, impressions > 1

## Success Checklist

- ✅ Feed loads (20 products visible)
- ✅ No 401 errors in console
- ✅ `[ProductCard] Clicked` logs appear
- ✅ POST requests to `/api/analytics/track` succeed
- ✅ After refresh, similar products shown
- ✅ Same anonymous_id persists
- ✅ Database has click events

**All checked?** → Phase 1 Anonymous Works! 🎉

## If Something Breaks

### Issue: 401 Errors
```
// In console:
localStorage.getItem('flair_anonymous_id')
// Should return: anon_1730812345678_a1b2c3d4
```

### Issue: Products not similar after refresh
- Clicks need time to process (< 1s usually)
- Try refreshing again
- Check DevTools Network tab for POST failures

### Issue: No console logs
- Make sure DevTools is open (F12)
- Check "Console" tab (not "Network")
- Refresh page and watch closely

## Detailed Test Guide

For more thorough testing, see: `PHASE_1_ANONYMOUS_TEST.md`

---

**Time**: ~5 minutes  
**Difficulty**: Easy  
**No auth needed**: ✅
