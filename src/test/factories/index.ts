/**
 * Test Data Factories Index
 *
 * This file exports all Faker-based test data factories following SOLID principles:
 * - Single Responsibility: Each factory handles one entity type
 * - Open/Closed: Factories can be extended without modification
 * - Interface Segregation: Focused factory methods for specific use cases
 */

// Core test data factories
export { AuthFactory } from './auth.factory';
export { UserFactory } from './user.factory';

/**
 * Factory Usage Examples:
 *
 * // Import factories
 * import { UserFactory, AuthFactory } from '@test/factories';
 *
 * // Use in tests with deterministic seeding
 * beforeEach(() => {
 *   UserFactory.seed(12345); // Deterministic test data
 *   AuthFactory.seed(12345);
 * });
 *
 * // Generate test data
 * const user = UserFactory.mockUser({ role: UserRole.ADMIN });
 * const authResponse = AuthFactory.authResponse({ user });
 * const loginInput = AuthFactory.loginInput({ email: 'test@example.com' });
 *
 * // Use scenario-based data
 * const registrationUser = UserFactory.mockUserForScenario('registration');
 * const authScenarios = AuthFactory.authScenarios();
 *
 * // Generate multiple items
 * const users = UserFactory.mockUsers(5, { isActive: true });
 * const paginatedUsers = UserFactory.mockPaginatedUsers(1, 10);
 *
 * // Reset between tests
 * afterEach(() => {
 *   UserFactory.reset();
 *   AuthFactory.reset();
 * });
 */

/**
 * Best Practices for Using Factories:
 *
 * 1. **Deterministic Testing**:
 *    - Always seed Faker for consistent test results
 *    - Use specific overrides for test-specific data
 *
 * 2. **Realistic Data**:
 *    - Factories generate realistic, valid data by default
 *    - Use edge case methods for boundary testing
 *
 * 3. **Performance**:
 *    - Generate only the data you need for each test
 *    - Reset factory state between tests to avoid interference
 *
 * 4. **Maintainability**:
 *    - Use factory methods instead of manual object creation
 *    - Leverage scenario-based methods for common test patterns
 *
 * 5. **Type Safety**:
 *    - All factories are fully typed with TypeScript
 *    - Override objects are type-checked for safety
 */
