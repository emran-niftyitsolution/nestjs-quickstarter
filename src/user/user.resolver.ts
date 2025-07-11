import {
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationInput } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserInput } from './dto/create-user.input';
import { PaginatedUsersResponse } from './dto/paginated-users.response';
import { UpdateUserInput } from './dto/update-user.input';
import { User, UserRole } from './user.schema';
import { UserService } from './user.service';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => User)
  createUser(@Args('createUserInput') createUserInput: CreateUserInput) {
    return this.userService.create(createUserInput);
  }

  @Query(() => PaginatedUsersResponse, { name: 'users' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Args('paginationInput') paginationInput: PaginationInput) {
    return this.userService.findAll(paginationInput);
  }

  @Query(() => User, { name: 'user' })
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Args('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<User> {
    // Users can only view their own profile unless they're admin
    if (currentUser.role !== UserRole.ADMIN && currentUser._id !== id) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.userService.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  @Mutation(() => User)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @CurrentUser() user: User,
  ): Promise<User> {
    const currentUser = await this.userService.findOne(user._id);
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Users can only update their own profile unless they're admin
    if (currentUser.role !== UserRole.ADMIN && currentUser._id !== user._id) {
      throw new NotFoundException('You can only update your own profile');
    }
    return this.userService.update(user._id, updateUserInput);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeUser(@Args('id', { type: () => ID }) id: string) {
    return this.userService.remove(id);
  }

  @Query(() => User, { name: 'me' })
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: User): Promise<User> {
    const currentUser = await this.userService.findOne(user._id);
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }
    return currentUser;
  }
}
