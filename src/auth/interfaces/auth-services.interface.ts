import { AuthProvider, User, UserDocument } from '../../user/user.schema';
import { AuthResponse } from '../dto/auth.response';
import { LoginInput } from '../dto/login.input';
import { RegisterInput } from '../dto/register.input';
import { JwtPayload } from '../strategies/jwt.strategy';

/**
 * Interface Segregation Principle - Focused interfaces for authentication operations
 */

/**
 * Core Authentication Operations Interface
 * Single Responsibility: Basic authentication (login, register, profile)
 */
export interface IAuthCoreService {
  register(registerInput: RegisterInput): Promise<AuthResponse>;
  login(loginInput: LoginInput): Promise<AuthResponse>;
  validateUser(userId: string): Promise<User | null>;
  getProfile(userId: string): Promise<User>;
}

/**
 * OAuth Operations Interface
 * Single Responsibility: OAuth provider authentication
 */
export interface IOAuthService {
  googleLogin(profile: any): Promise<AuthResponse>;
  githubLogin(profile: any): Promise<AuthResponse>;
  handleOAuthCallback(
    provider: AuthProvider,
    profile: any,
  ): Promise<AuthResponse>;
}

/**
 * Token Operations Interface
 * Single Responsibility: JWT token management
 */
export interface ITokenService {
  generateTokens(user: UserDocument | User): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
  refreshToken(refreshToken: string): Promise<AuthResponse>;
  validateToken(token: string): Promise<JwtPayload | null>;
  generateRandomToken(): string;
}

/**
 * Authentication Password Operations Interface
 * Single Responsibility: Auth-related password management
 */
export interface IAuthPasswordService {
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean>;
  forgotPassword(email: string): Promise<boolean>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
}

/**
 * Main Auth Service Interface
 * Orchestrates other services following Single Responsibility and Dependency Inversion
 */
export interface IAuthService
  extends IAuthCoreService,
    IOAuthService,
    IAuthPasswordService {
  // Token management delegation
  refreshToken(refreshToken: string): Promise<AuthResponse>;
}
