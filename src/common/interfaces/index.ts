/**
 * SOLID Interfaces Export Index
 *
 * This file exports all interfaces following SOLID principles:
 * - Interface Segregation Principle: Focused, specific interfaces
 * - Dependency Inversion Principle: Abstractions for dependency injection
 */

// User Operation Interfaces
export { IUserRepository, IUserService } from './user-operations.interface';

// Authentication Operation Interfaces
export {
  IAuthService,
  IOAuthService,
  IPasswordService,
  ISessionService,
  ITokenService,
} from './auth-operations.interface';

/**
 * Interface Usage Examples:
 *
 * // Dependency Injection with interfaces
 * constructor(
 *   private readonly userService: IUserService,
 *   private readonly passwordService: IPasswordService,
 *   private readonly tokenService: ITokenService,
 * ) {}
 *
 * // Module provider configuration
 * @Module({
 *   providers: [
 *     {
 *       provide: 'IUserService',
 *       useClass: UserBusinessService,
 *     },
 *     {
 *       provide: 'IPasswordService',
 *       useClass: PasswordService,
 *     },
 *   ],
 * })
 */
