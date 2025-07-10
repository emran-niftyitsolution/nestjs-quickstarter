import { HydratedDocument } from 'mongoose';
import { CreateUserInput } from '../../user/dto/create-user.input';
import { PaginatedUsersResponse } from '../../user/dto/paginated-users.response';
import { UpdateUserInput } from '../../user/dto/update-user.input';
import { User } from '../../user/user.schema';
import { PaginationInput } from '../dto/pagination.dto';

/**
 * Interface for user CRUD operations
 * Follows Interface Segregation Principle - focused on user data management only
 */
export interface IUserRepository {
  /**
   * Create a new user
   */
  create(createUserInput: CreateUserInput): Promise<HydratedDocument<User>>;

  /**
   * Find user by ID
   */
  findById(id: string): Promise<HydratedDocument<User> | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<HydratedDocument<User> | null>;

  /**
   * Find user by provider ID
   */
  findByProviderId(
    provider: string,
    providerId: string,
  ): Promise<HydratedDocument<User> | null>;

  /**
   * Find all users with pagination
   */
  findAll(paginationInput: PaginationInput): Promise<PaginatedUsersResponse>;

  /**
   * Update user by ID
   */
  update(
    id: string,
    updateUserInput: UpdateUserInput,
  ): Promise<HydratedDocument<User> | null>;

  /**
   * Delete user by ID
   */
  remove(id: string): Promise<boolean>;

  /**
   * Check if email exists
   */
  emailExists(email: string): Promise<boolean>;
}

/**
 * Interface for user business logic operations
 * Separated from repository to follow Single Responsibility Principle
 */
export interface IUserService {
  /**
   * Create user with validation and business rules
   */
  createUser(createUserInput: CreateUserInput): Promise<HydratedDocument<User>>;

  /**
   * Get user profile by ID
   */
  getUserProfile(id: string): Promise<HydratedDocument<User>>;

  /**
   * Update user profile
   */
  updateUserProfile(
    id: string,
    updateUserInput: UpdateUserInput,
  ): Promise<HydratedDocument<User>>;

  /**
   * Deactivate user account
   */
  deactivateUser(id: string): Promise<boolean>;

  /**
   * Get paginated users list
   */
  getUsers(paginationInput: PaginationInput): Promise<PaginatedUsersResponse>;
}
