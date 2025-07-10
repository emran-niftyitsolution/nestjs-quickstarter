import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
  clearAllMocks,
  createMockExecutionContext,
  mockAdminUser,
  mockReflector,
  mockUser,
} from '../../test/test-utils';
import { UserRole } from '../../user/user.schema';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);

    clearAllMocks();
  });

  describe('canActivate', () => {
    describe('No roles required', () => {
      it('should allow access when no roles are required', async () => {
        const context = createMockExecutionContext(mockUser);
        reflector.getAllAndOverride.mockReturnValue(undefined); // No roles required

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
          context.getHandler(),
          context.getClass(),
        ]);
      });

      it('should allow access when empty roles array is specified', async () => {
        const context = createMockExecutionContext(mockUser);
        reflector.getAllAndOverride.mockReturnValue([]); // Empty roles array

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });
    });

    describe('Role-based access control', () => {
      it('should allow access when user has required role', async () => {
        const context = createMockExecutionContext(mockUser); // USER role
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access when user has admin role for any requirement', async () => {
        const context = createMockExecutionContext(mockAdminUser); // ADMIN role
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.USER,
          UserRole.MODERATOR,
        ]);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow access when user has one of multiple required roles', async () => {
        const moderatorUser = { ...mockUser, role: UserRole.MODERATOR };
        const context = createMockExecutionContext(moderatorUser);
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.MODERATOR,
        ]);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should deny access when user does not have required role', async () => {
        const context = createMockExecutionContext(mockUser); // USER role
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should deny access when user role is not in required roles list', async () => {
        const context = createMockExecutionContext(mockUser); // USER role
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.ADMIN,
          UserRole.MODERATOR,
        ]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('User validation', () => {
      it('should throw ForbiddenException when user is null', async () => {
        const context = createMockExecutionContext(null);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should throw ForbiddenException when user is undefined', async () => {
        const context = createMockExecutionContext(undefined);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should throw ForbiddenException when user has no role property', async () => {
        const userWithoutRole = { id: '123', email: 'test@example.com' };
        const context = createMockExecutionContext(userWithoutRole);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should throw ForbiddenException when user role is null', async () => {
        const userWithNullRole = { ...mockUser, role: null };
        const context = createMockExecutionContext(userWithNullRole);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should throw ForbiddenException when user role is undefined', async () => {
        const userWithUndefinedRole = { ...mockUser, role: undefined };
        const context = createMockExecutionContext(userWithUndefinedRole);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('Role hierarchy', () => {
      it('should respect admin having access to user-only endpoints', async () => {
        const context = createMockExecutionContext(mockAdminUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should respect admin having access to moderator-only endpoints', async () => {
        const context = createMockExecutionContext(mockAdminUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.MODERATOR]);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should not allow users to access admin-only endpoints', async () => {
        const context = createMockExecutionContext(mockUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should not allow moderators to access admin-only endpoints', async () => {
        const moderatorUser = { ...mockUser, role: UserRole.MODERATOR };
        const context = createMockExecutionContext(moderatorUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('Multiple roles requirements', () => {
      it('should allow access when user has any of the required roles', async () => {
        const context = createMockExecutionContext(mockUser); // USER role
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.USER,
          UserRole.MODERATOR,
          UserRole.ADMIN,
        ]);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should allow moderator access to user/moderator endpoints', async () => {
        const moderatorUser = { ...mockUser, role: UserRole.MODERATOR };
        const context = createMockExecutionContext(moderatorUser);
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.USER,
          UserRole.MODERATOR,
        ]);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should deny access when user has none of the required roles', async () => {
        const context = createMockExecutionContext(mockUser); // USER role
        reflector.getAllAndOverride.mockReturnValue([
          UserRole.MODERATOR,
          UserRole.ADMIN,
        ]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('GraphQL context support', () => {
      it('should work with GraphQL context', async () => {
        const context = createMockExecutionContext(mockUser, 'graphql');
        context.getType = jest.fn(() => 'graphql');
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should handle GraphQL context without user', async () => {
        const context = createMockExecutionContext(null, 'graphql');
        context.getType = jest.fn(() => 'graphql');
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('Error handling', () => {
      it('should throw ForbiddenException with appropriate message', async () => {
        const context = createMockExecutionContext(mockUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          expect.objectContaining({
            message: 'Forbidden resource',
          }),
        );
      });

      it('should handle reflector errors gracefully', async () => {
        const context = createMockExecutionContext(mockUser);
        reflector.getAllAndOverride.mockImplementation(() => {
          throw new Error('Reflector error');
        });

        // Should default to allowing access if roles cannot be determined
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should handle context extraction errors', async () => {
        const context = createMockExecutionContext(mockUser);
        context.switchToHttp = jest.fn().mockImplementation(() => {
          throw new Error('Context error');
        });
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          'Context error',
        );
      });
    });

    describe('Integration with decorators', () => {
      it('should work with @Roles decorator on method level', async () => {
        const context = createMockExecutionContext(mockAdminUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]); // @Roles('ADMIN')

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
          context.getHandler(),
          context.getClass(),
        ]);
      });

      it('should work with @Roles decorator on class level', async () => {
        const context = createMockExecutionContext(mockUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]); // @Roles('USER') on class

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
          context.getHandler(), // Method level (empty)
          context.getClass(), // Class level (has roles)
        ]);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty string role', async () => {
        const userWithEmptyRole = { ...mockUser, role: '' };
        const context = createMockExecutionContext(userWithEmptyRole);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should handle invalid role value', async () => {
        const userWithInvalidRole = { ...mockUser, role: 'INVALID_ROLE' };
        const context = createMockExecutionContext(userWithInvalidRole);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should handle numeric role values', async () => {
        const userWithNumericRole = { ...mockUser, role: 123 };
        const context = createMockExecutionContext(userWithNumericRole);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('should handle object role values', async () => {
        const userWithObjectRole = { ...mockUser, role: { name: 'USER' } };
        const context = createMockExecutionContext(userWithObjectRole);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });

    describe('Performance considerations', () => {
      it('should short-circuit when no roles are required', async () => {
        const context = createMockExecutionContext(mockUser);
        reflector.getAllAndOverride.mockReturnValue(undefined);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        // Should not extract user when no roles are required
        expect(context.switchToHttp).not.toHaveBeenCalled();
      });

      it('should efficiently check role membership', async () => {
        const context = createMockExecutionContext(mockUser);
        reflector.getAllAndOverride.mockReturnValue([UserRole.USER]);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
      });
    });
  });
});
