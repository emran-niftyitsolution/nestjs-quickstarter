import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  clearAllMocks,
  expectMockToHaveBeenCalledWith,
  mockConfigService,
  mockJwtService,
  mockLogger,
  mockUser,
  mockUserService,
} from '../test/test-utils';
import { AuthProvider, UserRole } from '../user/user.schema';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    clearAllMocks();
  });

  describe('register', () => {
    const registerInput: RegisterInput = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should register a new user successfully', async () => {
      userService.create.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register(registerInput);

      expectMockToHaveBeenCalledWith(userService.create, registerInput);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw error if user creation fails', async () => {
      userService.create.mockRejectedValue(new Error('Creation failed'));

      await expect(service.register(registerInput)).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('login', () => {
    const loginInput: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(true);
      userService.updateLastLogin.mockResolvedValue(undefined);
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginInput);

      expectMockToHaveBeenCalledWith(userService.findByEmail, loginInput.email);
      expectMockToHaveBeenCalledWith(
        userService.verifyPassword,
        loginInput.password,
        mockUser.password,
      );
      expectMockToHaveBeenCalledWith(userService.updateLastLogin, mockUser.id);
      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userService.findByEmail.mockResolvedValue(inactiveUser);
      userService.verifyPassword.mockResolvedValue(true);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for user without password', async () => {
      const userWithoutPassword = { ...mockUser, password: undefined };
      userService.findByEmail.mockResolvedValue(userWithoutPassword);

      await expect(service.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'valid-refresh-token';

    it('should refresh token successfully', async () => {
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      jwtService.verifyAsync.mockResolvedValue(payload);
      userService.findOne.mockResolvedValue(mockUser);
      jwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken(refreshToken);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret-minimum-32-characters',
      });
      expectMockToHaveBeenCalledWith(userService.findOne, mockUser.id);
      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = {
        sub: 'nonexistent',
        email: 'test@example.com',
        role: UserRole.USER,
      };
      jwtService.verifyAsync.mockResolvedValue(payload);
      userService.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };
      const inactiveUser = { ...mockUser, isActive: false };
      jwtService.verifyAsync.mockResolvedValue(payload);
      userService.findOne.mockResolvedValue(inactiveUser);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    const userId = mockUser.id;
    const oldPassword = 'oldPassword';
    const newPassword = 'newPassword';

    it('should change password successfully', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(true);
      userService.updatePassword.mockResolvedValue(true);

      const result = await service.changePassword(
        oldPassword,
        newPassword,
        userId,
      );

      expectMockToHaveBeenCalledWith(userService.findByEmail, mockUser.email);
      expectMockToHaveBeenCalledWith(
        userService.verifyPassword,
        oldPassword,
        mockUser.password,
      );
      expectMockToHaveBeenCalledWith(
        userService.updatePassword,
        userId,
        newPassword,
      );
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(
        service.changePassword(
          userId,
          'nonexistent@example.com',
          oldPassword,
          newPassword,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid old password', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(false);

      await expect(
        service.changePassword(
          userId,
          mockUser.email,
          'wrongPassword',
          newPassword,
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if old and new passwords are the same', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(true);

      await expect(
        service.changePassword(
          userId,
          mockUser.email,
          'samePassword',
          'samePassword',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('should initiate password reset successfully', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.setPasswordResetToken.mockResolvedValue(true);

      const result = await service.forgotPassword(mockUser.email);

      expectMockToHaveBeenCalledWith(userService.findByEmail, mockUser.email);
      expectMockToHaveBeenCalledWith(
        userService.setPasswordResetToken,
        mockUser.id,
        expect.any(String),
      );
      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      userService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result).toBe(false);
    });

    it('should return false for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userService.findByEmail.mockResolvedValue(inactiveUser);

      const result = await service.forgotPassword(mockUser.email);

      expect(result).toBe(false);
    });
  });

  describe('resetPassword', () => {
    const resetToken = 'valid-reset-token';
    const newPassword = 'newPassword123';

    it('should reset password successfully', async () => {
      userService.findByPasswordResetToken.mockResolvedValue(mockUser);
      userService.updatePassword.mockResolvedValue(true);
      userService.clearPasswordResetToken.mockResolvedValue(true);

      const result = await service.resetPassword(resetToken, newPassword);

      expectMockToHaveBeenCalledWith(
        userService.findByPasswordResetToken,
        resetToken,
      );
      expectMockToHaveBeenCalledWith(
        userService.updatePassword,
        mockUser.id,
        newPassword,
      );
      expectMockToHaveBeenCalledWith(
        userService.clearPasswordResetToken,
        mockUser.id,
      );
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException for invalid reset token', async () => {
      userService.findByPasswordResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', newPassword),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userService.findByPasswordResetToken.mockResolvedValue(inactiveUser);

      await expect(
        service.resetPassword(resetToken, newPassword),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('token generation via login', () => {
    it('should generate access and refresh tokens during login', async () => {
      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'password123',
      };

      userService.findByEmail.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(true);
      userService.updateLastLogin.mockResolvedValue(undefined);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(loginInput);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });
  });

  describe('OAuth Login', () => {
    const mockGoogleProfile = {
      id: 'google-123',
      emails: [{ value: 'test@google.com' }],
      name: { givenName: 'John', familyName: 'Doe' },
    };

    const mockGitHubProfile = {
      id: 'github-123',
      emails: [{ value: 'test@github.com' }],
      name: { givenName: 'John', familyName: 'Doe' },
    };

    describe('Google OAuth', () => {
      it('should create new user for first-time Google login', async () => {
        userService.findByProvider.mockResolvedValue(null);
        userService.findByEmail.mockResolvedValue(null);
        userService.create.mockResolvedValue(mockUser);
        userService.updateLastLogin.mockResolvedValue(undefined);
        jwtService.sign
          .mockReturnValueOnce('access-token')
          .mockReturnValueOnce('refresh-token');

        const result = await service.googleLogin(mockGoogleProfile);

        expect(userService.findByProvider).toHaveBeenCalledWith(
          AuthProvider.GOOGLE,
          'google-123',
        );
        expect(userService.findByEmail).toHaveBeenCalledWith('test@google.com');
        expect(result.user).toEqual(mockUser);
        expect(result.accessToken).toBe('access-token');
      });

      it('should return existing user for Google OAuth', async () => {
        userService.findByProvider.mockResolvedValue(mockUser);
        userService.updateLastLogin.mockResolvedValue(undefined);
        jwtService.sign
          .mockReturnValueOnce('access-token')
          .mockReturnValueOnce('refresh-token');

        const result = await service.googleLogin(mockGoogleProfile);

        expect(userService.findByProvider).toHaveBeenCalledWith(
          AuthProvider.GOOGLE,
          'google-123',
        );
        expect(userService.create).not.toHaveBeenCalled();
        expect(result.user).toEqual(mockUser);
      });
    });

    describe('GitHub OAuth', () => {
      it('should create new user for first-time GitHub login', async () => {
        userService.findByProvider.mockResolvedValue(null);
        userService.findByEmail.mockResolvedValue(null);
        userService.create.mockResolvedValue(mockUser);
        userService.updateLastLogin.mockResolvedValue(undefined);
        jwtService.sign
          .mockReturnValueOnce('access-token')
          .mockReturnValueOnce('refresh-token');

        const result = await service.githubLogin(mockGitHubProfile);

        expect(userService.findByProvider).toHaveBeenCalledWith(
          AuthProvider.GITHUB,
          'github-123',
        );
        expect(result.user).toEqual(mockUser);
      });

      it('should return existing user for GitHub OAuth', async () => {
        userService.findByProvider.mockResolvedValue(mockUser);
        userService.updateLastLogin.mockResolvedValue(undefined);
        jwtService.sign
          .mockReturnValueOnce('access-token')
          .mockReturnValueOnce('refresh-token');

        const result = await service.githubLogin(mockGitHubProfile);

        expect(userService.findByProvider).toHaveBeenCalledWith(
          AuthProvider.GITHUB,
          'github-123',
        );
        expect(result.user).toEqual(mockUser);
      });
    });

    it('should throw error for OAuth profile without email', async () => {
      const invalidProfile = { id: 'test-id' }; // Missing email

      await expect(service.googleLogin(invalidProfile)).rejects.toThrow(
        'Email is required for OAuth login',
      );
    });
  });

  describe('Error handling', () => {
    it('should handle JWT service errors gracefully', async () => {
      const registerInput: RegisterInput = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      userService.create.mockResolvedValue(mockUser);
      jwtService.signAsync.mockRejectedValue(new Error('JWT signing failed'));

      await expect(service.register(registerInput)).rejects.toThrow(
        'JWT signing failed',
      );
    });

    it('should handle database errors during authentication', async () => {
      const loginInput: LoginInput = {
        email: 'test@example.com',
        password: 'password123',
      };

      userService.findByEmail.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.login(loginInput)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });
});
