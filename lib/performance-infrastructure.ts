// REDIS CACHING LAYER - Zero-cost scaling solution
// Install: npm install redis

import { createClient } from 'redis'

class CacheManager {
  private client: any
  private isConnected = false

  constructor() {
    // Use free Redis tier (many free options available)
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    })
    
    this.client.on('error', (err: any) => {
      console.log('Redis Client Error', err)
      this.isConnected = false
    })
    
    this.client.on('connect', () => {
      this.isConnected = true
      console.log('Redis Connected')
    })
  }

  async connect() {
    if (!this.isConnected) {
      await this.client.connect()
    }
  }

  // Cache collections for 5 minutes
  async cacheCollections(userId: string, collections: any[]) {
    if (!this.isConnected) return
    
    try {
      await this.client.setEx(
        `collections:${userId}`, 
        300, // 5 minutes
        JSON.stringify(collections)
      )
    } catch (error) {
      console.error('Cache write error:', error)
    }
  }

  async getCachedCollections(userId: string): Promise<any[] | null> {
    if (!this.isConnected) return null
    
    try {
      const cached = await this.client.get(`collections:${userId}`)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Cache read error:', error)
      return null
    }
  }

  // Cache community feed for 30 seconds
  async cacheCommunityFeed(offset: number, limit: number, posts: any[]) {
    if (!this.isConnected) return
    
    try {
      await this.client.setEx(
        `community_feed:${offset}:${limit}`,
        30, // 30 seconds
        JSON.stringify(posts)
      )
    } catch (error) {
      console.error('Cache write error:', error)
    }
  }

  async getCachedCommunityFeed(offset: number, limit: number): Promise<any[] | null> {
    if (!this.isConnected) return null
    
    try {
      const cached = await this.client.get(`community_feed:${offset}:${limit}`)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.error('Cache read error:', error)
      return null
    }
  }

  // Cache profile data for 10 minutes
  async cacheProfile(clerkId: string, profileId: string) {
    if (!this.isConnected) return
    
    try {
      await this.client.setEx(
        `profile:${clerkId}`,
        600, // 10 minutes
        profileId
      )
    } catch (error) {
      console.error('Cache write error:', error)
    }
  }

  async getCachedProfile(clerkId: string): Promise<string | null> {
    if (!this.isConnected) return null
    
    try {
      return await this.client.get(`profile:${clerkId}`)
    } catch (error) {
      console.error('Cache read error:', error)
      return null
    }
  }

  // Invalidate cache when data changes
  async invalidateUserCache(userId: string) {
    if (!this.isConnected) return
    
    try {
      const keys = await this.client.keys(`*${userId}*`)
      if (keys.length > 0) {
        await this.client.del(keys)
      }
    } catch (error) {
      console.error('Cache invalidation error:', error)
    }
  }

  // Warm up cache for popular data
  async warmupCache() {
    if (!this.isConnected) return
    
    try {
      // Pre-cache popular collections, trending posts, etc.
      console.log('Cache warmup started')
    } catch (error) {
      console.error('Cache warmup error:', error)
    }
  }
}

export const cacheManager = new CacheManager()

// ============================================================================
// DATABASE CONNECTION POOLING
// ============================================================================

import { createClient } from '@supabase/supabase-js'

class DatabaseManager {
  private pools: Map<string, any> = new Map()
  
  getOptimizedClient(poolName: string = 'default') {
    if (!this.pools.has(poolName)) {
      const client = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { 
            headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY! }
          },
          // Connection pooling settings
          db: {
            schema: 'public',
          },
          // Optimize for API usage
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        }
      )
      
      this.pools.set(poolName, client)
    }
    
    return this.pools.get(poolName)
  }
  
  // Separate read/write pools for better performance
  getReadClient() {
    return this.getOptimizedClient('read')
  }
  
  getWriteClient() {
    return this.getOptimizedClient('write')
  }
}

export const dbManager = new DatabaseManager()

// ============================================================================
// RATE LIMITING (Prevent abuse)
// ============================================================================

class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  async isRateLimited(userId: string, maxRequests: number = 100, windowMs: number = 60000): Promise<boolean> {
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Get user's requests
    const userRequests = this.requests.get(userId) || []
    
    // Remove old requests
    const recentRequests = userRequests.filter(time => time > windowStart)
    
    // Check if over limit
    if (recentRequests.length >= maxRequests) {
      return true
    }
    
    // Add current request
    recentRequests.push(now)
    this.requests.set(userId, recentRequests)
    
    return false
  }
  
  // Clean up old data periodically
  cleanup() {
    const now = Date.now()
    const oneHourAgo = now - 3600000
    
    for (const [userId, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => time > oneHourAgo)
      if (recentRequests.length === 0) {
        this.requests.delete(userId)
      } else {
        this.requests.set(userId, recentRequests)
      }
    }
  }
}

export const rateLimiter = new RateLimiter()

// Clean up every 10 minutes
setInterval(() => rateLimiter.cleanup(), 600000)

// ============================================================================
// BACKGROUND JOBS (Process heavy tasks)
// ============================================================================

class BackgroundJobManager {
  private jobs: Map<string, any> = new Map()
  
  // Queue image processing, email sending, etc.
  async queueJob(jobType: string, data: any, delay: number = 0) {
    const jobId = `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    setTimeout(async () => {
      try {
        await this.processJob(jobType, data)
        this.jobs.delete(jobId)
      } catch (error) {
        console.error(`Background job failed: ${jobType}`, error)
        // Implement retry logic here
      }
    }, delay)
    
    this.jobs.set(jobId, { type: jobType, data, createdAt: new Date() })
    return jobId
  }
  
  private async processJob(jobType: string, data: any) {
    switch (jobType) {
      case 'create_community_post':
        // Process community post creation in background
        break
      case 'update_user_stats':
        // Update user statistics
        break
      case 'send_notification':
        // Send push notifications
        break
      default:
        console.warn(`Unknown job type: ${jobType}`)
    }
  }
  
  getJobStatus(jobId: string) {
    return this.jobs.get(jobId)
  }
}

export const jobManager = new BackgroundJobManager()

// ============================================================================
// MONITORING & ANALYTICS
// ============================================================================

class PerformanceMonitor {
  private metrics: Map<string, any[]> = new Map()
  
  trackApiCall(endpoint: string, duration: number, success: boolean) {
    const key = `api:${endpoint}`
    const metrics = this.metrics.get(key) || []
    
    metrics.push({
      duration,
      success,
      timestamp: Date.now()
    })
    
    // Keep only last 1000 entries
    if (metrics.length > 1000) {
      metrics.shift()
    }
    
    this.metrics.set(key, metrics)
  }
  
  trackDatabaseQuery(query: string, duration: number) {
    const key = `db:${query}`
    const metrics = this.metrics.get(key) || []
    
    metrics.push({
      duration,
      timestamp: Date.now()
    })
    
    if (metrics.length > 500) {
      metrics.shift()
    }
    
    this.metrics.set(key, metrics)
  }
  
  getMetrics(key: string) {
    return this.metrics.get(key) || []
  }
  
  getAverageResponseTime(key: string): number {
    const metrics = this.metrics.get(key) || []
    if (metrics.length === 0) return 0
    
    const total = metrics.reduce((sum, metric) => sum + metric.duration, 0)
    return total / metrics.length
  }
  
  getErrorRate(key: string): number {
    const metrics = this.metrics.get(key) || []
    if (metrics.length === 0) return 0
    
    const errors = metrics.filter(metric => !metric.success).length
    return (errors / metrics.length) * 100
  }
}

export const performanceMonitor = new PerformanceMonitor()

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

export async function healthCheck() {
  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {} as any
  }
  
  try {
    // Check database
    const dbStart = Date.now()
    await dbManager.getReadClient().from('profiles').select('id').limit(1)
    health.services.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    }
  } catch (error) {
    health.services.database = {
      status: 'unhealthy',
      error: error.message
    }
    health.status = 'degraded'
  }
  
  try {
    // Check cache
    await cacheManager.connect()
    health.services.cache = {
      status: 'healthy'
    }
  } catch (error) {
    health.services.cache = {
      status: 'unhealthy',
      error: error.message
    }
  }
  
  return health
}

// Export for middleware usage
export { cacheManager, dbManager, rateLimiter, jobManager, performanceMonitor }