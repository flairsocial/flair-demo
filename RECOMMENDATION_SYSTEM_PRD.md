# Recommendation System PRD (Click/Save/Chat-driven)

## 1) Objective
Deliver a generated product feed that adapts in near-real-time to what users click, save, and chat about with items. The system must reliably capture impressions, actions, and context, then use that data to personalize candidate selection and ranking while preserving exploration and measurable iteration.

## 2) Scope
- Surfaces: Discovery Feed (primary), Product Detail (“More like this”), Search augmentations.
- Signals: impressions, clicks, saves/unsaves, dwell, detail views, shares, chat-with-item (open, message), search queries.
- Personalization: user- and session-level; recency aware; cold-start support.
- Out of scope (initial): vision models on imagery, real-time sub-second re-ranking at scroll depth, cross-device attribution beyond auth.

## 3) Success Criteria (North-star and leading indicators)
- CTR@20 (discovery): +3x vs current baseline within 4–6 weeks.
- Save rate@20: +3–5x vs baseline.
- Chat initiation rate (from feed): +50% vs baseline after chat-aware ranking.
- Retention: 7D return rate +10–15pp vs baseline.
- System: <300ms p95 feed generation on warmed cache; >99.9% event capture success.

## 4) System Overview
1) Data capture (impressions and events) → 2) Feature aggregation + product catalog cache → 3) Candidate generators (content-based, trending, collaborative later) → 4) Ranker (heuristic → LTR) with exploration → 5) Feedback loop + A/B.


## 5) Data Model (Supabase)

### 5.1 Product catalog cache (stabilize IDs from Serper)
- Purpose: canonicalize product identity for CF and dedupe.
```
CREATE TABLE IF NOT EXISTS product_catalog (
  product_id TEXT PRIMARY KEY,               -- stable hash from source URL + title + brand
  source TEXT NOT NULL,                      -- e.g., 'serper'
  source_key TEXT,                           -- upstream id/url
  title TEXT,
  brand TEXT,
  category TEXT,
  price NUMERIC,
  currency TEXT,
  image_url TEXT,
  url TEXT,
  attributes JSONB,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_brand ON product_catalog(brand);
CREATE INDEX IF NOT EXISTS idx_product_category ON product_catalog(category);
```

### 5.2 Sessions
```
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  device TEXT,
  user_agent TEXT
);
```

### 5.3 Impressions (position bias, implicit negatives)
```
CREATE TABLE IF NOT EXISTS impressions (
  impression_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(session_id) ON DELETE SET NULL,
  surface TEXT NOT NULL,         -- discovery, detail_related, etc.
  items JSONB NOT NULL,          -- [{product_id, rank, rec_type}]
  context JSONB,                 -- query, filters
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_impressions_profile_created ON impressions(profile_id, created_at DESC);
```

### 5.4 User events (click/save/chat)
```
CREATE TYPE event_action AS ENUM ('view', 'click', 'save', 'unsave', 'like', 'share', 'chat_open', 'chat_message');

CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(session_id) ON DELETE SET NULL,
  impression_id UUID REFERENCES impressions(impression_id) ON DELETE SET NULL,
  product_id TEXT REFERENCES product_catalog(product_id) ON DELETE SET NULL,
  action event_action NOT NULL,
  dwell_time_seconds INT,
  payload JSONB,                 -- e.g., chat text, search term
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_profile_created ON user_events(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_product ON user_events(product_id);
```

### 5.5 Embeddings (optional Phase 2+)
```
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS product_embeddings (
  product_id TEXT PRIMARY KEY REFERENCES product_catalog(product_id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.6 Preference cache + rec performance
```
CREATE TABLE IF NOT EXISTS user_preference_cache (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  favorite_brands TEXT[],
  favorite_categories TEXT[],
  price_min NUMERIC,
  price_max NUMERIC,
  style_keywords TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recommendation_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES product_catalog(product_id),
  rec_type TEXT NOT NULL,          -- content, trending, cf
  action TEXT NOT NULL,            -- clicked, saved, ignored
  position INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```


## 6) API Contracts

### 6.1 Feed generation
GET /api/feed?surface=discovery
- Response: { impression_id, items: [{ product, rank, rec_type, score }] }
- Side-effect: records an impression row with item list and ranks.

### 6.2 Similar items
GET /api/products/:id/similar
- Response: array of products with similarity score + rec_type=content.

### 6.3 Track events
POST /api/analytics/track
- Body: { action, product_id?, impression_id?, session_id, dwell_time?, payload? }

### 6.4 Chat with item
POST /api/chat/item
- Body: { product_id, message, impression_id?, session_id }
- Side-effects: stores user_events(action='chat_message'); extracts entities/keywords → updates preference cache; optional text embedding for personalization.


## 7) Algorithms

### 7.1 Candidate generators
- Content-based (Phase 1):
  - Heuristic similarity on brand/category/price/keyword overlap.
  - Recency bias: saved/liked in last 7–30 days influence weights more.
  - Use learned preferences to build Serper queries; canonicalize results into product_catalog.
- Trending (Phase 1):
  - Global popularity: clicks and saves per product with time decay (e.g., half-life 3 days).
- Embedding-based (Phase 2):
  - Generate product embeddings from text (title/brand/category/desc).
  - Optional user text embeddings from chat/search; nearest-neighbor retrieval via pgvector.
- Collaborative filtering (Phase 3):
  - Implicit feedback model (e.g., BPR/ALS) trained on saves/clicks; candidate recall by similar users/items.

### 7.2 Ranker
- Phase 1: Weighted linear score
  score = w_brand + w_category + w_price + w_keyword + w_recency + w_trending + w_chat_match
  - Position-bias aware training via IPS in Phase 2.
- Phase 2: Pointwise LTR (logistic regression or small GBM) with features:
  - User: top brands/cats, price band, recency features, chat-derived intents/keywords.
  - Item: brand/cat/price, popularity, novelty, age.
  - Cross: brand-in-favorites, category-in-favorites, price-in-range, text-sim(chat↔title), embed cosine.
- Phase 3: Pairwise LTR; per-user mixture weights among generators.

### 7.3 Exploration/Exploitation
- Phase 1: epsilon-greedy (ε≈0.1): randomly swap-in unseen/high-uncertainty items.
- Phase 2: Thompson sampling per generator (arms: content/trending/cf) using beta-posteriors on click/save.


## 8) Chat Signal Utilization
- Event logging: chat_open/chat_message linked to product + impression.
- NLP extraction (server-side): brands, categories, style adjectives, budget, occasions; update user_preference_cache.
- Feature: chat_keyword_overlap(product.title), embed_similarity(chat_text, product_embed).
- Outcome metric: chat-to-save rate from feed.


## 9) Feed Assembly Logic
1) Build user/session profile (cached; refresh if stale > 15 min).
2) Generate candidates:
   - Content-based N1, Trending N2, (CF N3 if enabled).
3) Deduplicate by product_id; cap brand/category dominance; ensure diversity.
4) Score with ranker; inject ε-exploration.
5) Create impression, return list with ranks and metadata.


## 10) Metrics & Evaluation
- Online: CTR@k, Save@k, Dwell, Chat-init@k, Novelty, Diversity, Coverage, Conversion proxy (save per impression).
- Offline: counterfactual evaluation using logged impressions (IPS/DR where possible).
- A/B: experiment_id on impressions; 50/50 splits initially; guardrails: error rates, latency, content safety.


## 11) Performance & Ops
- Latency targets: feed endpoint <300ms p95 (excluding Serper). Use background warming for candidate pools; batch Serper calls; cache popular queries.
- Jobs:
  - Hourly: trending aggregation, preference cache refresh.
  - Daily: embeddings refresh; catalog dedupe/merge.
- Quotas: event ingestion rate limit per user; backpressure with queue if needed.
- Data retention: raw events 180 days; aggregates 1 year.


## 12) Privacy & Compliance
- Minimum data principle; no PII in free-text storage beyond required context.
- User consent for analytics; opt-out disables personalization and resets caches.
- Data deletion on account removal cascades to user_preference_cache and events.


## 13) Phased Delivery Plan

### Phase 1 (Weeks 1–2): Foundation + Heuristic Personalization
- Tables: product_catalog, sessions, impressions, user_events, user_preference_cache, recommendation_performance.
- APIs: /api/feed, /api/analytics/track, /api/products/:id/similar, /api/chat/item.
- Logic: heuristic content-based, trending with time decay, ε-greedy exploration, impression logging.
- UI: feed returns impression_id; clicks/saves/chats include impression_id.
- Acceptance: >95% events linked to impressions; CTR uplift vs baseline ≥ 2x on smoke cohort.

### Phase 2 (Weeks 3–5): Embeddings + Simple LTR + Bandits
- Add product_embeddings + text embedding generation; cosine-retrieval candidates.
- Ranker: logistic LTR; IPS-corrected training using logged positions.
- Bandits: Thompson sampling across content/trending/embedding generators.
- A/B: framework + experiment_id tagging on impressions.
- Acceptance: CTR@20 +50% vs Phase 1; latency p95 <350ms.

### Phase 3 (Weeks 6–8): Collaborative Filtering + Pairwise LTR
- Implicit CF (BPR/ALS) candidates; pairwise LTR ranker.
- Per-user mixture weights (optimize by recent performance).
- Acceptance: Save@20 +25% vs Phase 2; diversity maintained (Gini ≥ target).


## 14) Acceptance Criteria (Go/No-Go)
- Correctness: impressions created for 99% of feed responses; event-impression join rate ≥ 97%.
- Personalization: statistically significant uplift in CTR@20 and Save@20 (p<0.05) in A/B.
- Safety/Quality: diversity guardrails (no >40% single-brand in top 20 unless user strongly prefers); novelty ≥20% new items per session.
- Ops: observability dashboards (events per minute, error rate, latency, CTR@k) and on-call runbook.


## 15) Open Questions
- Serper stability: do we need a stricter canonicalization strategy (e.g., URL normalization rules per retailer)?
- Budget-aware ranking: should price sensitivity dominate when user states a budget in chat?
- Cold-start defaults by segment (gender/style) vs global trending weights?


## 16) Implementation Notes
- Canonical product_id suggestion: SHA256(lowercase(trim(url)) || '-' || brand || '-' || normalized_title).
- Recency decay: w = exp(-Δt / τ), τ = 7 days for clicks, 21 days for saves.
- Diversity: per-slice caps (max 5 items per brand, 8 per category in top 30).
- Exploration gating: never explore with low-quality sources (minimum catalog completeness threshold).
