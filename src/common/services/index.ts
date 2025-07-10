/**
 * SOLID Services Export Index
 *
 * This file exports all services following SOLID principles:
 * - Single Responsibility Principle: Each service has one responsibility
 * - Open/Closed Principle: Services can be extended without modification
 * - Dependency Inversion Principle: Services depend on abstractions
 */

// Core Services implementing SOLID principles
export { PasswordService } from './password.service';
export { TokenService } from './token.service';

/**
 * Service Usage Examples:
 *
 * // Import services
 * import { PasswordService, TokenService } from '@common/services';
 *
 * // Use in dependency injection
 * @Module({
 *   providers: [
 *     PasswordService,
 *     TokenService,
 *     // Bind to interfaces for DIP
 *     {
 *       provide: 'IPasswordService',
 *       useClass: PasswordService,
 *     },
 *     {
 *       provide: 'ITokenService',
 *       useClass: TokenService,
 *     },
 *   ],
 * })
 * export class CommonModule {}
 */
