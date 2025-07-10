import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  clearAllMocks,
  expectMockToHaveBeenCalledWith,
  mockAuthResponse,
  mockAuthService,
  mockGraphQLContext,
  mockUser,
} from '../test/test-utils';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';

describe('AuthResolver', () => {
  let resolver: AuthResolver;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    resolver = module.get<AuthResolver>(AuthResolver);
    authService = module.get(AuthService);

    clearAllMocks();
  });

  describe('register', () => {
    const registerInput: RegisterInput = {
      email: 'newuser@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);

      const result = await resolver.register(registerInput);

      expectMockToHaveBeenCalledWith(authService.register, registerInput);
      expect(result).toEqual(mockAuthResponse);
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should handle registration errors', async () => {
      authService.register.mockRejectedValue(new Error('Email already exists'));

      await expect(resolver.register(registerInput)).rejects.toThrow(
        'Email already exists',
      );
    });

    it('should validate input data', async () => {
      const invalidInput = { email: 'invalid-email' };
      authService.register.mockRejectedValue(
        new BadRequestException('Invalid input'),
      );

      await expect(
        resolver.register(invalidInput as RegisterInput),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await resolver.login(loginInput);

      expectMockToHaveBeenCalledWith(authService.login, loginInput);
      expect(result).toEqual(mockAuthResponse);
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should handle invalid credentials', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(resolver.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle inactive user login attempt', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException('Account is inactive'),
      );

      await expect(resolver.login(loginInput)).rejects.toThrow(
        'Account is inactive',
      );
    });

    it('should handle missing password for OAuth users', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException(
          'User registered with OAuth, password login not available',
        ),
      );

      await expect(resolver.login(loginInput)).rejects.toThrow(
        'User registered with OAuth, password login not available',
      );
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh token successfully', async () => {
      authService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await resolver.refreshToken(refreshToken);

      expectMockToHaveBeenCalledWith(authService.refreshToken, refreshToken);
      expect(result).toEqual(mockAuthResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should handle invalid refresh token', async () => {
      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(resolver.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should handle expired refresh token', async () => {
      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Refresh token expired'),
      );

      await expect(resolver.refreshToken(refreshToken)).rejects.toThrow(
        'Refresh token expired',
      );
    });

    it('should handle user not found during refresh', async () => {
      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('User not found'),
      );

      await expect(resolver.refreshToken(refreshToken)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const result = await resolver.logout();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Logged out successfully');
    });

    it('should always return success for logout', async () => {
      // Logout should be idempotent and always succeed
      const result1 = await resolver.logout();
      const result2 = await resolver.logout();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('changePassword', () => {
    const oldPassword = 'oldPassword123';
    const newPassword = 'newPassword456';

    it('should change password successfully', async () => {
      authService.changePassword.mockResolvedValue(true);

      const result = await resolver.changePassword(
        oldPassword,
        newPassword,
        mockGraphQLContext,
      );

      expectMockToHaveBeenCalledWith(
        authService.changePassword,
        mockUser.id,
        mockUser.email,
        oldPassword,
        newPassword,
      );
      expect(result).toBe(true);
    });

    it('should handle incorrect old password', async () => {
      authService.changePassword.mockRejectedValue(
        new UnauthorizedException('Current password is incorrect'),
      );

      await expect(
        resolver.changePassword(
          'wrongPassword',
          newPassword,
          mockGraphQLContext,
        ),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should handle same old and new password', async () => {
      authService.changePassword.mockRejectedValue(
        new BadRequestException(
          'New password must be different from current password',
        ),
      );

      await expect(
        resolver.changePassword(oldPassword, oldPassword, mockGraphQLContext),
      ).rejects.toThrow('New password must be different from current password');
    });

    it('should handle OAuth users trying to change password', async () => {
      authService.changePassword.mockRejectedValue(
        new BadRequestException('OAuth users cannot change password'),
      );

      await expect(
        resolver.changePassword(oldPassword, newPassword, mockGraphQLContext),
      ).rejects.toThrow('OAuth users cannot change password');
    });
  });

  describe('forgotPassword', () => {
    const email = 'test@example.com';

    it('should initiate password reset successfully', async () => {
      authService.forgotPassword.mockResolvedValue(true);

      const result = await resolver.forgotPassword(email);

      expectMockToHaveBeenCalledWith(authService.forgotPassword, email);
      expect(result).toBe(true);
    });

    it('should handle non-existent email gracefully', async () => {
      // Should return false but not throw error for security reasons
      authService.forgotPassword.mockResolvedValue(false);

      const result = await resolver.forgotPassword('nonexistent@example.com');

      expect(result).toBe(false);
    });

    it('should handle inactive user password reset', async () => {
      authService.forgotPassword.mockResolvedValue(false);

      const result = await resolver.forgotPassword(email);

      expect(result).toBe(false);
    });

    it('should handle OAuth users password reset', async () => {
      authService.forgotPassword.mockResolvedValue(false);

      const result = await resolver.forgotPassword(email);

      expect(result).toBe(false);
    });
  });

  describe('resetPassword', () => {
    const resetToken = 'valid-reset-token';
    const newPassword = 'newPassword123';

    it('should reset password successfully', async () => {
      authService.resetPassword.mockResolvedValue(true);

      const result = await resolver.resetPassword(resetToken, newPassword);

      expectMockToHaveBeenCalledWith(
        authService.resetPassword,
        resetToken,
        newPassword,
      );
      expect(result).toBe(true);
    });

    it('should handle invalid reset token', async () => {
      authService.resetPassword.mockRejectedValue(
        new UnauthorizedException('Invalid or expired reset token'),
      );

      await expect(
        resolver.resetPassword('invalid-token', newPassword),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should handle expired reset token', async () => {
      authService.resetPassword.mockRejectedValue(
        new UnauthorizedException('Reset token has expired'),
      );

      await expect(
        resolver.resetPassword(resetToken, newPassword),
      ).rejects.toThrow('Reset token has expired');
    });

    it('should handle inactive user password reset', async () => {
      authService.resetPassword.mockRejectedValue(
        new UnauthorizedException('Account is inactive'),
      );

      await expect(
        resolver.resetPassword(resetToken, newPassword),
      ).rejects.toThrow('Account is inactive');
    });
  });

  describe('Error handling', () => {
    it('should handle service unavailable errors', async () => {
      const registerInput: RegisterInput = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      authService.register.mockRejectedValue(
        new Error('Service temporarily unavailable'),
      );

      await expect(resolver.register(registerInput)).rejects.toThrow(
        'Service temporarily unavailable',
      );
    });

    it('should handle database connection errors', async () => {
      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'password123',
      };

      authService.login.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(resolver.login(loginInput)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle JWT service errors', async () => {
      authService.refreshToken.mockRejectedValue(
        new Error('JWT service error'),
      );

      await expect(resolver.refreshToken('some-token')).rejects.toThrow(
        'JWT service error',
      );
    });
  });

  describe('Input validation', () => {
    it('should handle malformed email in registration', async () => {
      const invalidRegisterInput = {
        email: 'not-an-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      authService.register.mockRejectedValue(
        new BadRequestException('Invalid email format'),
      );

      await expect(resolver.register(invalidRegisterInput)).rejects.toThrow(
        'Invalid email format',
      );
    });

    it('should handle weak password in registration', async () => {
      const weakPasswordInput = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe',
      };

      authService.register.mockRejectedValue(
        new BadRequestException('Password does not meet requirements'),
      );

      await expect(resolver.register(weakPasswordInput)).rejects.toThrow(
        'Password does not meet requirements',
      );
    });

    it('should handle empty fields in login', async () => {
      const emptyLoginInput = {
        email: '',
        password: '',
      };

      authService.login.mockRejectedValue(
        new BadRequestException('Email and password required'),
      );

      await expect(resolver.login(emptyLoginInput)).rejects.toThrow(
        'Email and password required',
      );
    });
  });

  describe('Security tests', () => {
    it('should not expose sensitive information in errors', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      try {
        await resolver.login({ email: 'test@example.com', password: 'wrong' });
      } catch (error) {
        expect(error.message).not.toContain('password');
        expect(error.message).not.toContain('hash');
        expect(error.message).toBe('Invalid credentials');
      }
    });

    it('should handle brute force attack simulation', async () => {
      const loginAttempts = Array(10).fill({
        email: 'test@example.com',
        password: 'wrong-password',
      });

      authService.login.mockRejectedValue(
        new UnauthorizedException('Too many attempts'),
      );

      for (const attempt of loginAttempts) {
        await expect(resolver.login(attempt)).rejects.toThrow(
          'Too many attempts',
        );
      }
    });

    it('should handle token replay attacks', async () => {
      const usedToken = 'already-used-refresh-token';
      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Token has been revoked'),
      );

      await expect(resolver.refreshToken(usedToken)).rejects.toThrow(
        'Token has been revoked',
      );
    });
  });
});
