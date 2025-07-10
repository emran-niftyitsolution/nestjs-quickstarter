import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Test, TestingModule } from '@nestjs/testing';
import {
  clearAllMocks,
  createMockExecutionContext,
  createMockGqlExecutionContext,
  mockReflector,
  mockUser,
} from '../../test/test-utils';
import { JwtAuthGuard } from './jwt-auth.guard';

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

  describe('canActivate', () => {
    describe('Public routes', () => {
      it('should allow access to public routes without authentication', async () => {
        const context = createMockExecutionContext();
        reflector.getAllAndOverride.mockReturnValue(true); // Route is marked as public

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          context.getHandler(),
          context.getClass(),
        ]);
      });

      it('should check both handler and class for public metadata', async () => {
        const context = createMockExecutionContext();
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          context.getHandler(),
          context.getClass(),
        ]);
      });
    });

    describe('HTTP context', () => {
      it('should allow access with valid authenticated user', async () => {
        const context = createMockExecutionContext(mockUser, 'http');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should deny access without authenticated user', async () => {
        const context = createMockExecutionContext(null, 'http');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should deny access with undefined user', async () => {
        const context = createMockExecutionContext(undefined, 'http');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('GraphQL context', () => {
      beforeEach(() => {
        // Mock GqlExecutionContext.create
        jest
          .spyOn(GqlExecutionContext, 'create')
          .mockImplementation(createMockGqlExecutionContext(mockUser).create);
      });

      it('should allow access with valid authenticated user in GraphQL', async () => {
        const context = createMockExecutionContext(mockUser, 'graphql');
        context.getType = jest.fn(() => 'graphql');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(GqlExecutionContext.create).toHaveBeenCalledWith(context);
      });

      it('should deny access without authenticated user in GraphQL', async () => {
        jest
          .spyOn(GqlExecutionContext, 'create')
          .mockImplementation(createMockGqlExecutionContext(null).create);

        const context = createMockExecutionContext(null, 'graphql');
        context.getType = jest.fn(() => 'graphql');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should handle GraphQL context extraction correctly', async () => {
        const context = createMockExecutionContext(mockUser, 'graphql');
        context.getType = jest.fn(() => 'graphql');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(context.getType).toHaveBeenCalled();
        expect(GqlExecutionContext.create).toHaveBeenCalledWith(context);
      });
    });

    describe('Context type detection', () => {
      it('should handle unknown context types', async () => {
        const context = createMockExecutionContext(mockUser, 'http');
        context.getType = jest.fn(() => 'unknown' as any);
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        // Should default to HTTP context behavior
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
      });

      it('should prioritize public route check over context type', async () => {
        const context = createMockExecutionContext(null, 'http');
        context.getType = jest.fn(() => 'graphql');
        reflector.getAllAndOverride.mockReturnValue(true); // Public route

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        // Should not even check context type for public routes
        expect(context.getType).not.toHaveBeenCalled();
      });
    });

    describe('Error scenarios', () => {
      it('should throw UnauthorizedException with correct message', async () => {
        const context = createMockExecutionContext(null, 'http');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        await expect(guard.canActivate(context)).rejects.toThrow(
          expect.objectContaining({
            message: 'Unauthorized',
          }),
        );
      });

      it('should handle reflector errors gracefully', async () => {
        const context = createMockExecutionContext(mockUser, 'http');
        reflector.getAllAndOverride.mockImplementation(() => {
          throw new Error('Reflector error');
        });

        // Should default to requiring authentication if reflector fails
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should handle context switching errors', async () => {
        const context = createMockExecutionContext(mockUser, 'http');
        context.switchToHttp = jest.fn().mockImplementation(() => {
          throw new Error('Context switch error');
        });
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        await expect(guard.canActivate(context)).rejects.toThrow(
          'Context switch error',
        );
      });
    });

    describe('Authentication edge cases', () => {
      it('should handle user with falsy id', async () => {
        const userWithFalsyId = { ...mockUser, id: '' };
        const context = createMockExecutionContext(userWithFalsyId, 'http');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should handle user object without id property', async () => {
        const userWithoutId = { email: 'test@example.com', name: 'Test User' };
        const context = createMockExecutionContext(userWithoutId, 'http');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should handle empty user object', async () => {
        const emptyUser = {};
        const context = createMockExecutionContext(emptyUser, 'http');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should accept valid user with all required properties', async () => {
        const validUser = {
          id: '12345',
          email: 'test@example.com',
          role: 'USER',
        };
        const context = createMockExecutionContext(validUser, 'http');
        reflector.getAllAndOverride.mockReturnValue(false); // Not public

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('Integration with decorators', () => {
      it('should work correctly with @Public decorator', async () => {
        const context = createMockExecutionContext(null, 'http');
        reflector.getAllAndOverride.mockReturnValue(true); // Simulates @Public() decorator

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          context.getHandler(),
          context.getClass(),
        ]);
      });

      it('should check both method and class level decorators', async () => {
        const context = createMockExecutionContext(mockUser, 'http');
        reflector.getAllAndOverride.mockReturnValue(false); // No @Public decorator

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          context.getHandler(), // Method level
          context.getClass(), // Class level
        ]);
      });
    });

    describe('Performance considerations', () => {
      it('should short-circuit on public routes without further checks', async () => {
        const context = createMockExecutionContext(null, 'http');
        reflector.getAllAndOverride.mockReturnValue(true); // Public route

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        // Should not call context type or user extraction methods
        expect(context.getType).not.toHaveBeenCalled();
        expect(context.switchToHttp).not.toHaveBeenCalled();
      });

      it('should cache reflector results efficiently', async () => {
        const context = createMockExecutionContext(mockUser, 'http');
        reflector.getAllAndOverride.mockReturnValue(false);

        await guard.canActivate(context);

        expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
      });
    });
  });
});
