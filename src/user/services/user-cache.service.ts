import { Injectable } from '@nestjs/common';
import { CacheService } from '../../common/services/cache.service';
import { IUserCacheService } from '../interfaces/user-services.interface';
import { User, UserDocument } from '../user.schema';

/**
 * User Cache Service implementing Single Responsibility Principle
 *
 * ONLY responsible for:
 * - Caching individual users
 * - Caching users by email/username lookups
 * - Cache invalidation strategies
 * - Cache key management
 *
 * Does NOT handle:
 * - Database operations (delegated to other services)
 * - Business logic (delegated to orchestrator)
 * - Password operations (delegated to UserPasswordService)
 */
@Injectable()
export class UserCacheService implements IUserCacheService {
  private readonly USER_CACHE_TTL = 600; // 10 minutes
  private readonly AUTH_CACHE_TTL = 300; // 5 minutes for auth lookups
  private readonly LIST_CACHE_TTL = 60; // 1 minute for lists

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Get cached user by ID
   */
  async getCachedUser(id: string): Promise<User | null> {
    const cacheKey = this.cacheService.getUserKey(id);
    return this.cacheService.get<User>(cacheKey);
  }

  /**
   * Set cached user by ID
   */
  async setCachedUser(user: User): Promise<void> {
    const cacheKey = this.cacheService.getUserKey(user._id);
    await this.cacheService.set(cacheKey, user, this.USER_CACHE_TTL);
  }

  /**
   * Get cached user by email
   */
  async getCachedUserByEmail(email: string): Promise<UserDocument | null> {
    const cacheKey = this.cacheService.getAuthKey(`email:${email}`);
    return this.cacheService.get<UserDocument>(cacheKey);
  }

  /**
   * Set cached user by email lookup
   */
  async setCachedUserByEmail(email: string, user: UserDocument): Promise<void> {
    const cacheKey = this.cacheService.getAuthKey(`email:${email}`);
    await this.cacheService.set(cacheKey, user, this.AUTH_CACHE_TTL);
  }

  /**
   * Get cached user by username
   */
  async getCachedUserByUsername(
    username: string,
  ): Promise<UserDocument | null> {
    const cacheKey = this.cacheService.getAuthKey(`username:${username}`);
    return this.cacheService.get<UserDocument>(cacheKey);
  }

  /**
   * Set cached user by username lookup
   */
  async setCachedUserByUsername(
    username: string,
    user: UserDocument,
  ): Promise<void> {
    const cacheKey = this.cacheService.getAuthKey(`username:${username}`);
    await this.cacheService.set(cacheKey, user, this.AUTH_CACHE_TTL);
  }

  /**
   * Invalidate user cache by ID
   */
  async invalidateUserCache(id: string): Promise<void> {
    const cacheKey = this.cacheService.getUserKey(id);
    await this.cacheService.del(cacheKey);
  }

  /**
   * Invalidate user cache by email
   */
  async invalidateUserCacheByEmail(email: string): Promise<void> {
    const cacheKey = this.cacheService.getAuthKey(`email:${email}`);
    await this.cacheService.del(cacheKey);
  }

  /**
   * Invalidate user cache by username
   */
  async invalidateUserCacheByUsername(username: string): Promise<void> {
    const cacheKey = this.cacheService.getAuthKey(`username:${username}`);
    await this.cacheService.del(cacheKey);
  }

  /**
   * Invalidate all user list caches
   * Used when user data changes that might affect paginated results
   * Note: Since we don't have pattern deletion, we clear specific pagination caches
   */
  async invalidateListCaches(): Promise<void> {
    // For now, we'll clear common pagination cache keys
    // In a real implementation, you might want to track cache keys or use Redis pattern deletion
    const commonKeys = [
      'pagination:users:page:1:limit:10',
      'pagination:users:page:1:limit:20',
      'pagination:users:page:1:limit:50',
    ];

    await this.cacheService.mdel(commonKeys);
  }

  /**
   * Cache user with automatic lookup cache updates
   * Helps maintain consistency across different lookup methods
   */
  async cacheUserWithLookups(user: UserDocument): Promise<void> {
    // Cache by ID
    const cacheKey = this.cacheService.getUserKey(user._id);
    await this.cacheService.set(cacheKey, user, this.USER_CACHE_TTL);

    // Cache by email if available
    if (user.email) {
      await this.setCachedUserByEmail(user.email, user);
    }

    // Cache by username if available
    if (user.username) {
      await this.setCachedUserByUsername(user.username, user);
    }
  }

  /**
   * Invalidate all caches for a user
   * Used when user is updated or deleted
   */
  async invalidateAllUserCaches(user: User | UserDocument): Promise<void> {
    // Invalidate by ID
    if (user._id) {
      await this.invalidateUserCache(user._id);
    }

    // Invalidate by email
    if (user.email) {
      await this.invalidateUserCacheByEmail(user.email);
    }

    // Invalidate by username
    if (user.username) {
      await this.invalidateUserCacheByUsername(user.username);
    }

    // Invalidate list caches
    await this.invalidateListCaches();
  }
}
