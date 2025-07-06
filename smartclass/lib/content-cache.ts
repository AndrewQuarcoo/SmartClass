/**
 * Content Caching System for SmartClass
 * Provides intelligent caching for AI-generated content and quizzes
 */

import { AIContentCard, AIQuizQuestion } from '@/data/ai-content'

// Cache interfaces
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  accessCount: number
  lastAccessed: number
}

interface CacheKey {
  type: 'content' | 'quiz'
  topicId: string
  subtopicId: string
  subjectId: string
  gradeId: string
  quizType?: 'mid' | 'final'
  numCards?: number
}

interface CacheStats {
  totalEntries: number
  memoryUsage: number
  hitRate: number
  hits: number
  misses: number
}

class ContentCache {
  private cache = new Map<string, CacheEntry<any>>()
  private stats = {
    hits: 0,
    misses: 0
  }

  // Cache configuration
  private readonly DEFAULT_TTL = 30 * 60 * 1000 // 30 minutes
  private readonly MAX_ENTRIES = 100
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.startCleanupTimer()
  }

  /**
   * Generate cache key from parameters
   */
  private generateKey(params: CacheKey): string {
    const { type, topicId, subtopicId, subjectId, gradeId, quizType, numCards } = params
    const keyParts = [type, subjectId, gradeId, topicId, subtopicId]
    
    if (quizType) keyParts.push(quizType)
    if (numCards) keyParts.push(numCards.toString())
    
    return keyParts.join(':')
  }

  /**
   * Cache content with TTL
   */
  set<T>(params: CacheKey, data: T, ttl: number = this.DEFAULT_TTL): void {
    const key = this.generateKey(params)
    const now = Date.now()

    // Check if we need to evict entries
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.evictLeastRecentlyUsed()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessed: now
    }

    this.cache.set(key, entry)
    
    // Store in localStorage for persistence
    this.persistToStorage(key, entry)
  }

  /**
   * Retrieve content from cache
   */
  get<T>(params: CacheKey): T | null {
    const key = this.generateKey(params)
    const entry = this.cache.get(key)

    if (!entry) {
      // Try to load from localStorage
      const storedEntry = this.loadFromStorage<T>(key)
      if (storedEntry) {
        this.cache.set(key, storedEntry)
        return this.processHit(key, storedEntry)
      }
      
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.removeFromStorage(key)
      this.stats.misses++
      return null
    }

    return this.processHit(key, entry)
  }

  /**
   * Process cache hit
   */
  private processHit<T>(key: string, entry: CacheEntry<T>): T {
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.cache.set(key, entry)
    this.stats.hits++
    return entry.data
  }

  /**
   * Cache content for a topic
   */
  cacheContent(
    topicId: string,
    subtopicId: string,
    subjectId: string,
    gradeId: string,
    content: AIContentCard[],
    numCards: number = 5
  ): void {
    this.set({
      type: 'content',
      topicId,
      subtopicId,
      subjectId,
      gradeId,
      numCards
    }, content)
  }

  /**
   * Get cached content for a topic
   */
  getCachedContent(
    topicId: string,
    subtopicId: string,
    subjectId: string,
    gradeId: string,
    numCards: number = 5
  ): AIContentCard[] | null {
    return this.get({
      type: 'content',
      topicId,
      subtopicId,
      subjectId,
      gradeId,
      numCards
    })
  }

  /**
   * Cache quiz for a topic
   */
  cacheQuiz(
    topicId: string,
    subtopicId: string,
    subjectId: string,
    gradeId: string,
    quizType: 'mid' | 'final',
    quiz: AIQuizQuestion[]
  ): void {
    this.set({
      type: 'quiz',
      topicId,
      subtopicId,
      subjectId,
      gradeId,
      quizType
    }, quiz)
  }

  /**
   * Get cached quiz for a topic
   */
  getCachedQuiz(
    topicId: string,
    subtopicId: string,
    subjectId: string,
    gradeId: string,
    quizType: 'mid' | 'final'
  ): AIQuizQuestion[] | null {
    return this.get({
      type: 'quiz',
      topicId,
      subtopicId,
      subjectId,
      gradeId,
      quizType
    })
  }

  /**
   * Invalidate cache for a specific topic
   */
  invalidateTopic(topicId: string, subtopicId?: string): void {
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (key.includes(topicId) && (!subtopicId || key.includes(subtopicId))) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.removeFromStorage(key)
    })
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.clearStorage()
    this.stats.hits = 0
    this.stats.misses = 0
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    
    // Estimate memory usage
    let memoryUsage = 0
    for (const entry of this.cache.values()) {
      memoryUsage += JSON.stringify(entry.data).length
    }

    return {
      totalEntries: this.cache.size,
      memoryUsage: Math.round(memoryUsage / 1024), // KB
      hitRate: Math.round(hitRate * 100) / 100,
      hits: this.stats.hits,
      misses: this.stats.misses
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.removeFromStorage(oldestKey)
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key)
      this.removeFromStorage(key)
    })
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Persist cache entry to localStorage
   */
  private persistToStorage<T>(key: string, entry: CacheEntry<T>): void {
    try {
      const storageKey = `smartclass_cache_${key}`
      localStorage.setItem(storageKey, JSON.stringify(entry))
    } catch (error) {
      console.warn('Failed to persist cache to storage:', error)
    }
  }

  /**
   * Load cache entry from localStorage
   */
  private loadFromStorage<T>(key: string): CacheEntry<T> | null {
    try {
      const storageKey = `smartclass_cache_${key}`
      const stored = localStorage.getItem(storageKey)
      
      if (!stored) return null

      const entry: CacheEntry<T> = JSON.parse(stored)
      
      // Check if expired
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(storageKey)
        return null
      }

      return entry
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
      return null
    }
  }

  /**
   * Remove entry from localStorage
   */
  private removeFromStorage(key: string): void {
    try {
      const storageKey = `smartclass_cache_${key}`
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('Failed to remove cache from storage:', error)
    }
  }

  /**
   * Clear all cache from localStorage
   */
  private clearStorage(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('smartclass_cache_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear cache storage:', error)
    }
  }

  /**
   * Preload content for better UX
   */
  async preloadContent(
    contentLoader: (topicId: string, subtopicId: string, subjectId: string, gradeId: string) => Promise<AIContentCard[]>,
    topics: Array<{ topicId: string; subtopicId: string; subjectId: string; gradeId: string }>
  ): Promise<void> {
    const promises = topics.map(async ({ topicId, subtopicId, subjectId, gradeId }) => {
      // Skip if already cached
      if (this.getCachedContent(topicId, subtopicId, subjectId, gradeId)) {
        return
      }

      try {
        const content = await contentLoader(topicId, subtopicId, subjectId, gradeId)
        this.cacheContent(topicId, subtopicId, subjectId, gradeId, content)
      } catch (error) {
        console.warn(`Failed to preload content for ${topicId}/${subtopicId}:`, error)
      }
    })

    await Promise.all(promises)
  }
}

// Export singleton instance
export const contentCache = new ContentCache()

// Utility functions
export function getCachedContentOrFetch<T>(
  cacheKey: CacheKey,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    // Try cache first
    const cached = contentCache.get<T>(cacheKey)
    if (cached) {
      resolve(cached)
      return
    }

    // Fetch and cache
    try {
      const data = await fetchFn()
      contentCache.set(cacheKey, data, ttl)
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

export function withCache<T>(
  params: Omit<CacheKey, 'type'> & { type: 'content' | 'quiz' },
  fetchFn: () => Promise<T>
): Promise<T> {
  return getCachedContentOrFetch(params, fetchFn)
} 