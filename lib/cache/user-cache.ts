import { CacheManager, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { getUserProfile, getProfile, getCollections } from '@/lib/database-service-v2'

// Cached user profile operations
export class UserCache {
  /**
   * Get cached user profile with full database data
   */
  static async getUserProfile(userId: string) {
    const cacheKey = CACHE_KEYS.userProfile(userId)

    // Try cache first
    const cached = await CacheManager.get(cacheKey)
    if (cached) {
      console.log(`[UserCache] Cache hit for user profile: ${userId}`)
      return cached
    }

    // Cache miss - fetch from database
    console.log(`[UserCache] Cache miss for user profile: ${userId}`)
    const profile = await getUserProfile(userId)

    if (profile) {
      // Cache for 24 hours
      await CacheManager.set(cacheKey, profile, CACHE_TTL.USER_PROFILE)
      console.log(`[UserCache] Cached user profile: ${userId}`)
    }

    return profile
  }

  /**
   * Get cached user preferences (profile data JSONB field)
   */
  static async getUserPreferences(userId: string) {
    const cacheKey = `user:${userId}:preferences`

    // Try cache first
    const cached = await CacheManager.get(cacheKey)
    if (cached) {
      console.log(`[UserCache] Cache hit for user preferences: ${userId}`)
      return cached
    }

    // Cache miss - fetch from database
    console.log(`[UserCache] Cache miss for user preferences: ${userId}`)
    const preferences = await getProfile(userId)

    if (preferences) {
      // Cache for 1 hour (preferences change less frequently)
      await CacheManager.set(cacheKey, preferences, CACHE_TTL.USER_COLLECTIONS)
      console.log(`[UserCache] Cached user preferences: ${userId}`)
    }

    return preferences
  }

  /**
   * Get cached user collections
   */
  static async getUserCollections(userId: string) {
    const cacheKey = CACHE_KEYS.userCollections(userId)

    // Try cache first
    const cached = await CacheManager.get(cacheKey)
    if (cached) {
      console.log(`[UserCache] Cache hit for user collections: ${userId}`)
      return cached
    }

    // Cache miss - fetch from database
    console.log(`[UserCache] Cache miss for user collections: ${userId}`)
    const collections = await getCollections(userId)

    if (collections) {
      // Cache for 1 hour
      await CacheManager.set(cacheKey, collections, CACHE_TTL.USER_COLLECTIONS)
      console.log(`[UserCache] Cached user collections: ${userId} (${collections.length} collections)`)
    }

    return collections
  }

  /**
   * Invalidate all user-related cache
   */
  static async invalidateUserCache(userId: string) {
    console.log(`[UserCache] Invalidating cache for user: ${userId}`)
    await CacheManager.invalidateUserCache(userId)
  }

  /**
   * Update user profile and invalidate cache
   */
  static async updateUserProfile(userId: string, profileData: any) {
    // Update database first
    const { setProfile } = await import('@/lib/database-service-v2')
    await setProfile(userId, profileData)

    // Invalidate cache
    await this.invalidateUserCache(userId)

    console.log(`[UserCache] Updated and invalidated cache for user: ${userId}`)
  }

  /**
   * Check if user profile exists (lightweight cache check)
   */
  static async userExists(userId: string): Promise<boolean> {
    const profile = await this.getUserProfile(userId)
    return !!profile
  }
}

// Export convenience functions
export const getCachedUserProfile = UserCache.getUserProfile.bind(UserCache)
export const getCachedUserPreferences = UserCache.getUserPreferences.bind(UserCache)
export const getCachedUserCollections = UserCache.getUserCollections.bind(UserCache)
export const invalidateUserCache = UserCache.invalidateUserCache.bind(UserCache)
