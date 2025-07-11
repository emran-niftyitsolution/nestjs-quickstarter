import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as argon2 from 'argon2';
import {
  clearAllMocks,
  expectMockToHaveBeenCalledWith,
  mockPaginationResult,
  mockUser,
  mockUserModel,
} from '../test/test-utils';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { AuthProvider, User } from './user.schema';
import { UserService } from './user.service';

// Mock argon2
jest.mock('argon2');
const mockedArgon2 = argon2 as jest.Mocked<typeof argon2>;

describe('UserService', () => {
  let service: UserService;
  let userModel: typeof mockUserModel;

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

  describe('create', () => {
    const createUserInput: CreateUserInput = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create a new user successfully', async () => {
      userModel.findOne.mockResolvedValueOnce(null); // No existing user
      userModel.constructor.mockImplementation(() => ({
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      }));
      mockedArgon2.hash.mockResolvedValue('hashedPassword');

      const result = await service.create(createUserInput);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: createUserInput.email,
      });
      expect(mockedArgon2.hash).toHaveBeenCalledWith(createUserInput.password);
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if email already exists', async () => {
      userModel.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.create(createUserInput)).rejects.toThrow(
        ConflictException,
      );
      expectMockToHaveBeenCalledWith(userModel.findOne, {
        email: createUserInput.email,
      });
    });

    it('should throw ConflictException if username already exists', async () => {
      const inputWithUsername = { ...createUserInput, username: 'testuser' };
      userModel.findOne
        .mockResolvedValueOnce(null) // No email conflict
        .mockResolvedValueOnce(mockUser); // Username conflict

      await expect(service.create(inputWithUsername)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create user without password', async () => {
      const inputWithoutPassword = {
        email: 'test@example.com',
        firstName: 'John',
      };
      userModel.findOne.mockResolvedValueOnce(null);
      userModel.constructor.mockImplementation(() => ({
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
      }));

      const result = await service.create(inputWithoutPassword);

      expect(mockedArgon2.hash).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    const paginationInput = {
      page: 1,
      limit: 10,
      search: 'test',
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
    };

    it('should return paginated users', async () => {
      userModel.paginate.mockResolvedValue({
        docs: [mockUser],
        totalDocs: 1,
        limit: 10,
        page: 1,
        totalPages: 1,
        hasPrevPage: false,
        hasNextPage: false,
        prevPage: null,
        nextPage: null,
      });

      const result = await service.findAll(paginationInput);

      expect(userModel.paginate).toHaveBeenCalledWith(
        {
          $or: [
            { email: { $regex: 'test', $options: 'i' } },
            { firstName: { $regex: 'test', $options: 'i' } },
            { lastName: { $regex: 'test', $options: 'i' } },
            { username: { $regex: 'test', $options: 'i' } },
          ],
        },
        {
          page: 1,
          limit: 10,
          sort: { createdAt: -1 },
          select: '-password -emailVerificationToken -passwordResetToken',
        },
      );
      expect(result.docs).toEqual([mockUser]);
      expect(result.pagination.totalDocs).toBe(1);
    });

    it('should return paginated users without search', async () => {
      const inputWithoutSearch = { page: 1, limit: 10 };
      userModel.paginate.mockResolvedValue(mockPaginationResult);

      const result = await service.findAll(inputWithoutSearch);

      expect(userModel.paginate).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          page: 1,
          limit: 10,
          sort: { createdAt: -1 },
        }),
      );
      expect(result.docs).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const result = await service.findOne(mockUser.id);

      expect(userModel.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByEmail(mockUser.email);

      expectMockToHaveBeenCalledWith(userModel.findOne, {
        email: mockUser.email,
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByProvider', () => {
    it('should return a user by provider and providerId', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByProvider(
        AuthProvider.GOOGLE,
        'google-id',
      );

      expectMockToHaveBeenCalledWith(userModel.findOne, {
        provider: AuthProvider.GOOGLE,
        providerId: 'google-id',
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    const updateUserInput: UpdateUserInput = {
      id: mockUser.id,
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update a user successfully', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest
            .fn()
            .mockResolvedValue({ ...mockUser, ...updateUserInput }),
        }),
      });

      const result = await service.update(updateUserInput);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        updateUserInput.id,
        {
          firstName: updateUserInput.firstName,
          lastName: updateUserInput.lastName,
        },
        { new: true, runValidators: true },
      );
      expect(result.firstName).toBe(updateUserInput.firstName);
    });

    it('should throw NotFoundException if user not found', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.update(updateUserInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if username already taken', async () => {
      const inputWithUsername = { ...updateUserInput, username: 'taken' };
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(service.update(inputWithUsername)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should remove a user successfully', async () => {
      userModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.remove(mockUser.id);

      expectMockToHaveBeenCalledWith(userModel.findByIdAndDelete, mockUser.id);
      expect(result).toBe(true);
    });

    it('should throw NotFoundException if user not found', async () => {
      userModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockedArgon2.hash.mockResolvedValue('newHashedPassword');

      const result = await service.updatePassword(mockUser.id, 'newPassword');

      expect(mockedArgon2.hash).toHaveBeenCalledWith('newPassword');
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUser.id, {
        password: 'newHashedPassword',
      });
      expect(result).toBe(true);
    });

    it('should throw NotFoundException if user not found', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockedArgon2.hash.mockResolvedValue('newHashedPassword');

      await expect(
        service.updatePassword('nonexistent', 'newPassword'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for valid password', async () => {
      mockedArgon2.verify.mockResolvedValue(true);

      const result = await service.verifyPassword('password', 'hashedPassword');

      expect(mockedArgon2.verify).toHaveBeenCalledWith(
        'hashedPassword',
        'password',
      );
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      mockedArgon2.verify.mockResolvedValue(false);

      const result = await service.verifyPassword(
        'wrongPassword',
        'hashedPassword',
      );

      expect(result).toBe(false);
    });

    it('should return false if argon2 throws error', async () => {
      mockedArgon2.verify.mockRejectedValue(new Error('Verification failed'));

      const result = await service.verifyPassword('password', 'hashedPassword');

      expect(result).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login date', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await service.updateLastLogin(mockUser.id);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUser.id, {
        lastLogin: expect.any(Date),
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.verifyEmail(mockUser.id);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUser.id, {
        isEmailVerified: true,
        emailVerificationToken: undefined,
      });
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.verifyEmail('nonexistent');

      expect(result).toBe(false);
    });
  });
});
