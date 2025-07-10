import 'reflect-metadata';

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.DATABASE_URL = 'mongodb://localhost:27017/nestjs-test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret';

// Global test utilities for automatic cleanup
beforeEach(() => {
  // Clear all timers before each test
  jest.clearAllTimers();

  // Reset all mocks
  jest.clearAllMocks();
});

// Global test helpers - Custom Jest matcher types
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeValidObjectId(): R;
      toBeValidJWT(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      message: () => `expected ${received} to be a valid Date object`,
      pass,
    };
  },

  toBeValidObjectId(received: any) {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const pass = typeof received === 'string' && objectIdRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid MongoDB ObjectId`,
      pass,
    };
  },

  toBeValidJWT(received: any) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = typeof received === 'string' && jwtRegex.test(received);
    return {
      message: () => `expected ${received} to be a valid JWT token`,
      pass,
    };
  },
});

// Mock console methods to reduce noise during testing
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

console.error = (...args: any[]) => {
  // Only log actual errors, not expected test errors
  if (
    !args.some(
      (arg) =>
        typeof arg === 'string' &&
        (arg.includes('Test error') || arg.includes('Expected')),
    )
  ) {
    originalConsoleError(...args);
  }
};

console.warn = (...args: any[]) => {
  // Only log warnings that aren't from test scenarios
  if (!args.some((arg) => typeof arg === 'string' && arg.includes('Test'))) {
    originalConsoleWarn(...args);
  }
};

console.log = (...args: any[]) => {
  // Only log in verbose mode or for important messages
  if (
    process.env.JEST_VERBOSE === 'true' ||
    args.some((arg) => typeof arg === 'string' && arg.includes('IMPORTANT'))
  ) {
    originalConsoleLog(...args);
  }
};

// Restore console methods after tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Mock Date.now for consistent testing
const mockDateNow = jest.spyOn(Date, 'now');
mockDateNow.mockReturnValue(new Date('2024-01-01T00:00:00.000Z').getTime());

// Global test database cleanup
beforeAll(async () => {
  // Setup test database if needed
});

afterAll(async () => {
  // Cleanup test database if needed
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
