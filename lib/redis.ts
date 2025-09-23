import Redis from 'ioredis'

// Redis client with connection pooling and error handling
let redis: Redis | null = null
let redisEnabled = false

// Only initialize Redis if URL is provided
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
      enableOfflineQueue: false,
      // Performance optimizations
      keepAlive: true,
      keyPrefix: 'flair:',
    })

    // Error handling
    redis.on('error', (err: any) => {
      console.error('[Redis] Connection error:', err.message)
      redisEnabled = false
    })

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully')
      redisEnabled = true
    })

    redis.on('ready', () => {
      console.log('[Redis] Ready to receive commands')
      redisEnabled = true
    })

    redis.on('close', () => {
      console.log('[Redis] Connection closed')
      redisEnabled = false
    })
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error)
    redis = null
    redisEnabled = false
  }
} else {
  console.log('[Redis] No REDIS_URL provided - caching disabled')
  redisEnabled = false
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Redis] Closing connection...')
  await redis.quit()
})

process.on('SIGINT', async () => {
  console.log('[Redis] Closing connection...')
  await redis.quit()
})

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  USER_PROFILE: 86400,      // 24 hours
  USER_COLLECTIONS: 3600,   // 1 hour
  USER_STATS: 1800,         // 30 minutes
  COMMUNITY_POSTS: 300,     // 5 minutes
  FOLLOWING_FEED: 600,      // 10 minutes
  POPULAR_CONTENT: 1800,    // 30 minutes
  SEARCH_RESULTS: 900,      // 15 minutes
} as const

// Cache key generators
export const CACHE_KEYS = {
  userProfile: (userId: string) => `user:${userId}:profile`,
  userCollections: (userId: string) => `user:${userId}:collections`,
  userStats: (userId: string) => `user:${userId}:stats`,
  communityPosts: (limit: number, offset: number) => `community:posts:${limit}:${offset}`,
  followingFeed: (userId: string) => `user:${userId}:following-feed`,
  popularCollections: () => 'global:popular-collections',
  searchResults: (query: string, filters: string) => `search:${query}:${filters}`,
}

// Cache operations
export class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    if (!redis || !redisEnabled) {
      console.log(`[Cache] Redis not available, skipping get for ${key}`)
      return null
    }

    try {
      const data = await redis.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`[Cache] Error getting ${key}:`, error)
      return null
    }
  }

  static async set(key: string, value: any, ttl: number = 300): Promise<void> {
    if (!redis || !redisEnabled) {
      console.log(`[Cache] Redis not available, skipping set for ${key}`)
      return
    }

    try {
      await redis.setex(key, ttl, JSON.stringify(value))
    } catch (error) {
      console.error(`[Cache] Error setting ${key}:`, error)
    }
  }

  static async del(key: string): Promise<void> {
    if (!redis || !redisEnabled) {
      console.log(`[Cache] Redis not available, skipping del for ${key}`)
      return
    }

    try {
      await redis.del(key)
    } catch (error) {
      console.error(`[Cache] Error deleting ${key}:`, error)
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    if (!redis || !redisEnabled) {
      console.log(`[Cache] Redis not available, skipping invalidate for ${pattern}`)
      return
    }

    try {
      const keys = await redis.keys(`flair:${pattern}`)
      if (keys.length > 0) {
        await redis.del(...keys)
        console.log(`[Cache] Invalidated ${keys.length} keys matching ${pattern}`)
      }
    } catch (error) {
      console.error(`[Cache] Error invalidating pattern ${pattern}:`, error)
    }
  }

  // Invalidate all user-related cache
  static async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}:*`,
      `search:*:${userId}`, // Search results involving this user
    ]

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern)
    }
  }

  // Health check
  static async ping(): Promise<boolean> {
    if (!redis || !redisEnabled) {
      return false
    }

    try {
      const result = await redis.ping()
      return result === 'PONG'
    } catch (error) {
      console.error('[Cache] Health check failed:', error)
      return false
    }
  }

  // Get cache stats
  static async getStats(): Promise<any> {
    if (!redis || !redisEnabled) {
      return {
        connected: false,
        error: 'Redis not configured'
      }
    }

    try {
      const info = await redis.info()
      const dbsize = await redis.dbsize()
      return {
        connected: true,
        dbsize,
        info: info.split('\n').slice(0, 10).join('\n'), // First 10 lines
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

export default redis
