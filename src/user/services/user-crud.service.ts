import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import { Model } from 'mongoose';
import { CreateUserInput } from '../dto/create-user.input';
import { UpdateUserInput } from '../dto/update-user.input';
import { IUserCrudService } from '../interfaces/user-services.interface';
import { User, UserDocument } from '../user.schema';

/**
 * User CRUD Service implementing Single Responsibility Principle
 *
 * ONLY responsible for:
 * - Creating users
 * - Reading individual users
 * - Updating users
 * - Deleting users
 *
 * Does NOT handle:
 * - Complex queries (delegated to UserQueryService)
 * - Caching (delegated to UserCacheService)
 * - Password operations (delegated to UserPasswordService)
 */
@Injectable()
export class UserCrudService implements IUserCrudService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Create a new user with basic validation
   * Throws ConflictException if email or username already exists
   */
  async create(createUserInput: CreateUserInput): Promise<User> {
    // Check for existing email
    const existingUser = await this.userModel
      .findOne({ email: createUserInput.email })
      .exec();

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Check for existing username if provided
    if (createUserInput.username) {
      const existingUsername = await this.userModel
        .findOne({ username: createUserInput.username })
        .exec();

      if (existingUsername) {
        throw new ConflictException('Username already exists');
      }
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (createUserInput.password) {
      hashedPassword = await argon2.hash(createUserInput.password);
    }

    // Create and save user
    const user = new this.userModel({
      ...createUserInput,
      password: hashedPassword,
    });

    const savedUser = await user.save();
    return savedUser.toObject();
  }

  /**
   * Find a user by ID
   * Returns null if not found
   */
  async findOne(id: string): Promise<User | null> {
    const user = await this.userModel.findById(id).exec();
    return user ? user.toObject() : null;
  }

  /**
   * Update a user by ID
   * Throws NotFoundException if user not found
   */
  async update(id: string, updateUserInput: UpdateUserInput): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserInput, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user.toObject();
  }

  /**
   * Remove a user by ID
   * Returns true if successful, false if user not found
   */
  async remove(id: string): Promise<boolean> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}
