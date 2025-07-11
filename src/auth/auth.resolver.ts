import { UseGuards } from '@nestjs/common';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../user/user.schema';
import { AuthService } from './auth.service';
import { AuthResponse, LogoutResponse } from './dto/auth.response';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  async register(
    @Args('registerInput') registerInput: RegisterInput,
  ): Promise<AuthResponse> {
    return this.authService.register(registerInput);
  }

  @Mutation(() => AuthResponse)
  async login(
    @Args('loginInput') loginInput: LoginInput,
  ): Promise<AuthResponse> {
    return this.authService.login(loginInput);
  }

  @Mutation(() => AuthResponse)
  async refreshToken(
    @Args('refreshToken') refreshToken: string,
  ): Promise<AuthResponse> {
    return this.authService.refreshToken(refreshToken);
  }

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@Context() context: any): Promise<User> {
    return context.req.user;
  }

  @Mutation(() => LogoutResponse)
  @UseGuards(JwtAuthGuard)
  async logout(): Promise<LogoutResponse> {
    // In a stateless JWT setup, logout is typically handled client-side
    // by removing the token. You could implement token blacklisting here.
    return {
      success: true,
      message: 'Successfully logged out',
    };
  }

  @Mutation(() => Boolean)
  async forgotPassword(@Args('email') email: string): Promise<boolean> {
    return this.authService.forgotPassword(email);
  }

  @Mutation(() => Boolean)
  async resetPassword(
    @Args('token') token: string,
    @Args('newPassword') newPassword: string,
  ): Promise<boolean> {
    return this.authService.resetPassword(token, newPassword);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Context() context: any,
    @Args('currentPassword') currentPassword: string,
    @Args('newPassword') newPassword: string,
  ): Promise<boolean> {
    const userId = context.req.user._id;
    return this.authService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
  }
}
