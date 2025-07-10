import { faker } from '@faker-js/faker';
import { HydratedDocument } from 'mongoose';
import { CreateUserInput } from '../../user/dto/create-user.input';
import { UpdateUserInput } from '../../user/dto/update-user.input';
import { AuthProvider, User, UserRole } from '../../user/user.schema';

/**
 * User Test Data Factory using Faker
 * Follows Single Responsibility Principle - only responsible for user test data generation
 */
export class UserFactory {
  /**
   * Configure Faker seed for deterministic tests
   */
  static seed(seedValue: number = 12345): void {
    faker.seed(seedValue);
  }

  /**
   * Generate a realistic CreateUserInput
   */
  static createUserInput(
    overrides: Partial<CreateUserInput> = {},
  ): CreateUserInput {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: this.generateSecurePassword(),
      firstName,
      lastName,
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
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
      isEmailVerified: faker.datatype.boolean(),
      ...overrides,
    };
  }

  /**
   * Generate a realistic UpdateUserInput
   */
  static updateUserInput(
    overrides: Partial<UpdateUserInput> = {},
  ): UpdateUserInput {
    return {
      id: faker.database.mongodbObjectId(),
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
      providerId: faker.string.alphanumeric(20),
      avatar: faker.image.avatar(),
      isActive: faker.datatype.boolean(),
      isEmailVerified: faker.datatype.boolean(),
      ...overrides,
    };
  }

  /**
   * Generate a mock User document (HydratedDocument)
   */
  static mockUser(overrides: Partial<User> = {}): HydratedDocument<User> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    const user = {
      id: faker.database.mongodbObjectId(),
      email,
      password: this.generateHashedPassword(),
      firstName,
      lastName,
      username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
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
      providerId: faker.string.alphanumeric(20),
      avatar: faker.image.avatar(),
      isActive: faker.datatype.boolean({ probability: 0.8 }), // 80% chance of being active
      isEmailVerified: faker.datatype.boolean({ probability: 0.7 }), // 70% chance of being verified
      emailVerificationToken: faker.string.alphanumeric(32),
      passwordResetToken: faker.string.alphanumeric(32),
      passwordResetExpires: faker.date.future(),
      lastLogin: faker.date.recent({ days: 7 }),
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: faker.date.recent({ days: 30 }),
      ...overrides,
      save: jest.fn().mockResolvedValue(this),
      remove: jest.fn().mockResolvedValue(this),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(this),
    } as unknown as HydratedDocument<User>;

    return user;
  }

  /**
   * Generate multiple mock users
   */
  static mockUsers(
    count: number,
    overrides: Partial<User> = {},
  ): HydratedDocument<User>[] {
    return Array.from({ length: count }, () => this.mockUser(overrides));
  }

  /**
   * Generate user with specific role
   */
  static mockUserWithRole(
    role: UserRole,
    overrides: Partial<User> = {},
  ): HydratedDocument<User> {
    return this.mockUser({ role, ...overrides });
  }

  /**
   * Generate admin user
   */
  static mockAdminUser(overrides: Partial<User> = {}): HydratedDocument<User> {
    return this.mockUserWithRole(UserRole.ADMIN, {
      isActive: true,
      isEmailVerified: true,
      ...overrides,
    });
  }

  /**
   * Generate inactive user
   */
  static mockInactiveUser(
    overrides: Partial<User> = {},
  ): HydratedDocument<User> {
    return this.mockUser({
      isActive: false,
      ...overrides,
    });
  }

  /**
   * Generate user with OAuth provider
   */
  static mockUserWithOAuth(
    provider: AuthProvider = AuthProvider.GOOGLE,
    overrides: Partial<User> = {},
  ): HydratedDocument<User> {
    return this.mockUser({
      provider,
      providerId: faker.string.alphanumeric(20),
      isEmailVerified: true, // OAuth users are typically verified
      ...overrides,
    });
  }

  /**
   * Generate user for specific test scenarios
   */
  static mockUserForScenario(
    scenario: 'registration' | 'login' | 'update' | 'deletion',
  ): HydratedDocument<User> {
    switch (scenario) {
      case 'registration':
        return this.mockUser({
          isActive: true,
          isEmailVerified: false,
          provider: AuthProvider.LOCAL,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      case 'login':
        return this.mockUser({
          isActive: true,
          isEmailVerified: true,
          provider: AuthProvider.LOCAL,
          password: this.generateHashedPassword(),
        });

      case 'update':
        return this.mockUser({
          isActive: true,
          updatedAt: faker.date.recent({ days: 1 }),
        });

      case 'deletion':
        return this.mockUser({
          isActive: false,
        });

      default:
        return this.mockUser();
    }
  }

  /**
   * Generate paginated users response
   */
  static mockPaginatedUsers(page: number = 1, limit: number = 10) {
    const totalDocs = faker.number.int({ min: limit, max: 100 });
    const totalPages = Math.ceil(totalDocs / limit);
    const users = this.mockUsers(Math.min(limit, totalDocs));

    return {
      data: users,
      pagination: {
        totalDocs,
        limit,
        page,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        prevPage: page > 1 ? page - 1 : undefined,
        nextPage: page < totalPages ? page + 1 : undefined,
      },
    };
  }

  /**
   * Generate users for testing edge cases
   */
  static edgeCaseUsers() {
    return {
      userWithLongEmail: this.mockUser({
        email: faker.internet.email() + faker.string.alpha(100),
      }),
      userWithSpecialCharacters: this.mockUser({
        firstName: 'José-María',
        lastName: "O'Connor-Smith",
        username: 'jose_maria_oconnor',
      }),
      userWithMinimalData: this.mockUser({
        firstName: 'A',
        lastName: 'B',
        email: 'a@b.co',
        username: 'ab',
      }),
      userWithUnicodeData: this.mockUser({
        firstName: '王小明',
        lastName: '李',
        username: 'wang_xiaoming',
      }),
    };
  }

  /**
   * Private helper methods
   */

  /**
   * Generate a secure password that meets strength requirements
   */
  private static generateSecurePassword(): string {
    return faker.internet.password({
      length: 12,
      memorable: false,
      pattern:
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
    });
  }

  /**
   * Generate a realistic hashed password
   */
  private static generateHashedPassword(): string {
    // Simulate Argon2 hash format
    return `$argon2id$v=19$m=65536,t=3,p=1$${faker.string.alphanumeric(22)}$${faker.string.alphanumeric(43)}`;
  }

  /**
   * Reset factory state (useful between tests)
   */
  static reset(): void {
    faker.seed(); // Reset to random seed
  }
}
