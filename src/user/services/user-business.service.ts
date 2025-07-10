import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HydratedDocument } from 'mongoose';
import { PaginationInput } from '../../common/dto/pagination.dto';
import { IPasswordService } from '../../common/interfaces/auth-operations.interface';
import {
  IUserRepository,
  IUserService,
} from '../../common/interfaces/user-operations.interface';
import { CreateUserInput } from '../dto/create-user.input';
import { PaginatedUsersResponse } from '../dto/paginated-users.response';
import { UpdateUserInput } from '../dto/update-user.input';
import { User, UserRole } from '../user.schema';

/**
 * User Business Service implementing SOLID principles:
 * - Single Responsibility: Only handles user business logic
 * - Open/Closed: Open for extension, closed for modification
 * - Liskov Substitution: Implements IUserService interface
 * - Interface Segregation: Uses focused interfaces
 * - Dependency Inversion: Depends on abstractions, not concretions
 */
@Injectable()
export class UserBusinessService implements IUserService {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IPasswordService')
    private readonly passwordService: IPasswordService,
  ) {}

  /**
   * Create new user with business validation
   * Implements Single Responsibility Principle
   */
  async createUser(
    createUserInput: CreateUserInput,
  ): Promise<HydratedDocument<User>> {
    // Business rule: Check if email already exists
    const emailExists = await this.userRepository.emailExists(
      createUserInput.email,
    );
    if (emailExists) {
      throw new ConflictException('Email already exists');
    }

    // Business rule: Hash password
    let hashedPassword: string | undefined;
    if (createUserInput.password) {
      if (
        !this.passwordService.validatePasswordStrength(createUserInput.password)
      ) {
        throw new ConflictException(
          'Password does not meet strength requirements',
        );
      }
      hashedPassword = await this.passwordService.hashPassword(
        createUserInput.password,
      );
    }

    // Business rule: Set default values with proper types
    const userData = {
      ...createUserInput,
      password: hashedPassword,
      isActive: true,
      isEmailVerified: false,
      role: createUserInput.role || UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.userRepository.create(userData as CreateUserInput);
  }

  /**
   * Get user profile by ID
   * Implements Single Responsibility Principle
   */
  async getUserProfile(id: string): Promise<HydratedDocument<User>> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Business rule: Don't return sensitive data
    user.password = undefined;
    return user;
  }

  /**
   * Update user profile
   * Implements business validation rules
   */
  async updateUserProfile(
    id: string,
    updateUserInput: UpdateUserInput,
  ): Promise<HydratedDocument<User>> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Create a copy of update input to modify
    const updateData = { ...updateUserInput };

    // Business rule: Hash new password if provided (not supported in current UpdateUserInput)
    // This would require extending the DTO or handling separately

    const updatedUser = await this.userRepository.update(id, updateData);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    // Business rule: Don't return sensitive data
    updatedUser.password = undefined;
    return updatedUser;
  }

  /**
   * Deactivate user account
   * Implements soft delete business logic
   */
  async deactivateUser(id: string): Promise<boolean> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Business rule: Implement soft delete
    return await this.userRepository.remove(id);
  }

  /**
   * Get paginated users list
   * Implements business filtering and sorting
   */
  async getUsers(
    paginationInput: PaginationInput,
  ): Promise<PaginatedUsersResponse> {
    // Business rule: Apply default sorting
    if (!paginationInput.sortBy) {
      paginationInput.sortBy = 'createdAt';
      paginationInput.sortOrder = 'desc';
    }

    // Business rule: Limit maximum page size
    if (paginationInput.limit && paginationInput.limit > 100) {
      paginationInput.limit = 100;
    }

    const result = await this.userRepository.findAll(paginationInput);

    // Business rule: Remove sensitive data from results
    if (result.docs) {
      result.docs.forEach((user) => {
        user.password = undefined;
      });
    }

    return result;
  }

  /**
   * Additional business methods demonstrating Open/Closed Principle
   * These extend functionality without modifying existing code
   */

  /**
   * Get user statistics
   */
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    verifiedUsers: number;
  }> {
    // This could be implemented using the repository's advanced methods
    // Demonstrates how business logic can be extended
    return Promise.resolve({
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      verifiedUsers: 0,
    });
  }

  /**
   * Verify user email
   */
  async verifyUserEmail(id: string): Promise<boolean> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create update input with required id field
    const updateInput: UpdateUserInput = {
      id,
      isEmailVerified: true,
    };

    const updated = await this.userRepository.update(id, updateInput);
    return !!updated;
  }

  /**
   * Change user role
   */
  async changeUserRole(
    id: string,
    newRole: UserRole,
  ): Promise<HydratedDocument<User>> {
    // Business rule: Validate role
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(newRole)) {
      throw new ConflictException('Invalid role');
    }

    const updateInput: UpdateUserInput = {
      id,
      role: newRole,
    };

    const updated = await this.userRepository.update(id, updateInput);

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    updated.password = undefined;
    return updated;
  }

  /**
   * Get user by email (business method)
   */
  async getUserByEmail(email: string): Promise<HydratedDocument<User> | null> {
    const user = await this.userRepository.findByEmail(email);
    if (user) {
      user.password = undefined;
    }
    return user;
  }
}
