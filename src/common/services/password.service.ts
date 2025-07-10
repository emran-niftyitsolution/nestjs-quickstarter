import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { IPasswordService } from '../interfaces/auth-operations.interface';

/**
 * Password service implementing Single Responsibility Principle
 * Only responsible for password-related operations
 */
@Injectable()
export class PasswordService implements IPasswordService {
  private readonly passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  /**
   * Hash a plain text password using Argon2
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64 MB
        timeCost: 3,
        parallelism: 1,
      });
    } catch (error) {
      throw new Error(
        `Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Generate a secure random password
   */
  generateRandomPassword(length: number = 12): string {
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
    let password = '';

    // Ensure at least one character from each required category
    password += this.getRandomChar('abcdefghijklmnopqrstuvwxyz'); // lowercase
    password += this.getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ'); // uppercase
    password += this.getRandomChar('0123456789'); // number
    password += this.getRandomChar('@$!%*?&'); // special character

    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(charset);
    }

    // Shuffle the password to avoid predictable patterns
    return this.shuffleString(password);
  }

  /**
   * Validate password strength
   * Must contain: 8+ chars, uppercase, lowercase, number, special character
   */
  validatePasswordStrength(password: string): boolean {
    return this.passwordRegex.test(password);
  }

  /**
   * Get random character from charset
   */
  private getRandomChar(charset: string): string {
    return charset.charAt(Math.floor(Math.random() * charset.length));
  }

  /**
   * Shuffle string characters randomly
   */
  private shuffleString(str: string): string {
    return str
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');
  }
}
