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
    const idListKey = CACHE_KEYS.userCollections(userId) + ':ids';
    // Try cache for ID list first
    const cachedIds = await CacheManager.get(idListKey);
    let collections = [];
    if (Array.isArray(cachedIds) && cachedIds.length > 0) {
      // Try to get each collection chunk
      for (const id of cachedIds) {
        const chunk = await CacheManager.get(`user:${userId}:collection:${id}`);
        if (chunk) collections.push(chunk);
      }
      if (collections.length === cachedIds.length) {
        console.log(`[UserCache] Chunked cache hit for user collections: ${userId}`);
        return collections;
      }
      // If partial, fall through to DB fetch
    }

    // Cache miss or partial - fetch from database
    console.log(`[UserCache] Cache miss for user collections: ${userId}`);
    const dbCollections = await getCollections(userId);
    // Prune and cache each collection as a chunk
    const minimalCollections = (dbCollections || []).map((col: any) => {
      // Only cache a preview of up to 6 items, never the full array
      let previewItems = [];
      if (Array.isArray(col.items)) {
        previewItems = col.items.slice(0, 6).map((item: any) => ({
          id: item.id,
          title: item.title,
          image_url: (typeof item.image_url === 'string' && item.image_url.length < 500 && !item.image_url.includes('data:image')) ? item.image_url : null
        }));
      }
      // Truncate description if too long
      let desc = typeof col.description === 'string' ? col.description.slice(0, 300) : '';
      return {
        id: col.id,
        name: col.name,
        color: col.color,
        createdAt: col.createdAt,
        description: desc,
        customBanner: col.customBanner,
        isPublic: !!col.isPublic,
        itemCount: Array.isArray(col.itemIds) ? col.itemIds.length : 0,
        items: previewItems
      };
    });
    // Cache each collection chunk and the ID list
    const ids = minimalCollections.map((c: any) => c.id);
    await CacheManager.set(idListKey, ids, CACHE_TTL.USER_COLLECTIONS);
    for (const col of minimalCollections) {
      await CacheManager.set(`user:${userId}:collection:${col.id}`, col, CACHE_TTL.USER_COLLECTIONS);
    }
    console.log(`[UserCache] Cached user collections in chunks: ${userId} (${minimalCollections.length} collections)`);
    return minimalCollections;
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
