import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

/**
 * Cache Service implementing SOLID principles:
 * - Single Responsibility: Only handles caching operations
 * - Open/Closed: Extensible through method composition
 * - Dependency Inversion: Depends on cache manager abstraction
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
      } else {
        this.logger.debug(`Cache miss for key: ${key}`);
      }
      return value || null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(
        `Cache set for key: ${key}${ttl ? ` with TTL: ${ttl}s` : ''}`,
      );
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Get or set pattern - if value doesn't exist, compute and cache it
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T | null> {
    try {
      // Try to get from cache first
      let value = await this.get<T>(key);

      if (value === null) {
        // If not in cache, compute the value
        value = await factory();
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
      }

      return value;
    } catch (error) {
      this.logger.error(`Cache getOrSet error for key ${key}:`, error);
      // If caching fails, still try to return the computed value
      try {
        return await factory();
      } catch (factoryError) {
        this.logger.error(
          `Factory function error for key ${key}:`,
          factoryError,
        );
        return null;
      }
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const results = await Promise.all(keys.map((key) => this.get<T>(key)));
      this.logger.debug(`Multi-get for ${keys.length} keys`);
      return results;
    } catch (error) {
      this.logger.error('Cache multi-get error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    try {
      await Promise.all(
        entries.map(({ key, value, ttl }) => this.set(key, value, ttl)),
      );
      this.logger.debug(`Multi-set for ${entries.length} keys`);
    } catch (error) {
      this.logger.error('Cache multi-set error:', error);
    }
  }

  /**
   * Delete multiple keys
   */
  async mdel(keys: string[]): Promise<void> {
    try {
      await Promise.all(keys.map((key) => this.del(key)));
      this.logger.debug(`Multi-delete for ${keys.length} keys`);
    } catch (error) {
      this.logger.error('Cache multi-delete error:', error);
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.cacheManager.get(key);
      return value !== undefined && value !== null;
    } catch (error) {
      this.logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Generate cache key for user-related data
   */
  getUserKey(userId: string, suffix?: string): string {
    return `user:${userId}${suffix ? `:${suffix}` : ''}`;
  }

  /**
   * Generate cache key for auth-related data
   */
  getAuthKey(identifier: string, suffix?: string): string {
    return `auth:${identifier}${suffix ? `:${suffix}` : ''}`;
  }

  /**
   * Generate cache key for API responses
   */
  getApiKey(endpoint: string, params?: string): string {
    return `api:${endpoint}${params ? `:${params}` : ''}`;
  }

  /**
   * Generate cache key with pagination
   */
  getPaginationKey(
    base: string,
    page: number,
    limit: number,
    filters?: string,
  ): string {
    return `${base}:page:${page}:limit:${limit}${filters ? `:${filters}` : ''}`;
  }
}
