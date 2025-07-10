import { Injectable } from '@nestjs/common';
import { PaginationInput } from '../common/dto/pagination.dto';
import { CreateUserInput } from './dto/create-user.input';
import { PaginatedUsersResponse } from './dto/paginated-users.response';
import { UpdateUserInput } from './dto/update-user.input';
import { IUserService } from './interfaces/user-services.interface';
import { UserCacheService } from './services/user-cache.service';
import { UserCrudService } from './services/user-crud.service';
import { UserPasswordService } from './services/user-password.service';
import { UserQueryService } from './services/user-query.service';
import { AuthProvider, User, UserDocument } from './user.schema';

/**
 * User Service Orchestrator implementing SOLID principles:
 *
 * - Single Responsibility: Orchestrates user operations by delegating to focused services
 * - Open/Closed: Can be extended by adding new service dependencies without modification
 * - Liskov Substitution: Implements IUserService interface, can be substituted
 * - Interface Segregation: Depends on focused service interfaces
 * - Dependency Inversion: Depends on abstractions (service interfaces), not concretions
 *
 * This orchestrator coordinates between:
 * - UserCrudService: Basic CRUD operations
 * - UserQueryService: Complex queries and searches
 * - UserCacheService: Caching and cache invalidation
 * - UserPasswordService: Password management
 */
@Injectable()
export class UserService implements IUserService {
  constructor(
    private readonly crudService: UserCrudService,
    private readonly queryService: UserQueryService,
    private readonly cacheService: UserCacheService,
    private readonly passwordService: UserPasswordService,
  ) {}

  // ========================================
  // CRUD Operations (delegated to UserCrudService)
  // ========================================

  /**
   * Create a new user with caching
   */
  async create(createUserInput: CreateUserInput): Promise<User> {
    // Delegate to CRUD service
    const user = await this.crudService.create(createUserInput);

    // Cache the new user
    await this.cacheService.cacheUserWithLookups(user);

    // Invalidate list caches since a new user was added
    await this.cacheService.invalidateListCaches();

    return user;
  }

  /**
   * Find user by ID with caching
   */
  async findOne(id: string): Promise<User | null> {
    // Try cache first
    const cachedUser = await this.cacheService.getCachedUser(id);
    if (cachedUser) {
      return cachedUser;
    }

    // Get from database
    const user = await this.crudService.findOne(id);
    if (user) {
      await this.cacheService.cacheUserWithLookups(user);
    }

    return user;
  }

  /**
   * Update user with cache invalidation
   */
  async update(id: string, updateUserInput: UpdateUserInput): Promise<User> {
    // Get current user for cache invalidation
    const currentUser = await this.crudService.findOne(id);

    // Delegate to CRUD service
    const updatedUser = await this.crudService.update(id, updateUserInput);

    // Invalidate old caches
    if (currentUser) {
      await this.cacheService.invalidateAllUserCaches(currentUser);
    }

    // Cache updated user
    await this.cacheService.cacheUserWithLookups(updatedUser);

    return updatedUser;
  }

  /**
   * Remove user with cache cleanup
   */
  async remove(id: string): Promise<boolean> {
    // Get user for cache cleanup
    const user = await this.crudService.findOne(id);

    // Delegate to CRUD service
    const removed = await this.crudService.remove(id);

    if (removed && user) {
      // Clean up all caches
      await this.cacheService.invalidateAllUserCaches(user);
    }

    return removed;
  }

  // ========================================
  // Query Operations (delegated to UserQueryService)
  // ========================================

  /**
   * Find all users with pagination and caching
   */
  async findAll(
    paginationInput: PaginationInput,
  ): Promise<PaginatedUsersResponse> {
    // For now, skip caching for pagination queries since we need direct cache access
    // In a proper implementation, we'd add a method to UserCacheService for this

    // Delegate to query service
    const result = await this.queryService.findAll(paginationInput);

    // Note: Pagination caching would be handled by a dedicated method in UserCacheService

    return result;
  }

  /**
   * Find user by email with caching
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    // Try cache first
    const cachedUser = await this.cacheService.getCachedUserByEmail(email);
    if (cachedUser) {
      return cachedUser;
    }

    // Delegate to query service
    const user = await this.queryService.findByEmail(email);

    // Cache the result
    if (user) {
      await this.cacheService.setCachedUserByEmail(email, user);
    }

    return user;
  }

  /**
   * Find user by username with caching
   */
  async findByUsername(username: string): Promise<UserDocument | null> {
    // Try cache first
    const cachedUser =
      await this.cacheService.getCachedUserByUsername(username);
    if (cachedUser) {
      return cachedUser;
    }

    // Delegate to query service
    const user = await this.queryService.findByUsername(username);

    // Cache the result
    if (user) {
      await this.cacheService.setCachedUserByUsername(username, user);
    }

    return user;
  }

  /**
   * Find user by OAuth provider
   */
  async findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<UserDocument | null> {
    // Delegate to query service (OAuth lookups are typically not cached)
    return this.queryService.findByProvider(provider, providerId);
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<UserDocument | null> {
    // Delegate to query service (token lookups should not be cached)
    return this.queryService.findByPasswordResetToken(token);
  }

  // ========================================
  // Password Operations (delegated to UserPasswordService)
  // ========================================

  /**
   * Verify password
   */
  async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return this.passwordService.verifyPassword(
      plainTextPassword,
      hashedPassword,
    );
  }

  /**
   * Update password with cache invalidation
   */
  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const result = await this.passwordService.updatePassword(
      userId,
      newPassword,
    );

    if (result) {
      // Invalidate user cache since password changed
      await this.cacheService.invalidateUserCache(userId);
    }

    return result;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.passwordService.updateLastLogin(userId);

    // Invalidate user cache to reflect updated lastLogin
    await this.cacheService.invalidateUserCache(userId);
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.passwordService.setPasswordResetToken(userId, token, expires);

    // Invalidate user cache
    await this.cacheService.invalidateUserCache(userId);
  }

  /**
   * Clear password reset token
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.passwordService.clearPasswordResetToken(userId);

    // Invalidate user cache
    await this.cacheService.invalidateUserCache(userId);
  }
}
