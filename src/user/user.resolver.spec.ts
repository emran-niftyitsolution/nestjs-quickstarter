import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  clearAllMocks,
  expectMockToHaveBeenCalledWith,
  mockAdminUser,
  mockGraphQLContext,
  mockPaginationResult,
  mockUser,
  mockUserService,
} from '../test/test-utils';
import { UserResolver } from './user.resolver';
import { UserRole } from './user.schema';
import { UserService } from './user.service';

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

  describe('users', () => {
    const paginationInput = {
      page: 1,
      limit: 10,
      search: 'test',
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
    };

    it('should return paginated users for admin', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      userService.findAll.mockResolvedValue({
        docs: [mockUser],
        pagination: {
          totalDocs: 1,
          limit: 10,
          page: 1,
          totalPages: 1,
          hasPrevPage: false,
          hasNextPage: false,
          prevPage: null,
          nextPage: null,
        },
      });

      const result = await resolver.users(paginationInput, adminContext);

      expectMockToHaveBeenCalledWith(userService.findAll, paginationInput);
      expect(result.docs).toEqual([mockUser]);
      expect(result.pagination.totalDocs).toBe(1);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      const userContext = { req: { user: mockUser } };

      await expect(
        resolver.users(paginationInput, userContext),
      ).rejects.toThrow(ForbiddenException);
      expect(userService.findAll).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      userService.findAll.mockRejectedValue(new Error('Database error'));

      await expect(
        resolver.users(paginationInput, adminContext),
      ).rejects.toThrow('Database error');
    });
  });

  describe('user', () => {
    it('should return user by id for admin', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      userService.findOne.mockResolvedValue(mockUser);

      const result = await resolver.user(mockUser.id, adminContext);

      expectMockToHaveBeenCalledWith(userService.findOne, mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should return own user profile for regular user', async () => {
      const userContext = { req: { user: mockUser } };
      userService.findOne.mockResolvedValue(mockUser);

      const result = await resolver.user(mockUser.id, userContext);

      expectMockToHaveBeenCalledWith(userService.findOne, mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw ForbiddenException when regular user tries to access other user', async () => {
      const userContext = { req: { user: mockUser } };
      const otherUserId = 'other-user-id';

      await expect(resolver.user(otherUserId, userContext)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userService.findOne).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      userService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(resolver.user('nonexistent', adminContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('me', () => {
    it('should return current user profile', async () => {
      userService.findOne.mockResolvedValue(mockUser);

      const result = await resolver.me(mockGraphQLContext);

      expectMockToHaveBeenCalledWith(userService.findOne, mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should handle user not found', async () => {
      userService.findOne.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(resolver.me(mockGraphQLContext)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createUser', () => {
    const createUserInput = {
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      password: 'password123',
    };

    it('should create user successfully for admin', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      const newUser = { ...mockUser, ...createUserInput };
      userService.create.mockResolvedValue(newUser);

      const result = await resolver.createUser(createUserInput, adminContext);

      expectMockToHaveBeenCalledWith(userService.create, createUserInput);
      expect(result.email).toBe(createUserInput.email);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      const userContext = { req: { user: mockUser } };

      await expect(
        resolver.createUser(createUserInput, userContext),
      ).rejects.toThrow(ForbiddenException);
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      userService.create.mockRejectedValue(new Error('Email already exists'));

      await expect(
        resolver.createUser(createUserInput, adminContext),
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('updateUser', () => {
    const updateUserInput = {
      id: mockUser.id,
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user successfully for admin', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      const updatedUser = { ...mockUser, ...updateUserInput };
      userService.update.mockResolvedValue(updatedUser);

      const result = await resolver.updateUser(updateUserInput, adminContext);

      expectMockToHaveBeenCalledWith(userService.update, updateUserInput);
      expect(result.firstName).toBe(updateUserInput.firstName);
    });

    it('should allow users to update their own profile', async () => {
      const userContext = { req: { user: mockUser } };
      const updatedUser = { ...mockUser, ...updateUserInput };
      userService.update.mockResolvedValue(updatedUser);

      const result = await resolver.updateUser(updateUserInput, userContext);

      expectMockToHaveBeenCalledWith(userService.update, updateUserInput);
      expect(result.firstName).toBe(updateUserInput.firstName);
    });

    it('should throw ForbiddenException when regular user tries to update other user', async () => {
      const userContext = { req: { user: mockUser } };
      const otherUserUpdate = { ...updateUserInput, id: 'other-user-id' };

      await expect(
        resolver.updateUser(otherUserUpdate, userContext),
      ).rejects.toThrow(ForbiddenException);
      expect(userService.update).not.toHaveBeenCalled();
    });

    it('should prevent regular users from updating role', async () => {
      const userContext = { req: { user: mockUser } };
      const roleUpdateInput = { ...updateUserInput, role: UserRole.ADMIN };

      await expect(
        resolver.updateUser(roleUpdateInput, userContext),
      ).rejects.toThrow(ForbiddenException);
      expect(userService.update).not.toHaveBeenCalled();
    });

    it('should allow admin to update user role', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      const roleUpdateInput = { ...updateUserInput, role: UserRole.MODERATOR };
      const updatedUser = { ...mockUser, role: UserRole.MODERATOR };
      userService.update.mockResolvedValue(updatedUser);

      const result = await resolver.updateUser(roleUpdateInput, adminContext);

      expectMockToHaveBeenCalledWith(userService.update, roleUpdateInput);
      expect(result.role).toBe(UserRole.MODERATOR);
    });

    it('should handle update errors', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      userService.update.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        resolver.updateUser(updateUserInput, adminContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully for admin', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      userService.remove.mockResolvedValue(true);

      const result = await resolver.deleteUser(mockUser.id, adminContext);

      expectMockToHaveBeenCalledWith(userService.remove, mockUser.id);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      const userContext = { req: { user: mockUser } };

      await expect(
        resolver.deleteUser(mockUser.id, userContext),
      ).rejects.toThrow(ForbiddenException);
      expect(userService.remove).not.toHaveBeenCalled();
    });

    it('should prevent admin from deleting themselves', async () => {
      const adminContext = { req: { user: mockAdminUser } };

      await expect(
        resolver.deleteUser(mockAdminUser.id, adminContext),
      ).rejects.toThrow(ForbiddenException);
      expect(userService.remove).not.toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      userService.remove.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(
        resolver.deleteUser(mockUser.id, adminContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Access control tests', () => {
    it('should properly enforce role-based access control', async () => {
      const moderatorUser = { ...mockUser, role: UserRole.MODERATOR };
      const moderatorContext = { req: { user: moderatorUser } };

      // Moderators should be able to view users
      userService.findAll.mockResolvedValue({
        docs: [mockUser],
        pagination: mockPaginationResult,
      });

      const usersResult = await resolver.users({}, moderatorContext);
      expect(usersResult.docs).toEqual([mockUser]);

      // But not delete users
      await expect(
        resolver.deleteUser(mockUser.id, moderatorContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle missing user in context', async () => {
      const emptyContext = { req: {} };

      await expect(resolver.me(emptyContext)).rejects.toThrow();
    });

    it('should validate user permissions correctly', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const inactiveContext = { req: { user: inactiveUser } };

      // Should still allow access to own profile even if inactive
      userService.findOne.mockResolvedValue(inactiveUser);
      const result = await resolver.me(inactiveContext);
      expect(result).toEqual(inactiveUser);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty pagination input', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      userService.findAll.mockResolvedValue({
        docs: [],
        pagination: { ...mockPaginationResult, docs: [], totalDocs: 0 },
      });

      const result = await resolver.users({}, adminContext);

      expect(userService.findAll).toHaveBeenCalledWith({});
      expect(result.docs).toEqual([]);
    });

    it('should handle malformed user input', async () => {
      const adminContext = { req: { user: mockAdminUser } };
      const malformedInput = { email: 'invalid-email' };

      userService.create.mockRejectedValue(new Error('Invalid email format'));

      await expect(
        resolver.createUser(malformedInput, adminContext),
      ).rejects.toThrow('Invalid email format');
    });

    it('should handle concurrent update attempts', async () => {
      const userContext = { req: { user: mockUser } };
      const updateInput = { id: mockUser.id, firstName: 'Concurrent' };

      userService.update.mockRejectedValue(new Error('Version conflict'));

      await expect(
        resolver.updateUser(updateInput, userContext),
      ).rejects.toThrow('Version conflict');
    });
  });
});
