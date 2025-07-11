import { PaginationInput } from '../../common/dto/pagination.dto';
import { CreateUserInput } from '../dto/create-user.input';
import { PaginatedUsersResponse } from '../dto/paginated-users.response';
import { UpdateUserInput } from '../dto/update-user.input';
import { AuthProvider, User, UserDocument } from '../user.schema';

/**
 * Interface Segregation Principle - Focused interfaces for user operations
 */

/**
 * User CRUD Operations Interface
 * Single Responsibility: Basic Create, Read, Update, Delete operations
 */
export interface IUserCrudService {
  create(createUserInput: CreateUserInput): Promise<User>;
  findOne(id: string): Promise<User | null>;
  update(id: string, updateUserInput: UpdateUserInput): Promise<User>;
  remove(id: string): Promise<boolean>;
}

/**
 * User Query Operations Interface
 * Single Responsibility: Complex queries and searches
 */
export interface IUserQueryService {
  findAll(paginationInput: PaginationInput): Promise<PaginatedUsersResponse>;
  findByEmail(email: string): Promise<UserDocument | null>;
  findByUsername(username: string): Promise<UserDocument | null>;
  findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<UserDocument | null>;
  findByPasswordResetToken(token: string): Promise<UserDocument | null>;
}

/**
 * User Cache Operations Interface
 * Single Responsibility: Caching and cache invalidation
 */
export interface IUserCacheService {
  getCachedUser(id: string): Promise<User | null>;
  setCachedUser(user: UserDocument): Promise<void>;
  getCachedUserByEmail(email: string): Promise<UserDocument | null>;
  setCachedUserByEmail(email: string, user: UserDocument): Promise<void>;
  getCachedUserByUsername(username: string): Promise<UserDocument | null>;
  setCachedUserByUsername(username: string, user: UserDocument): Promise<void>;
  invalidateUserCache(id: string): Promise<void>;
  invalidateUserCacheByEmail(email: string): Promise<void>;
  invalidateUserCacheByUsername(username: string): Promise<void>;
  invalidateListCaches(): Promise<void>;
  cacheUserWithLookups(user: User | UserDocument): Promise<void>;
  invalidateAllUserCaches(user: User | UserDocument): Promise<void>;
}

/**
 * User Password Operations Interface
 * Single Responsibility: Password management and validation
 */
export interface IUserPasswordService {
  verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
  updatePassword(userId: string, newPassword: string): Promise<boolean>;
  updateLastLogin(userId: string): Promise<void>;
  setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void>;
  clearPasswordResetToken(userId: string): Promise<void>;
}

/**
 * Main User Service Interface
 * Orchestrates other services following Single Responsibility and Dependency Inversion
 */
export interface IUserService extends IUserCrudService {
  // Delegated methods from other services
  findAll(paginationInput: PaginationInput): Promise<PaginatedUsersResponse>;
  findByEmail(email: string): Promise<UserDocument | null>;
  findByUsername(username: string): Promise<UserDocument | null>;
  findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<UserDocument | null>;
  verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
  updatePassword(userId: string, newPassword: string): Promise<boolean>;
  updateLastLogin(userId: string): Promise<void>;
  setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void>;
  findByPasswordResetToken(token: string): Promise<UserDocument | null>;
  clearPasswordResetToken(userId: string): Promise<void>;
}
