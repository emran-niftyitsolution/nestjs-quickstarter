import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ITokenService } from '../interfaces/auth-operations.interface';

interface JwtPayload {
  sub: string;
  userId?: string;
  email?: string;
  exp: number;
  iat: number;
}

/**
 * Token service implementing Single Responsibility Principle
 * Only responsible for JWT token operations
 */
@Injectable()
export class TokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate JWT access token
   */
  generateAccessToken(payload: any): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(payload: any): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      throw new Error(
        `Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Verify and decode refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (error) {
      throw new Error(
        `Invalid refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Extract user ID from token
   */
  extractUserIdFromToken(token: string): string {
    try {
      const decoded = this.verifyToken(token);
      return decoded.sub || decoded.userId || '';
    } catch {
      throw new Error('Failed to extract user ID from token');
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    try {
      const decoded = this.jwtService.decode(token);
      if (
        !decoded ||
        typeof decoded !== 'object' ||
        !('exp' in decoded) ||
        typeof (decoded as any).exp !== 'number'
      ) {
        return true;
      }
      const currentTime = Math.floor(Date.now() / 1000);
      return (decoded as any).exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration date
   */
  getTokenExpirationDate(token: string): Date | null {
    try {
      const decoded = this.jwtService.decode(token);
      if (
        !decoded ||
        typeof decoded !== 'object' ||
        !('exp' in decoded) ||
        typeof (decoded as any).exp !== 'number'
      ) {
        return null;
      }
      return new Date((decoded as any).exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Get remaining token lifetime in seconds
   */
  getTokenRemainingTime(token: string): number {
    try {
      const decoded = this.jwtService.decode(token);
      if (
        !decoded ||
        typeof decoded !== 'object' ||
        !('exp' in decoded) ||
        typeof (decoded as any).exp !== 'number'
      ) {
        return 0;
      }
      const currentTime = Math.floor(Date.now() / 1000);
      return Math.max(0, (decoded as any).exp - currentTime);
    } catch {
      return 0;
    }
  }
}
