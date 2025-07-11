import { faker } from '@faker-js/faker';
import { AuthResponse } from '../../auth/dto/auth.response';
import { LoginInput } from '../../auth/dto/login.input';
import { RegisterInput } from '../../auth/dto/register.input';
import { AuthProvider, User, UserRole } from '../../user/user.schema';

/**
 * Auth Test Data Factory using Faker
 * Follows Single Responsibility Principle - only responsible for auth test data generation
 */
export class AuthFactory {
  /**
   * Configure Faker seed for deterministic tests
   */
  static seed(seedValue: number = 12345): void {
    faker.seed(seedValue);
  }

  /**
   * Generate a realistic LoginInput
   */
  static loginInput(overrides: Partial<LoginInput> = {}): LoginInput {
    return {
      email: faker.internet.email().toLowerCase(),
      password: this.generateValidPassword(),
      ...overrides,
    };
  }

  /**
   * Generate a realistic RegisterInput
   */
  static registerInput(overrides: Partial<RegisterInput> = {}): RegisterInput {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: this.generateValidPassword(),
      firstName,
      lastName,
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
      ...overrides,
    };
  }

  /**
   * Generate a mock AuthResponse
   */
  static authResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
    return {
      user: {
        _id: faker.database.mongodbObjectId(),
        email: faker.internet.email().toLowerCase(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        username: faker.internet.userName().toLowerCase(),
        role: faker.helpers.arrayElement([
          UserRole.USER,
          UserRole.ADMIN,
          UserRole.MODERATOR,
        ]),
        provider: faker.helpers.arrayElement([
          AuthProvider.LOCAL,
          AuthProvider.GOOGLE,
          AuthProvider.GITHUB,
        ]),
        avatar: faker.image.avatar(),
        isActive: true,
        isEmailVerified: faker.datatype.boolean({ probability: 0.8 }),
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: faker.date.recent(),
      },
      accessToken: this.generateJWT('access'),
      refreshToken: this.generateJWT('refresh'),
      ...overrides,
    };
  }

  /**
   * Generate JWT tokens for testing
   */
  static jwtTokens() {
    return {
      accessToken: this.generateJWT('access'),
      refreshToken: this.generateJWT('refresh'),
    };
  }

  /**
   * Generate valid JWT token
   */
  static generateJWT(type: 'access' | 'refresh' = 'access'): string {
    const header = Buffer.from(
      JSON.stringify({
        alg: 'HS256',
        typ: 'JWT',
      }),
    ).toString('base64url');

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = type === 'access' ? 900 : 604800; // 15 min or 7 days

    const payload = Buffer.from(
      JSON.stringify({
        sub: faker.database.mongodbObjectId(),
        email: faker.internet.email().toLowerCase(),
        role: faker.helpers.arrayElement([
          UserRole.USER,
          UserRole.ADMIN,
          UserRole.MODERATOR,
        ]),
        iat: now,
        exp: now + expiresIn,
      }),
    ).toString('base64url');

    const signature = faker.string.alphanumeric(43);

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Generate expired JWT token
   */
  static expiredJWT(): string {
    const header = Buffer.from(
      JSON.stringify({
        alg: 'HS256',
        typ: 'JWT',
      }),
    ).toString('base64url');

    const now = Math.floor(Date.now() / 1000);

    const payload = Buffer.from(
      JSON.stringify({
        sub: faker.database.mongodbObjectId(),
        email: faker.internet.email().toLowerCase(),
        role: UserRole.USER,
        iat: now - 3600,
        exp: now - 1800, // Expired 30 minutes ago
      }),
    ).toString('base64url');

    const signature = faker.string.alphanumeric(43);

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Generate OAuth user data
   */
  static oauthUserData(provider: 'google' | 'github' = 'google') {
    const baseData = {
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
      picture: faker.image.avatar(),
    };

    switch (provider) {
      case 'google':
        return {
          ...baseData,
          sub: faker.string.numeric(21),
          given_name: faker.person.firstName(),
          family_name: faker.person.lastName(),
          email_verified: faker.datatype.boolean({ probability: 0.9 }),
        };

      case 'github':
        return {
          ...baseData,
          id: faker.number.int({ min: 1000000, max: 99999999 }),
          login: faker.internet.userName().toLowerCase(),
          avatar_url: faker.image.avatar(),
          html_url: `https://github.com/${faker.internet.userName()}`,
        };

      default:
        return baseData;
    }
  }

  /**
   * Generate password reset data
   */
  static passwordResetData() {
    return {
      email: faker.internet.email().toLowerCase(),
      token: faker.string.alphanumeric(32),
      expires: faker.date.future(),
    };
  }

  /**
   * Generate email verification data
   */
  static emailVerificationData() {
    return {
      email: faker.internet.email().toLowerCase(),
      token: faker.string.alphanumeric(32),
      expires: faker.date.future(),
    };
  }

  /**
   * Generate auth headers for testing
   */
  static authHeaders(token?: string) {
    return {
      authorization: `Bearer ${token || this.generateJWT('access')}`,
      'content-type': 'application/json',
    };
  }

  /**
   * Generate test data for different auth scenarios
   */
  static authScenarios() {
    return {
      validLogin: this.loginInput({
        email: 'test@example.com',
        password: 'Test123!@#',
      }),

      invalidEmail: this.loginInput({
        email: 'invalid-email',
        password: 'Test123!@#',
      }),

      weakPassword: this.registerInput({
        password: '123',
      }),

      duplicateEmail: this.registerInput({
        email: 'existing@example.com',
      }),

      validRegistration: this.registerInput({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      }),

      adminAuth: this.authResponse({
        user: {
          _id: faker.database.mongodbObjectId(),
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          username: 'admin',
          role: UserRole.ADMIN,
          provider: AuthProvider.LOCAL,
          avatar: faker.image.avatar(),
          isActive: true,
          isEmailVerified: true,
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: faker.date.recent(),
        },
      }),
    };
  }

  /**
   * Generate auth error scenarios
   */
  static authErrors() {
    return {
      unauthorizedError: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },

      forbiddenError: {
        statusCode: 403,
        message: 'Forbidden resource',
        error: 'Forbidden',
      },

      invalidCredentials: {
        statusCode: 401,
        message: 'Invalid email or password',
        error: 'Unauthorized',
      },

      expiredToken: {
        statusCode: 401,
        message: 'Token has expired',
        error: 'Unauthorized',
      },

      invalidToken: {
        statusCode: 401,
        message: 'Invalid token',
        error: 'Unauthorized',
      },
    };
  }

  /**
   * Generate session data
   */
  static sessionData() {
    return {
      id: faker.string.alphanumeric(32),
      userId: faker.database.mongodbObjectId(),
      userAgent: faker.internet.userAgent(),
      ip: faker.internet.ip(),
      createdAt: faker.date.recent(),
      expiresAt: faker.date.future(),
      isActive: true,
    };
  }

  /**
   * Private helper methods
   */

  /**
   * Generate a valid password that meets requirements
   */
  private static generateValidPassword(): string {
    // Generate password that meets: 8+ chars, uppercase, lowercase, number, special char
    const password = faker.internet.password({
      length: faker.number.int({ min: 8, max: 20 }),
      memorable: false,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    });

    // Ensure it has at least one of each required character type
    return password + 'A1!'; // Fallback to ensure requirements are met
  }

  /**
   * Reset factory state
   */
  static reset(): void {
    faker.seed(); // Reset to random seed
  }

  static mockUser(overrides: Partial<User> = {}): User {
    return {
      _id: faker.database.mongodbObjectId(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      username: faker.internet.userName(),
      role: UserRole.USER,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      isActive: true,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }
}
