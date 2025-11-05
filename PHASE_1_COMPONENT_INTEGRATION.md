# Phase 1 Component Integration Guide

**Objective**: Wire Phase 1 APIs into existing components with built-in validation at each step.

---

## Step 1: Update Discovery/Feed Component

### File to modify: `app/page.tsx` (or your discovery feed component)

### Code Changes:

```typescript
import { useFeed } from '@/lib/hooks/useFeed'
import { useAnalytics } from '@/lib/hooks/useAnalytics'
import { useEffect } from 'react'

export default function DiscoveryPage() {
  const { impression_id, session_id, items, loading, error, generateFeed } = useFeed()
  const { trackClick, trackSave, trackChatOpen } = useAnalytics()

  // Generate feed on component mount
  useEffect(() => {
    console.log('[Discovery] Mounting, generating initial feed')
    generateFeed('discovery', 20).catch(err => {
      console.error('[Discovery] Feed generation failed:', err)
    })
  }, [generateFeed])

  const handleProductClick = (product: any, index: number) => {
    console.log('[Discovery] Product clicked:', {
      product_id: product.product_id,
      product_name: product.title,
      impression_id,
      session_id,
      rank: index,
    })

    // Track the click event
    trackClick(product.product_id, impression_id, session_id)

    // TODO: Navigate to product detail page
    // router.push(`/product/${product.id}`)
  }

  const handleSave = (product: any) => {
    console.log('[Discovery] Product saved:', {
      product_id: product.product_id,
      product_name: product.title,
      impression_id,
    })

    // Track the save event
    trackSave(product.product_id, product, impression_id)

    // TODO: Update UI to show saved state
    // e.g., update local state, show toast notification
  }

  const handleChatOpen = (product: any) => {
    console.log('[Discovery] Chat opened for product:', {
      product_id: product.product_id,
      session_id,
    })

    // Track chat open
    trackChatOpen(product.product_id, session_id)

    // TODO: Open chat modal/component
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <p>Failed to load feed: {error}</p>
        <button onClick={() => generateFeed('discovery', 20)}>Retry</button>
      </div>
    )
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading feed...</div>
  }

  return (
    <div>
      <h1>Discovery</h1>
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
        Session: {session_id ? session_id.substring(0, 8) + '...' : 'loading'}
        {impression_id && ` | Impression: ${impression_id.substring(0, 8)}...`}
      </div>

      {items.length === 0 ? (
        <p>No products to display</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 300px)', gap: '20px' }}>
          {items.map((product, idx) => (
            <ProductCard
              key={product.product_id}
              product={product}
              rank={idx}
              onClick={() => handleProductClick(product, idx)}
              onSave={() => handleSave(product)}
              onChatOpen={() => handleChatOpen(product)}
              impression_id={impression_id}
              session_id={session_id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

### Validation Steps:

**Before integration:**
```bash
# 1. Check if imports resolve
npm run type-check

# 2. Check component renders without errors
npm run dev
# Navigate to discovery page in browser
```

**After integration:**

Open browser DevTools → Console and you should see:
```
[useFeed] Generating feed: surface=discovery, limit=20, session_id=new
[useFeed] Feed generated successfully: {impression_id: "...", session_id: "...", items_count: 20}
[Discovery] Mounting, generating initial feed
```

**Database validation:**
```sql
-- Check impressions were created
SELECT COUNT(*) as impression_count 
FROM impressions 
WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Should return: 1 or more rows
```

---

## Step 2: Update ProductCard Component

### File to modify: `components/ProductCard.tsx`

### Code Changes:

Add click and save tracking to your existing ProductCard:

```typescript
import { useAnalytics } from '@/lib/hooks/useAnalytics'

export function ProductCard({
  product,
  rank,
  onClick,
  onSave,
  onChatOpen,
  impression_id,
  session_id,
}: ProductCardProps) {
  const [isSaved, setIsSaved] = useState(false)

  const handleClick = () => {
    console.log('[ProductCard] Clicked - tracking click event')
    onClick?.() // Call parent handler
  }

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('[ProductCard] Save clicked:', { 
      isSaved: !isSaved,
      product_id: product.product_id,
      impression_id,
    })

    setIsSaved(!isSaved)
    onSave?.()
  }

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('[ProductCard] Chat clicked')
    onChatOpen?.()
  }

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '10px',
        cursor: 'pointer',
        position: 'relative',
      }}
      onClick={handleClick}
    >
      {/* Debug info */}
      <div style={{ fontSize: '10px', color: '#999', marginBottom: '8px' }}>
        Rank #{rank} | Prod: {product.product_id?.substring(0, 8)}...
      </div>

      {/* Product image */}
      {product.image && (
        <img
          src={product.image}
          alt={product.title}
          style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px' }}
        />
      )}

      {/* Product info */}
      <h3 style={{ margin: '10px 0 5px' }}>{product.title}</h3>
      <p style={{ margin: '0 0 5px', color: '#666', fontSize: '14px' }}>
        {product.brand} | {product.category}
      </p>
      <p style={{ margin: '0 0 10px', fontWeight: 'bold', fontSize: '16px' }}>
        ${product.price}
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSaveClick}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: isSaved ? '#ff6b6b' : '#eee',
            color: isSaved ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {isSaved ? '❤️ Saved' : '🤍 Save'}
        </button>

        <button
          onClick={handleChatClick}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          💬 Chat
        </button>
      </div>
    </div>
  )
}
```

### Validation Steps:

**After integration:**

1. **Click Tracking**:
   - Click on a product card
   - DevTools Console should show: `[ProductCard] Clicked`
   - Then check database:
   ```sql
   SELECT COUNT(*) FROM user_events 
   WHERE action = 'click' 
   AND created_at > NOW() - INTERVAL '5 minutes';
   ```
   - Should return at least 1 row

2. **Save Tracking**:
   - Click save/like button on a product
   - DevTools Console should show: `[ProductCard] Save clicked`
   - Check database:
   ```sql
   SELECT COUNT(*) FROM user_events 
   WHERE action = 'save' 
   AND created_at > NOW() - INTERVAL '5 minutes';
   ```

3. **Event-Impression Linking**:
   ```sql
   SELECT u.id, u.action, u.impression_id, i.impression_id 
   FROM user_events u 
   LEFT JOIN impressions i ON u.impression_id = i.impression_id 
   WHERE u.created_at > NOW() - INTERVAL '5 minutes' 
   LIMIT 10;
   ```
   - All `impression_id` columns should be populated (not NULL)

---

## Step 3: Update Chat Component

### File to modify: `components/ItemChat.tsx` or wherever chat is handled

### Code Changes:

```typescript
import { useAnalytics } from '@/lib/hooks/useAnalytics'

export function ItemChat({ productId, sessionId }: ItemChatProps) {
  const { trackChatOpen, trackChatMessage } = useAnalytics()
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    console.log('[ItemChat] Chat opened for product:', productId)
    trackChatOpen(productId, sessionId)
  }, [productId, sessionId, trackChatOpen])

  const handleSendMessage = async (message: string) => {
    console.log('[ItemChat] Sending message:', {
      message,
      productId,
      sessionId,
    })

    // Track the chat message
    trackChatMessage(productId, message, sessionId)

    // TODO: Send message to LLM/backend
    // const response = await fetch('/api/chat', { ... })
    // Add response to messages
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3>Chat about this product</h3>

      {/* Debug info */}
      <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
        Product: {productId?.substring(0, 12)}... | Session: {sessionId?.substring(0, 12)}...
      </div>

      {/* Messages display */}
      <div style={{ height: '300px', overflowY: 'auto', marginBottom: '10px', border: '1px solid #eee', padding: '10px' }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '10px',
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                backgroundColor: msg.role === 'user' ? '#4CAF50' : '#eee',
                color: msg.role === 'user' ? 'white' : 'black',
                padding: '8px 12px',
                borderRadius: '8px',
                maxWidth: '80%',
              }}
            >
              {msg.content}
            </span>
          </div>
        ))}
      </div>

      {/* Message input */}
      <MessageInput onSend={handleSendMessage} />
    </div>
  )
}
```

### Validation Steps:

**After integration:**

1. **Chat Open Tracking**:
   - Open chat for a product
   - DevTools Console should show: `[ItemChat] Chat opened for product: ...`
   - Check database:
   ```sql
   SELECT COUNT(*) FROM user_events 
   WHERE action = 'chat_open' 
   AND created_at > NOW() - INTERVAL '5 minutes';
   ```

2. **Chat Message Tracking**:
   - Send a message: "I love minimalist beige cardigans"
   - DevTools Console should show: `[ItemChat] Sending message:`
   - Check database:
   ```sql
   SELECT u.*, u.payload 
   FROM user_events u 
   WHERE action = 'chat_message' 
   AND created_at > NOW() - INTERVAL '5 minutes' 
   LIMIT 5;
   ```
   - Verify `payload` contains your chat text

3. **Keyword Extraction**:
   - After sending chat message, check if keywords were extracted:
   ```sql
   SELECT profile_id, chat_keywords 
   FROM user_preference_cache 
   WHERE updated_at > NOW() - INTERVAL '5 minutes';
   ```
   - Should see keywords like: ["minimalist", "beige", "cardigans"]

---

## Full Data Flow Validation

Once all three components are integrated, run this comprehensive test:

```
1. USER GENERATES FEED
   ↓ Check: impressions table has new row
   
2. USER CLICKS PRODUCT
   ↓ Check: user_events has 'click' action linked to impression_id
   
3. USER SAVES PRODUCT
   ↓ Check: user_events has 'save' action
   ↓ Check: saved_items table updated
   
4. USER OPENS CHAT
   ↓ Check: user_events has 'chat_open' action
   
5. USER SENDS MESSAGE
   ↓ Check: user_events has 'chat_message' action
   ↓ Check: keywords extracted to user_preference_cache
   
6. PREFERENCE UPDATE
   ↓ Check: user_preference_cache updated with brands/categories
```

### SQL Command to Verify Entire Flow:

```sql
-- Run this after all steps above
SELECT 
  'Impressions' as table_name,
  COUNT(*) as count
FROM impressions
WHERE created_at > NOW() - INTERVAL '30 minutes'

UNION ALL

SELECT 
  'Events - Click',
  COUNT(*)
FROM user_events
WHERE action = 'click'
AND created_at > NOW() - INTERVAL '30 minutes'

UNION ALL

SELECT 
  'Events - Save',
  COUNT(*)
FROM user_events
WHERE action = 'save'
AND created_at > NOW() - INTERVAL '30 minutes'

UNION ALL

SELECT 
  'Events - Chat',
  COUNT(*)
FROM user_events
WHERE action IN ('chat_open', 'chat_message')
AND created_at > NOW() - INTERVAL '30 minutes'

UNION ALL

SELECT 
  'Event-Impression Join Rate %',
  ROUND(
    COUNT(CASE WHEN impression_id IS NOT NULL THEN 1 END)::numeric / 
    NULLIF(COUNT(*)::numeric, 0) * 100, 
    2
  )
FROM user_events
WHERE created_at > NOW() - INTERVAL '30 minutes';
```

**Expected Output**:
```
table_name                      | count
--------------------------------|-------
Impressions                     | 1+
Events - Click                  | 1+
Events - Save                   | 1+
Events - Chat                   | 1+
Event-Impression Join Rate %    | 95+
```

---

## Browser DevTools Console Log Validation

When running locally, console should show progression like:

```
[useFeed] Generating feed: surface=discovery, limit=20, session_id=new
[useFeed] Feed generated successfully: {impression_id: "abc123...", session_id: "def456...", items_count: 20}
[Discovery] Mounting, generating initial feed
[ProductCard] Clicked
[Discovery] Product clicked: {product_id: "prod_xyz", impression_id: "abc123...", session_id: "def456...", rank: 0}
[ProductCard] Save clicked: {isSaved: true, product_id: "prod_xyz", impression_id: "abc123..."}
[ItemChat] Chat opened for product: prod_xyz
[ItemChat] Sending message: {message: "I love this!", productId: "prod_xyz", sessionId: "def456..."}
```

---

## Troubleshooting Checklist

| Issue | Check | Fix |
|-------|-------|-----|
| No impressions created | `/api/feed` returns 200 status | Verify Serper API key, check server logs |
| Events not linked | `impression_id` passed to `/api/analytics/track` | Pass impression_id from useFeed to components |
| Chat keywords not extracted | Check `user_preference_cache` after chat | Verify `extractKeywordsFromChat()` in track endpoint |
| Session not persisting | Check localStorage `feed_session_id` | Ensure session_id passed on next `/api/feed` call |
| High latency | Check `/api/feed` response time | Optimize Serper queries, add caching |

---

## Performance Targets

Monitor these metrics locally:

1. **Feed Generation Latency**:
   - Open DevTools → Network tab
   - Click "Generate Feed"
   - Time should be <300ms (excluding Serper)
   - Log: `console.time('feed-generation')`

2. **Event Tracking Latency**:
   - Network tab → `/api/analytics/track`
   - Should be <100ms

3. **Event-Impression Join Rate**:
   - Run query from validation section above
   - Target: ≥95%

---

## Next: Cron Job Setup (Optional)

See PHASE_1_CHECKLIST.md Section 5 for preference update job setup.
