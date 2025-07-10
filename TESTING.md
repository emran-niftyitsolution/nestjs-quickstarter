# Testing Guide

## Overview

This project includes comprehensive unit tests for all major components using Jest and NestJS testing utilities. The test suite covers:

- **Services**: UserService, AuthService with full CRUD operations and business logic
- **Resolvers**: UserResolver, AuthResolver with GraphQL operations
- **Guards**: JwtAuthGuard, RolesGuard with authentication and authorization
- **Interceptors**: LoggingInterceptor, TransformInterceptor with request/response handling
- **Filters**: AllExceptionsFilter with error handling
- **Health Checks**: HealthController with monitoring endpoints

## Test Scripts

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test:watch

# Run tests with coverage report
bun test:cov

# Run only unit tests
bun test:unit

# Run tests for CI environment
bun test:ci

# Clear Jest cache
bun test:clear

# Debug tests
bun test:debug
```

## Test Structure

```
src/
├── test/
│   ├── test-utils.ts          # Mock utilities and test helpers
│   └── jest.setup.ts          # Global Jest configuration
├── user/
│   ├── user.service.spec.ts   # UserService unit tests
│   └── user.resolver.spec.ts  # UserResolver unit tests
├── auth/
│   ├── auth.service.spec.ts   # AuthService unit tests
│   └── auth.resolver.spec.ts  # AuthResolver unit tests
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.spec.ts    # JwtAuthGuard tests
│   │   └── roles.guard.spec.ts       # RolesGuard tests
│   ├── interceptors/
│   │   └── logging.interceptor.spec.ts  # LoggingInterceptor tests
│   └── filters/
│       └── all-exceptions.filter.spec.ts  # AllExceptionsFilter tests
└── health/
    └── health.controller.spec.ts     # HealthController tests
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

- **Environment**: Node.js with TypeScript support
- **Coverage**: 80% minimum for lines, functions, statements; 70% for branches
- **Timeout**: 30 seconds per test
- **Mocks**: Auto-cleared between tests
- **Workers**: 50% of available CPU cores

### Test Setup (`src/test/jest.setup.ts`)

- Mock environment variables for testing
- Custom Jest matchers for validation
- Global test utilities and cleanup
- Console noise reduction during tests

## Writing Tests

### Service Tests

```typescript
describe('UserService', () => {
  let service: UserService;
  let userModel: jest.Mocked<Model<HydratedDocument<User>>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userModel = module.get(getModelToken(User.name));
    clearAllMocks();
  });

  it('should create a user', async () => {
    userModel.create.mockResolvedValue(mockUser);

    const result = await service.create(createUserInput);

    expect(result).toEqual(mockUser);
    expect(userModel.create).toHaveBeenCalledWith(createUserInput);
  });
});
```

### Resolver Tests

```typescript
describe('UserResolver', () => {
  let resolver: UserResolver;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResolver,
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    resolver = module.get<UserResolver>(UserResolver);
    userService = module.get(UserService);
    clearAllMocks();
  });

  it('should return users with pagination', async () => {
    userService.findAll.mockResolvedValue(mockPaginationResult);

    const result = await resolver.users(paginationInput);

    expect(result).toEqual(mockPaginationResult);
    expect(userService.findAll).toHaveBeenCalledWith(paginationInput);
  });
});
```

### Guard Tests

```typescript
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
    clearAllMocks();
  });

  it('should allow access for authenticated users', async () => {
    const context = createMockExecutionContext(mockUser);
    reflector.getAllAndOverride.mockReturnValue(false); // Not public

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });
});
```

## Test Utilities

### Mock Objects (`src/test/test-utils.ts`)

- **mockUser**: Complete user object with all fields
- **mockUserService**: Mocked UserService with all methods
- **mockAuthService**: Mocked AuthService with authentication methods
- **mockLogger**: Mocked Winston logger
- **mockReflector**: Mocked NestJS Reflector
- **mockExecutionContext**: Factory for creating execution contexts

### Custom Matchers

```typescript
// Check if value is a valid Date object
expect(someDate).toBeValidDate();

// Check if string is a valid MongoDB ObjectId
expect(userId).toBeValidObjectId();

// Check if string is a valid JWT token
expect(accessToken).toBeValidJWT();
```

### Helper Functions

```typescript
// Clear all mocks
clearAllMocks();

// Create mock execution context
const context = createMockExecutionContext(user, 'http');

// Create mock GraphQL context
const gqlContext = createMockGqlExecutionContext(user);

// Expect mock to have been called with specific arguments
expectMockToHaveBeenCalledWith(mockFn, arg1, arg2);
```

## Test Coverage

Current coverage targets:

- **Lines**: 80% minimum
- **Functions**: 80% minimum
- **Statements**: 80% minimum
- **Branches**: 70% minimum

### Coverage Reports

```bash
# Generate HTML coverage report
bun test:cov

# View coverage report
open coverage/lcov-report/index.html
```

## Best Practices

### 1. Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names that explain the scenario
- Follow AAA pattern: Arrange, Act, Assert

### 2. Mocking

- Mock external dependencies (database, HTTP requests, etc.)
- Use consistent mock objects from `test-utils.ts`
- Clear mocks between tests

### 3. Assertions

- Test both success and error scenarios
- Verify function calls with correct arguments
- Assert on return values and side effects

### 4. Async Testing

- Always await async operations
- Handle promise rejections with `expect().rejects.toThrow()`
- Use proper timeout handling for long operations

### 5. Error Testing

```typescript
it('should handle validation errors', async () => {
  mockService.create.mockRejectedValue(
    new BadRequestException('Validation failed'),
  );

  await expect(resolver.createUser(invalidInput)).rejects.toThrow(
    BadRequestException,
  );
});
```

## Debugging Tests

### Debug Single Test

```bash
# Run specific test file
bun test user.service.spec.ts

# Run specific test case
bun test -t "should create user"

# Debug with Node.js inspector
bun test:debug user.service.spec.ts
```

### Common Issues

1. **Timeout errors**: Increase timeout in test or check for unresolved promises
2. **Mock issues**: Ensure mocks are cleared between tests
3. **Module errors**: Check imports and provider configuration
4. **Type errors**: Ensure proper TypeScript configuration

## Continuous Integration

Tests are configured to run in CI environments with:

- Coverage reporting
- Fail-fast on first error
- Parallel execution for speed
- Coverage upload to reporting services

```bash
# CI test command
bun test:ci
```

## Integration with Development

- Tests run automatically on file changes in watch mode
- Pre-commit hooks ensure tests pass before commits
- Coverage reports help identify untested code
- Test-driven development workflow supported

## Performance Considerations

- Mocked dependencies for fast execution
- Parallel test execution
- Optimized Jest configuration
- Database mocking to avoid I/O overhead

## Contributing

When adding new features:

1. Write tests for new functionality
2. Maintain or improve coverage percentage
3. Follow existing test patterns and conventions
4. Update this documentation for new test utilities

---

For questions about testing or to report issues with tests, please check the existing test files for examples or create an issue in the repository.
