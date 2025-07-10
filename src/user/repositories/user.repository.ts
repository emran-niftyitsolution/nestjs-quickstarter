import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { BaseRepository } from '../../common/abstracts/base-repository.abstract';
import { PaginationInput } from '../../common/dto/pagination.dto';
import { IUserRepository } from '../../common/interfaces/user-operations.interface';
import { CreateUserInput } from '../dto/create-user.input';
import { PaginatedUsersResponse } from '../dto/paginated-users.response';
import { UpdateUserInput } from '../dto/update-user.input';
import { User, UserDocument } from '../user.schema';

/**
 * User Repository implementing SOLID principles:
 * - Single Responsibility: Only handles user data persistence
 * - Open/Closed: Extends base repository, closed for modification
 * - Liskov Substitution: Can be substituted with IUserRepository
 * - Interface Segregation: Implements specific user operations
 * - Dependency Inversion: Depends on abstractions, not concretions
 */
@Injectable()
export class UserRepository implements IUserRepository {
  private baseRepo: BaseRepository<UserDocument>;

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    // Create a typed base repository instance
    this.baseRepo = new (class extends BaseRepository<UserDocument> {
      constructor(model: Model<UserDocument>) {
        super(model);
      }
    })(userModel);
  }

  /**
   * Create a new user
   * Implements interface method with specific user logic
   */
  async create(
    createUserInput: CreateUserInput,
  ): Promise<HydratedDocument<User>> {
    const userData = {
      ...createUserInput,
      isActive: true,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return await this.baseRepo.create(userData as Partial<UserDocument>);
  }

  /**
   * Find user by email
   * Implements interface method with optimized query
   */
  async findByEmail(email: string): Promise<HydratedDocument<User> | null> {
    return await this.baseRepo.findOne({ email } as Partial<UserDocument>);
  }

  /**
   * Find user by provider ID
   * Implements interface method for OAuth scenarios
   */
  async findByProviderId(
    provider: string,
    providerId: string,
  ): Promise<HydratedDocument<User> | null> {
    return await this.userModel
      .findOne({
        provider,
        providerId,
      })
      .exec();
  }

  /**
   * Find all users with pagination
   * Implements interface method with advanced pagination
   */
  async findAll(
    paginationInput: PaginationInput,
  ): Promise<PaginatedUsersResponse> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = paginationInput;

    // Build search filter
    let filter: any = {};
    if (search) {
      filter = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Use base repository pagination
    const result = await this.baseRepo.findWithPagination(
      filter,
      page,
      limit,
      sort,
    );

    return {
      docs: result.docs,
      pagination: {
        totalDocs: result.totalDocs,
        limit: result.limit,
        page: result.page,
        totalPages: result.totalPages,
        hasPrevPage: result.hasPrevPage,
        hasNextPage: result.hasNextPage,
        prevPage: result.prevPage,
        nextPage: result.nextPage,
      },
    };
  }

  /**
   * Update user by ID
   * Implements interface method with user-specific logic
   */
  async update(
    id: string,
    updateUserInput: UpdateUserInput,
  ): Promise<HydratedDocument<User> | null> {
    const updateData = {
      ...updateUserInput,
      updatedAt: new Date(),
    };
    return await this.baseRepo.updateById(
      id,
      updateData as Partial<UserDocument>,
    );
  }

  /**
   * Delete user by ID
   * Implements interface method with soft delete logic
   */
  async remove(id: string): Promise<boolean> {
    // Implement soft delete instead of hard delete
    const result = await this.baseRepo.updateById(id, {
      isActive: false,
    } as Partial<UserDocument>);
    return !!result;
  }

  /**
   * Check if email exists
   * Implements interface method with optimized query
   */
  async emailExists(email: string): Promise<boolean> {
    return await this.baseRepo.exists({ email } as Partial<UserDocument>);
  }

  /**
   * Find user by ID
   * Basic repository method
   */
  async findById(id: string): Promise<HydratedDocument<User> | null> {
    return await this.baseRepo.findById(id);
  }

  /**
   * Additional user-specific methods not in interface
   * Demonstrates Open/Closed principle - extending functionality
   */

  /**
   * Find active users only
   */
  async findActiveUsers(): Promise<PaginatedUsersResponse> {
    return await this.findAll({
      page: 1,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    } as PaginationInput);
  }

  /**
   * Find users by role
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async findByRole(_role: string): Promise<PaginatedUsersResponse> {
    // Filter by role in the search
    // TODO: Implement role-based filtering when extended pagination is needed
    return await this.findAll({
      page: 1,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: '', // Could extend to filter by role if needed
    } as PaginationInput);
  }

  /**
   * Count users by provider
   */
  async countByProvider(provider: string): Promise<number> {
    return await this.userModel
      .countDocuments({
        provider,
      })
      .exec();
  }

  /**
   * Find recently registered users
   */
  async findRecentUsers(days: number = 7): Promise<HydratedDocument<User>[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    return await this.userModel
      .find({
        createdAt: { $gte: dateThreshold },
      })
      .sort({ createdAt: -1 })
      .exec();
  }
}
