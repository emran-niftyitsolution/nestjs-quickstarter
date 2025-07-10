import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationInput } from '../../common/dto/pagination.dto';
import { PaginatedUsersResponse } from '../dto/paginated-users.response';
import { IUserQueryService } from '../interfaces/user-services.interface';
import { AuthProvider, User, UserDocument } from '../user.schema';

interface QueryFilter {
  $or?: Array<{
    email?: { $regex: string; $options: string };
    firstName?: { $regex: string; $options: string };
    lastName?: { $regex: string; $options: string };
    username?: { $regex: string; $options: string };
  }>;
}

/**
 * User Query Service implementing Single Responsibility Principle
 *
 * ONLY responsible for:
 * - Complex pagination queries
 * - Finding users by email
 * - Finding users by username
 * - Finding users by OAuth provider
 * - Finding users by password reset token
 *
 * Does NOT handle:
 * - Basic CRUD operations (delegated to UserCrudService)
 * - Caching (delegated to UserCacheService)
 * - Password operations (delegated to UserPasswordService)
 */
@Injectable()
export class UserQueryService implements IUserQueryService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Find all users with pagination, sorting, and search
   */
  async findAll(
    paginationInput: PaginationInput,
  ): Promise<PaginatedUsersResponse> {
    const { page, limit, sortBy, sortOrder, search } = paginationInput;

    // Build query filter
    const query: QueryFilter = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const pageNumber = page || 1;
    const limitNumber = limit || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    if (sortBy) {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1; // Default sort by creation date
    }

    // Execute queries in parallel for better performance
    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNumber)
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    // Build paginated response
    const totalPages = Math.ceil(total / limitNumber);

    return {
      docs: users.map((user) => user.toObject()),
      pagination: {
        totalDocs: total,
        limit: limitNumber,
        page: pageNumber,
        totalPages,
        hasPrevPage: pageNumber > 1,
        hasNextPage: pageNumber < totalPages,
        prevPage: pageNumber > 1 ? pageNumber - 1 : undefined,
        nextPage: pageNumber < totalPages ? pageNumber + 1 : undefined,
      },
    };
  }

  /**
   * Find user by email address
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  /**
   * Find user by OAuth provider and provider ID
   */
  async findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ provider, providerId }).exec();
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }, // Token not expired
      })
      .exec();
  }
}
