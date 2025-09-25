import { Redis } from '@upstash/redis'

// Redis client with Upstash REST API
let redis: Redis | null = null
let redisEnabled = false
let redisConnected = false

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
  // Lazy initialization of Redis
  private static async ensureRedis(): Promise<boolean> {
    if (redis && redisConnected) {
      return true
    }

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.log('[Cache] Redis environment variables not available')
      return false
    }

    try {
      if (!redis) {
        redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
        console.log('[Cache] Redis client created')
      }

      // Test connection
      const pingResult = await redis.ping()
      if (pingResult === 'PONG') {
        redisEnabled = true
        redisConnected = true
        console.log('[Cache] Redis connection verified')
        return true
      } else {
        console.error('[Cache] Redis ping failed:', pingResult)
        redis = null
        redisConnected = false
        return false
      }
    } catch (error) {
      console.error('[Cache] Redis initialization failed:', error)
      redis = null
      redisConnected = false
      return false
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    if (!(await this.ensureRedis())) {
      console.log(`[Cache] Redis not available, skipping get for ${key}`)
      return null
    }

    try {
      const data = await redis!.get(key)
      if (data === null || data === undefined) {
        return null
      }
      if (typeof data === 'object') {
        return data as T
      }
      if (typeof data === 'string') {
        return JSON.parse(data) as T
      }
      return data as T
    } catch (error) {
      console.error(`[Cache] Error getting ${key}:`, error)
      return null
    }
  }

  static async set(key: string, value: any, ttl: number = 300): Promise<void> {
    if (!(await this.ensureRedis())) {
      console.log(`[Cache] Redis not available, skipping set for ${key}`)
      return
    }

    try {
      const serialized = JSON.stringify(value)

      // Measure byte-length (UTF-8) instead of character count
      const byteLength = Buffer.byteLength(serialized, 'utf8')

  // Use a safer/default size limit: 256KB for community feeds, 1MB for others
  const sizeLimit = key.startsWith('community:feed:') ? 256 * 1024 : 1024 * 1024
      if (byteLength > sizeLimit) {
        console.log(`[Cache] Data too large to cache (${(byteLength / 1024).toFixed(1)}KB > ${(sizeLimit / 1024).toFixed(1)}KB), skipping ${key}`)
        return
      }

      await redis!.setex(key, ttl, serialized)
      console.log(`[Cache] Successfully cached ${key} (${(byteLength / 1024).toFixed(1)}KB)`)    
    } catch (error) {
      console.error(`[Cache] Error setting ${key}:`, error)
      // If there's an error, mark Redis as unavailable
      redisConnected = false
    }
  }

  static async del(key: string): Promise<void> {
    if (!(await this.ensureRedis())) {
      console.log(`[Cache] Redis not available, skipping del for ${key}`)
      return
    }

    try {
      await redis!.del(key)
    } catch (error) {
      console.error(`[Cache] Error deleting ${key}:`, error)
      redisConnected = false
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    if (!(await this.ensureRedis())) {
      console.log(`[Cache] Redis not available, skipping invalidate for ${pattern}`)
      return
    }

    try {
      const keys = await redis!.keys(`flair:${pattern}`)
      if (keys.length > 0) {
        await redis!.del(...keys)
        console.log(`[Cache] Invalidated ${keys.length} keys matching ${pattern}`)
      }
    } catch (error) {
      console.error(`[Cache] Error invalidating pattern ${pattern}:`, error)
      redisConnected = false
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
    if (await this.ensureRedis()) {
      try {
        const result = await redis!.ping()
        return result === 'PONG'
      } catch (error) {
        console.error('[Cache] Health check failed:', error)
        redisConnected = false
        return false
      }
    }
    return false
  }

  // Get cache stats
  static async getStats(): Promise<any> {
    if (await this.ensureRedis()) {
      try {
        // Test connection with ping
        const pingResult = await redis!.ping()
        const connected = pingResult === 'PONG'

        return {
          connected,
          provider: 'Upstash',
          restApi: true,
        }
      } catch (error) {
        return {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
    return {
      connected: false,
      error: 'Redis not configured'
    }
  }
}

export default redis
