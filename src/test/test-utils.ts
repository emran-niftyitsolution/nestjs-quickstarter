import { faker } from '@faker-js/faker';
import { ExecutionContext } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthFactory, UserFactory } from './factories';

/**
 * Enhanced Test Utilities with Faker Integration
 * Following SOLID principles for maintainable and reusable test infrastructure
 */

/**
 * Mock Database Setup for Testing
 */
export class TestDatabaseManager {
  private static mongoServer: MongoMemoryServer | undefined;

  /**
   * Start in-memory MongoDB instance
   */
  static async startDatabase(): Promise<string> {
    if (!this.mongoServer) {
      this.mongoServer = await MongoMemoryServer.create();
    }
    return this.mongoServer.getUri();
  }

  /**
   * Stop in-memory MongoDB instance
   */
  static async stopDatabase(): Promise<void> {
    if (this.mongoServer) {
      await this.mongoServer.stop();
      this.mongoServer = undefined;
    }
  }

  /**
   * Get MongoDB connection module for testing
   */
  static getTestMongoModule() {
    return MongooseModule.forRootAsync({
      useFactory: async () => ({
        uri: await this.startDatabase(),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
    });
  }
}

/**
 * Test Module Builder with SOLID principles
 */
export class TestModuleBuilder {
  /**
   * Create a testing module with common providers
   */
  static async createTestModule(
    providers: any[] = [],
    imports: any[] = [],
  ): Promise<TestingModule> {
    return await Test.createTestingModule({
      imports: [TestDatabaseManager.getTestMongoModule(), ...imports],
      providers: [...providers, ...MockProviders.getCommonMocks()],
    }).compile();
  }
}

/**
 * Centralized Mock Providers following DRY principle
 */
export class MockProviders {
  /**
   * Get common mock providers used across tests
   */
  static getCommonMocks() {
    return [
      {
        provide: 'IUserRepository',
        useValue: this.createMockUserRepository(),
      },
      {
        provide: 'IPasswordService',
        useValue: this.createMockPasswordService(),
      },
      {
        provide: 'ITokenService',
        useValue: this.createMockTokenService(),
      },
      {
        provide: 'IAuthService',
        useValue: this.createMockAuthService(),
      },
    ];
  }

  /**
   * Create mock user repository with realistic Faker data
   */
  static createMockUserRepository() {
    return {
      create: jest
        .fn()
        .mockImplementation((input: any) =>
          Promise.resolve(UserFactory.mockUser(input)),
        ),
      findById: jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve(UserFactory.mockUser({ id })),
        ),
      findByEmail: jest
        .fn()
        .mockImplementation((email: string) =>
          Promise.resolve(UserFactory.mockUser({ email })),
        ),
      findByProviderId: jest
        .fn()
        .mockImplementation((provider: any, providerId: string) =>
          Promise.resolve(
            UserFactory.mockUserWithOAuth(provider, { providerId }),
          ),
        ),
      findAll: jest
        .fn()
        .mockImplementation((pagination: any) =>
          Promise.resolve(
            UserFactory.mockPaginatedUsers(
              pagination?.page || 1,
              pagination?.limit || 10,
            ),
          ),
        ),
      update: jest
        .fn()
        .mockImplementation((id: string, updateData: any) =>
          Promise.resolve(UserFactory.mockUser({ id, ...updateData })),
        ),
      remove: jest.fn().mockResolvedValue(true),
      emailExists: jest.fn().mockResolvedValue(false),
    };
  }

  /**
   * Create mock password service with realistic behavior
   */
  static createMockPasswordService() {
    return {
      hashPassword: jest
        .fn()
        .mockImplementation((password: string) =>
          Promise.resolve(
            `$argon2id$v=19$m=65536,t=3,p=1$${faker.string.alphanumeric(22)}$${faker.string.alphanumeric(43)}`,
          ),
        ),
      verifyPassword: jest.fn().mockResolvedValue(true),
      generateRandomPassword: jest
        .fn()
        .mockImplementation((length = 12) =>
          faker.internet.password({
            length,
            pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
          }),
        ),
      validatePasswordStrength: jest.fn().mockReturnValue(true),
    };
  }

  /**
   * Create mock token service with realistic JWT tokens
   */
  static createMockTokenService() {
    return {
      generateAccessToken: jest
        .fn()
        .mockImplementation(() => AuthFactory.generateJWT('access')),
      generateRefreshToken: jest
        .fn()
        .mockImplementation(() => AuthFactory.generateJWT('refresh')),
      verifyToken: jest.fn().mockImplementation(() => ({
        sub: faker.database.mongodbObjectId(),
        email: faker.internet.email(),
        role: 'USER',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      })),
      extractUserIdFromToken: jest
        .fn()
        .mockImplementation(() => faker.database.mongodbObjectId()),
      isTokenExpired: jest.fn().mockReturnValue(false),
    };
  }

  /**
   * Create mock auth service with realistic responses
   */
  static createMockAuthService() {
    return {
      register: jest.fn().mockImplementation((input: any) =>
        Promise.resolve(
          AuthFactory.authResponse({
            user: UserFactory.mockUser(input),
          }),
        ),
      ),
      login: jest.fn().mockImplementation((input: any) =>
        Promise.resolve(
          AuthFactory.authResponse({
            user: UserFactory.mockUser({ email: input.email }),
          }),
        ),
      ),
      refreshToken: jest
        .fn()
        .mockImplementation(() => Promise.resolve(AuthFactory.authResponse())),
      logout: jest.fn().mockResolvedValue(true),
      validateUser: jest
        .fn()
        .mockImplementation((email: string) =>
          Promise.resolve(UserFactory.mockUser({ email })),
        ),
    };
  }
}

/**
 * GraphQL Testing Utilities
 */
export class GraphQLTestUtils {
  /**
   * Create mock GraphQL execution context
   */
  static createMockGqlContext(user = UserFactory.mockUser()): ExecutionContext {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToGraphql: jest.fn().mockReturnValue({
        getContext: jest.fn().mockReturnValue({
          req: {
            user,
            headers: AuthFactory.authHeaders(),
          },
        }),
        getInfo: jest.fn(),
        getArgs: jest.fn(),
        getRoot: jest.fn(),
      }),
    };

    return mockContext as ExecutionContext;
  }

  /**
   * Create mock HTTP execution context
   */
  static createMockHttpContext(
    user = UserFactory.mockUser(),
  ): ExecutionContext {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
          headers: AuthFactory.authHeaders(),
        }),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      }),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      switchToGraphql: jest.fn(),
      getType: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
    };

    return mockContext as ExecutionContext;
  }
}

/**
 * Test Data Seeding Utilities
 */
export class TestDataSeeder {
  /**
   * Seed all factories with deterministic data
   */
  static seedDeterministic(seed: number = 12345): void {
    faker.seed(seed);
    UserFactory.seed(seed);
    AuthFactory.seed(seed);
  }

  /**
   * Reset all factories to random state
   */
  static resetToRandom(): void {
    faker.seed();
    UserFactory.reset();
    AuthFactory.reset();
  }

  /**
   * Generate test dataset for integration tests
   */
  static generateTestDataset() {
    return {
      users: {
        admin: UserFactory.mockAdminUser(),
        regularUser: UserFactory.mockUser(),
        inactiveUser: UserFactory.mockInactiveUser(),
        oauthUser: UserFactory.mockUserWithOAuth(),
        multipleUsers: UserFactory.mockUsers(5),
      },
      auth: {
        validLogin: AuthFactory.loginInput(),
        validRegistration: AuthFactory.registerInput(),
        authResponse: AuthFactory.authResponse(),
        tokens: AuthFactory.jwtTokens(),
        scenarios: AuthFactory.authScenarios(),
        errors: AuthFactory.authErrors(),
      },
    };
  }
}

/**
 * Performance Testing Utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time of a function
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T>,
    label: string = 'Operation',
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = performance.now();
    const result = await fn();
    const executionTime = performance.now() - startTime;

    console.log(`${label} executed in ${executionTime.toFixed(2)}ms`);

    return { result, executionTime };
  }

  /**
   * Generate large dataset for performance testing
   */
  static generateLargeDataset(size: number) {
    return {
      users: UserFactory.mockUsers(size),
      logins: Array.from({ length: size }, () => AuthFactory.loginInput()),
      registrations: Array.from({ length: size }, () =>
        AuthFactory.registerInput(),
      ),
    };
  }
}

/**
 * Assertion Helpers with Faker Integration
 */
export class TestAssertions {
  /**
   * Assert user object structure and realistic data
   */
  static assertValidUser(user: any): void {
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(user.firstName).toBeDefined();
    expect(user.lastName).toBeDefined();
    expect(['USER', 'ADMIN', 'MODERATOR']).toContain(user.role);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  }

  /**
   * Assert auth response structure
   */
  static assertValidAuthResponse(authResponse: any): void {
    expect(authResponse).toBeDefined();
    expect(authResponse.user).toBeDefined();
    expect(authResponse.accessToken).toBeDefined();
    expect(authResponse.refreshToken).toBeDefined();

    this.assertValidUser(authResponse.user);
    this.assertValidJWT(authResponse.accessToken);
    this.assertValidJWT(authResponse.refreshToken);
  }

  /**
   * Assert JWT token structure
   */
  static assertValidJWT(token: string): void {
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const parts = token.split('.');
    expect(parts).toHaveLength(3);

    // Validate base64url encoding
    parts.forEach((part) => {
      expect(part).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  }
}

// Legacy mock objects for backward compatibility
// These are replaced by the new Faker-based factories above
export const mockUser = UserFactory.mockUser();
export const mockAdminUser = UserFactory.mockAdminUser();
export const mockUserService = MockProviders.createMockUserRepository();
export const mockAuthService = MockProviders.createMockAuthService();
export const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

export const mockReflector = {
  get: jest.fn(),
  getAll: jest.fn(),
  getAllAndMerge: jest.fn(),
  getAllAndOverride: jest.fn(),
};

// Legacy health check mocks
export const mockHealthCheckService = {
  check: jest.fn().mockResolvedValue({
    status: 'ok',
    info: {},
    error: {},
    details: {},
  }),
};

export const mockMongooseHealthIndicator = {
  pingCheck: jest.fn().mockResolvedValue({ mongodb: { status: 'up' } }),
};

export const mockMemoryHealthIndicator = {
  checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
  checkRSS: jest.fn().mockResolvedValue({ memory_rss: { status: 'up' } }),
};

export const mockDiskHealthIndicator = {
  checkStorage: jest.fn().mockResolvedValue({ storage: { status: 'up' } }),
};

// Legacy mock execution context
export const createMockExecutionContext = (
  user: any = mockUser,
  contextType: 'http' | 'graphql' = 'http',
): ExecutionContext => {
  const mockRequest = {
    user,
    method: 'GET',
    url: '/test',
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
  };

  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToHttp: jest.fn(() => ({
      getRequest: () => mockRequest,
      getResponse: () => ({}),
    })),
    getType: jest.fn(() => contextType),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
  } as any;
};

// Legacy GraphQL context mock
export const createMockGqlExecutionContext = (user: any = mockUser) => ({
  create: jest.fn(() => ({
    getContext: () => ({ req: { user } }),
    getInfo: () => ({
      operation: { operation: 'query' },
      fieldName: 'testField',
    }),
  })),
});

// Legacy helper functions
export const clearAllMocks = () => {
  jest.clearAllMocks();
  Object.values(mockUserService).forEach((mock) => {
    if (jest.isMockFunction(mock)) mock.mockClear();
  });
  Object.values(mockAuthService).forEach((mock) => {
    if (jest.isMockFunction(mock)) mock.mockClear();
  });
};

export const expectMockToHaveBeenCalledWith = (
  mockFn: jest.Mock,
  ...args: any[]
) => {
  expect(mockFn).toHaveBeenCalledWith(...args);
};

export const expectMockToHaveBeenCalledTimes = (
  mockFn: jest.Mock,
  times: number,
) => {
  expect(mockFn).toHaveBeenCalledTimes(times);
};

// Export factory instances for direct use
export { AuthFactory, UserFactory };
