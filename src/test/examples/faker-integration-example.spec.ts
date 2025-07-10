import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from '../../common/services/password.service';
import { TokenService } from '../../common/services/token.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { UserBusinessService } from '../../user/services/user-business.service';
import { AuthProvider, UserRole } from '../../user/user.schema';
import { AuthFactory, UserFactory } from '../factories';
import { TestAssertions, TestDataSeeder } from '../test-utils';

/**
 * Comprehensive Example: Using Faker with SOLID Principles in NestJS Testing
 *
 * This file demonstrates:
 * - Deterministic test data generation with Faker
 * - SOLID principle implementation in tests
 * - Realistic test scenarios
 * - Performance and edge case testing
 * - Type-safe factory usage
 */

describe('Faker Integration Example - SOLID Principles', () => {
  let userService: UserBusinessService;
  let passwordService: PasswordService;
  let tokenService: TokenService;
  let userRepository: UserRepository;

  // Setup deterministic testing environment
  beforeAll(() => {
    TestDataSeeder.seedDeterministic(12345);
  });

  beforeEach(async () => {
    // Reset factories for each test
    TestDataSeeder.seedDeterministic(12345);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserBusinessService,
        PasswordService,
        TokenService,
        {
          provide: 'IUserRepository',
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            emailExists: jest.fn(),
          },
        },
        {
          provide: 'IPasswordService',
          useClass: PasswordService,
        },
      ],
    }).compile();

    userService = module.get<UserBusinessService>(UserBusinessService);
    passwordService = module.get<PasswordService>(PasswordService);
    tokenService = module.get<TokenService>(TokenService);
    userRepository = module.get('IUserRepository');
  });

  afterEach(() => {
    TestDataSeeder.resetToRandom();
    jest.clearAllMocks();
  });

  describe('1. Single Responsibility Principle (SRP) Testing', () => {
    it('should test UserFactory in isolation - only user data generation', () => {
      // Arrange: UserFactory only handles user data generation
      const userData = UserFactory.createUserInput({
        email: 'test@example.com',
        role: UserRole.ADMIN,
      });

      // Assert: Verify factory creates realistic, valid data
      expect(userData.email).toBe('test@example.com');
      expect(userData.role).toBe(UserRole.ADMIN);
      expect(userData.firstName).toBeDefined();
      expect(userData.lastName).toBeDefined();
      expect(userData.password).toMatch(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      );
    });

    it('should test AuthFactory in isolation - only auth data generation', () => {
      // Arrange: AuthFactory only handles auth data generation
      const loginData = AuthFactory.loginInput({
        email: 'user@example.com',
      });

      const authResponse = AuthFactory.authResponse();

      // Assert: Verify factory creates valid auth data
      expect(loginData.email).toBe('user@example.com');
      expect(loginData.password).toBeDefined();

      TestAssertions.assertValidAuthResponse(authResponse);
    });
  });

  describe('2. Open/Closed Principle (OCP) Testing', () => {
    it('should extend UserFactory without modification - new user types', () => {
      // Demonstrate OCP: Can create new user types without modifying factory
      const testUsers = {
        // Standard factory usage
        regularUser: UserFactory.mockUser(),

        // Extended for specific scenarios without modifying factory
        verifiedUser: UserFactory.mockUser({
          isEmailVerified: true,
          provider: AuthProvider.LOCAL,
        }),

        oauthUser: UserFactory.mockUserWithOAuth(AuthProvider.GOOGLE),

        adminUser: UserFactory.mockAdminUser(),

        // Extended for edge cases
        edgeCaseUser: UserFactory.edgeCaseUsers().userWithSpecialCharacters,
      };

      // Assert: All user types are valid and different
      Object.values(testUsers).forEach((user) => {
        TestAssertions.assertValidUser(user);
      });

      expect(testUsers.verifiedUser.isEmailVerified).toBe(true);
      expect(testUsers.oauthUser.provider).toBe(AuthProvider.GOOGLE);
      expect(testUsers.adminUser.role).toBe(UserRole.ADMIN);
    });
  });

  describe('3. Liskov Substitution Principle (LSP) Testing', () => {
    it('should allow substitution of different user implementations', () => {
      // Demonstrate LSP: Different user objects can be substituted
      const userTypes = [
        UserFactory.mockUser({ role: UserRole.USER }),
        UserFactory.mockAdminUser(),
        UserFactory.mockUserWithOAuth(AuthProvider.GITHUB),
        UserFactory.mockInactiveUser(),
      ];

      // All user types should work with the same service methods
      userTypes.forEach((user, index) => {
        // Mock repository response
        jest.spyOn(userRepository, 'findById').mockResolvedValueOnce(user);

        // Act: Each user type should work with the same service method
        expect(async () => {
          const result = await userRepository.findById(user.id);
          TestAssertions.assertValidUser(result);
        }).not.toThrow();
      });
    });
  });

  describe('4. Interface Segregation Principle (ISP) Testing', () => {
    it('should test focused interfaces with specific factories', () => {
      // Demonstrate ISP: Each factory serves specific interface needs

      // Password service only needs password-related data
      const passwordData = {
        plainPassword: 'TestPassword123!',
        hashedPassword: passwordService.hashPassword('TestPassword123!'),
      };

      // Token service only needs token-related data
      const tokenData = {
        accessToken: AuthFactory.generateJWT('access'),
        refreshToken: AuthFactory.generateJWT('refresh'),
        expiredToken: AuthFactory.expiredJWT(),
      };

      // User service needs user-specific data
      const userData = UserFactory.createUserInput();

      // Assert: Each service gets only the data it needs
      expect(passwordData.plainPassword).toBeDefined();
      expect(tokenData.accessToken).toBeDefined();
      expect(userData.email).toBeDefined();

      // Verify JWT structure
      TestAssertions.assertValidJWT(tokenData.accessToken);
      TestAssertions.assertValidJWT(tokenData.refreshToken);
    });
  });

  describe('5. Dependency Inversion Principle (DIP) Testing', () => {
    it('should test with mocked dependencies using factories', async () => {
      // Demonstrate DIP: Service depends on abstractions, not concretions
      const mockUser = UserFactory.mockUser();
      const mockCreateInput = UserFactory.createUserInput();

      // Mock dependencies (abstractions)
      jest.spyOn(userRepository, 'emailExists').mockResolvedValue(false);
      jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);

      // Act: Service uses injected dependencies
      const result = await userService.createUser(mockCreateInput);

      // Assert: Service worked with mocked abstractions
      expect(result).toBeDefined();
      expect(userRepository.emailExists).toHaveBeenCalledWith(
        mockCreateInput.email,
      );
      expect(userRepository.create).toHaveBeenCalled();
    });
  });

  describe('6. Realistic Scenario Testing with Faker', () => {
    it('should test complete user registration flow', async () => {
      // Arrange: Use realistic scenario data
      const registrationData = UserFactory.mockUserForScenario('registration');
      const createInput = UserFactory.createUserInput({
        email: registrationData.email,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
      });

      // Mock dependencies with realistic responses
      jest.spyOn(userRepository, 'emailExists').mockResolvedValue(false);
      jest.spyOn(userRepository, 'create').mockResolvedValue(registrationData);

      // Act
      const result = await userService.createUser(createInput);

      // Assert: Realistic data flows correctly
      TestAssertions.assertValidUser(result);
      expect(result.email).toBe(createInput.email);
      expect(result.isActive).toBe(true);
      expect(result.isEmailVerified).toBe(false); // New registrations aren't verified
    });

    it('should test authentication scenarios', () => {
      // Arrange: Use pre-defined realistic scenarios
      const scenarios = AuthFactory.authScenarios();

      // Assert: All scenarios have valid structure
      expect(scenarios.validLogin.email).toBe('test@example.com');
      expect(scenarios.validLogin.password).toBe('Test123!@#');

      expect(scenarios.invalidEmail.email).toBe('invalid-email');

      expect(scenarios.weakPassword.password).toBe('123');

      TestAssertions.assertValidUser(scenarios.adminAuth.user);
      expect(scenarios.adminAuth.user.role).toBe(UserRole.ADMIN);
    });
  });

  describe('7. Performance Testing with Large Datasets', () => {
    it('should handle large datasets efficiently', () => {
      const startTime = performance.now();

      // Generate large dataset
      const largeDataset = {
        users: UserFactory.mockUsers(1000),
        logins: Array.from({ length: 1000 }, () => AuthFactory.loginInput()),
        paginatedUsers: UserFactory.mockPaginatedUsers(1, 100),
      };

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Assert: Large dataset generated efficiently
      expect(largeDataset.users).toHaveLength(1000);
      expect(largeDataset.logins).toHaveLength(1000);
      expect(largeDataset.paginatedUsers.data).toHaveLength(100);

      // Performance assertion (should complete within reasonable time)
      expect(executionTime).toBeLessThan(5000); // 5 seconds max

      console.log(
        `Generated 2100+ test objects in ${executionTime.toFixed(2)}ms`,
      );
    });
  });

  describe('8. Edge Case Testing', () => {
    it('should handle edge cases with specialized factory methods', () => {
      // Arrange: Use edge case generators
      const edgeCases = UserFactory.edgeCaseUsers();
      const authErrors = AuthFactory.authErrors();

      // Assert: Edge cases are properly structured
      expect(edgeCases.userWithLongEmail.email.length).toBeGreaterThan(100);
      expect(edgeCases.userWithSpecialCharacters.firstName).toBe('José-María');
      expect(edgeCases.userWithMinimalData.email).toBe('a@b.co');
      expect(edgeCases.userWithUnicodeData.firstName).toBe('王小明');

      // Verify error scenarios
      expect(authErrors.unauthorizedError.statusCode).toBe(401);
      expect(authErrors.forbiddenError.statusCode).toBe(403);
      expect(authErrors.invalidCredentials.message).toBe(
        'Invalid email or password',
      );
    });
  });

  describe('9. Deterministic vs Random Testing', () => {
    it('should produce consistent results with seeded data', () => {
      // Arrange: Seed with specific value
      UserFactory.seed(99999);
      const user1 = UserFactory.mockUser();

      // Reset and use same seed
      UserFactory.seed(99999);
      const user2 = UserFactory.mockUser();

      // Assert: Same seed produces identical data
      expect(user1.email).toBe(user2.email);
      expect(user1.firstName).toBe(user2.firstName);
      expect(user1.lastName).toBe(user2.lastName);
    });

    it('should produce different results with random data', () => {
      // Arrange: Use random data
      UserFactory.reset();
      const user1 = UserFactory.mockUser();

      UserFactory.reset();
      const user2 = UserFactory.mockUser();

      // Assert: Random data produces different results
      expect(user1.email).not.toBe(user2.email);
      // Note: There's a small chance they could be the same by coincidence
    });
  });

  describe('10. Type Safety and Validation', () => {
    it('should maintain type safety with factory overrides', () => {
      // Arrange: Use typed overrides
      const typedUser = UserFactory.mockUser({
        role: UserRole.ADMIN, // Type-safe enum
        isActive: true, // Type-safe boolean
        email: 'typed@test.com', // Type-safe string
      });

      const typedAuth = AuthFactory.authResponse({
        user: typedUser,
        accessToken: 'custom-token',
      });

      // Assert: Type safety maintained
      expect(typedUser.role).toBe(UserRole.ADMIN);
      expect(typedUser.isActive).toBe(true);
      expect(typedAuth.user.email).toBe('typed@test.com');
      expect(typedAuth.accessToken).toBe('custom-token');
    });
  });
});

/**
 * Additional Examples for Different Test Types
 */

describe('Integration Testing Examples with Faker', () => {
  beforeEach(() => {
    TestDataSeeder.seedDeterministic(54321);
  });

  it('should test end-to-end user flow with realistic data', async () => {
    // This would be an actual integration test with real services
    const userData = UserFactory.createUserInput({
      email: 'integration@test.com',
    });

    const authData = AuthFactory.loginInput({
      email: userData.email,
      password: userData.password,
    });

    // Assert: Data consistency across factories
    expect(userData.email).toBe(authData.email);
    expect(userData.password).toBe(authData.password);
  });
});

describe('Unit Testing Examples with Faker', () => {
  it('should test individual methods with isolated data', () => {
    // Test password service with generated data
    const userData = UserFactory.createUserInput();

    expect(userData.password).toBeDefined();
    expect(userData.password!.length).toBeGreaterThanOrEqual(6);
  });

  it('should test token generation with mock payload', () => {
    const token = AuthFactory.generateJWT('access');

    TestAssertions.assertValidJWT(token);

    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    expect(payload.sub).toBeDefined();
    expect(payload.email).toBeDefined();
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });
});
