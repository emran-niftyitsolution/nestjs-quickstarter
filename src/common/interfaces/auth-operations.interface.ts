import { HydratedDocument } from 'mongoose';
import { AuthResponse } from '../../auth/dto/auth.response';
import { LoginInput } from '../../auth/dto/login.input';
import { RegisterInput } from '../../auth/dto/register.input';
import { User } from '../../user/user.schema';

/**
 * Interface for password operations
 * Follows Single Responsibility Principle - only handles password-related operations
 */
export interface IPasswordService {
  /**
   * Hash a plain text password
   */
  hashPassword(password: string): Promise<string>;

  /**
   * Verify a password against its hash
   */
  verifyPassword(password: string, hash: string): Promise<boolean>;

  /**
   * Generate a secure random password
   */
  generateRandomPassword(length?: number): string;

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): boolean;
}

/**
 * Interface for JWT token operations
 * Follows Single Responsibility Principle - only handles token-related operations
 */
export interface ITokenService {
  /**
   * Generate JWT access token
   */
  generateAccessToken(payload: any): string;

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(payload: any): string;

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): any;

  /**
   * Extract user ID from token
   */
  extractUserIdFromToken(token: string): string;

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean;
}

/**
 * Interface for authentication business logic
 * Follows Interface Segregation Principle - focused on auth operations
 */
export interface IAuthService {
  /**
   * Register a new user
   */
  register(registerInput: RegisterInput): Promise<AuthResponse>;

  /**
   * Login with email and password
   */
  login(loginInput: LoginInput): Promise<AuthResponse>;

  /**
   * Refresh access token using refresh token
   */
  refreshToken(refreshToken: string): Promise<AuthResponse>;

  /**
   * Logout user (invalidate tokens)
   */
  logout(userId: string): Promise<boolean>;

  /**
   * Validate user credentials
   */
  validateUser(
    email: string,
    password: string,
  ): Promise<HydratedDocument<User> | null>;
}

/**
 * Interface for OAuth operations
 * Follows Interface Segregation Principle - separated from main auth service
 */
export interface IOAuthService {
  /**
   * Handle Google OAuth login
   */
  googleLogin(user: any): Promise<AuthResponse>;

  /**
   * Handle GitHub OAuth login
   */
  githubLogin(user: any): Promise<AuthResponse>;

  /**
   * Link OAuth account to existing user
   */
  linkOAuthAccount(
    userId: string,
    provider: string,
    providerId: string,
  ): Promise<boolean>;

  /**
   * Unlink OAuth account from user
   */
  unlinkOAuthAccount(userId: string, provider: string): Promise<boolean>;
}

/**
 * Interface for session management
 * Follows Single Responsibility Principle - only handles session operations
 */
export interface ISessionService {
  /**
   * Create user session
   */
  createSession(userId: string, metadata?: any): Promise<string>;

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Promise<any>;

  /**
   * Update session
   */
  updateSession(sessionId: string, data: any): Promise<boolean>;

  /**
   * Delete session
   */
  deleteSession(sessionId: string): Promise<boolean>;

  /**
   * Delete all user sessions
   */
  deleteAllUserSessions(userId: string): Promise<boolean>;

  /**
   * Check if session is valid
   */
  isSessionValid(sessionId: string): Promise<boolean>;
}
