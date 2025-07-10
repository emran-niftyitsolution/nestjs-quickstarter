const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  // Test environment
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Module resolution
  roots: ['<rootDir>/src'],
  modulePaths: ['<rootDir>/src'],
  moduleNameMapping: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/src/',
  }),

  // File patterns
  testMatch: ['**/__tests__/**/*.(test|spec).ts', '**/*.(test|spec).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],

  // Transform settings
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/**/*.d.ts',
    '!src/test/**/*',
  ],

  // Coverage settings
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/src/test/jest.setup.ts'],

  // Performance
  maxWorkers: '50%',
  testTimeout: 30000,

  // Error handling
  verbose: true,
  silent: false,

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true,
    },
  },

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // Additional Jest configuration for NestJS
  testResultsProcessor: 'jest-sonar-reporter',

  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/', '/.git/'],
};
