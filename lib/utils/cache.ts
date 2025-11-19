/**
 * Simple in-memory cache with TTL (Time To Live)
 * Helps reduce API calls and improve performance
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map()

  /**
   * Get data from cache if not expired
   * @param key Cache key
   * @returns Cached data or null if expired/missing
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      // Expired - remove from cache
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Set data in cache with TTL
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }
}

// Export singleton instance
export const cache = new SimpleCache()

// Common cache keys
export const CACHE_KEYS = {
  STARTUPS: 'startups',
  USER_PROFILE: (userId: string) => `user:${userId}`,
  USER_HOLDINGS: (userId: string) => `holdings:${userId}`,
  LEADERBOARD: 'leaderboard',
  STARTUP: (startupId: string) => `startup:${startupId}`,
}

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 2 * 60 * 1000, // 2 minutes
  LONG: 5 * 60 * 1000, // 5 minutes
  VERY_LONG: 15 * 60 * 1000, // 15 minutes
}

