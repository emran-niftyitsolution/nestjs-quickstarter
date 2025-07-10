import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { Model } from 'mongoose';
import { IUserPasswordService } from '../interfaces/user-services.interface';
import { User, UserDocument } from '../user.schema';

/**
 * User Password Service implementing Single Responsibility Principle
 *
 * ONLY responsible for:
 * - Password verification
 * - Password updating
 * - Password reset token management
 * - Last login tracking
 *
 * Does NOT handle:
 * - User CRUD operations (delegated to UserCrudService)
 * - Complex queries (delegated to UserQueryService)
 * - Caching (delegated to UserCacheService)
 */
@Injectable()
export class UserPasswordService implements IUserPasswordService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Verify a plain text password against a hashed password
   */
  async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(hashedPassword, plainTextPassword);
    } catch (error) {
      // Log error but don't throw - return false for security
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Update user password with new hashed password
   */
  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await argon2.hash(newPassword);

      const result = await this.userModel
        .findByIdAndUpdate(
          userId,
          {
            password: hashedPassword,
            // Clear any existing password reset token when password is changed
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
          },
          { new: true },
        )
        .exec();

      return !!result;
    } catch (error) {
      console.error('Password update error:', error);
      return false;
    }
  }

  /**
   * Update the last login timestamp for a user
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.userModel
        .findByIdAndUpdate(userId, { lastLogin: new Date() }, { new: true })
        .exec();
    } catch (error) {
      // Log error but don't throw - this is not critical functionality
      console.error('Last login update error:', error);
    }
  }

  /**
   * Set password reset token and expiration
   */
  async setPasswordResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    try {
      await this.userModel
        .findByIdAndUpdate(
          userId,
          {
            passwordResetToken: token,
            passwordResetExpires: expires,
          },
          { new: true },
        )
        .exec();
    } catch (error) {
      console.error('Password reset token set error:', error);
      throw new Error('Failed to set password reset token');
    }
  }

  /**
   * Clear password reset token and expiration
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    try {
      await this.userModel
        .findByIdAndUpdate(
          userId,
          {
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
          },
          { new: true },
        )
        .exec();
    } catch (error) {
      console.error('Password reset token clear error:', error);
      throw new Error('Failed to clear password reset token');
    }
  }

  /**
   * Validate if a password meets security requirements
   * Helper method for additional password validation
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Hash a password using Argon2
   * Utility method for password hashing
   */
  async hashPassword(plainTextPassword: string): Promise<string> {
    try {
      return await argon2.hash(plainTextPassword);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }
}
