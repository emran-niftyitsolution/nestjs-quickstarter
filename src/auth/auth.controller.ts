import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../user/user.schema';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth.response';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account with email and password (rate limited)',
  })
  @ApiBody({
    type: RegisterInput,
    description: 'User registration data',
    examples: {
      example1: {
        summary: 'Basic registration',
        description: 'Register with email, password, and optional details',
        value: {
          email: 'user@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponse,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or email already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          oneOf: [
            { type: 'string', example: 'Email already exists' },
            {
              type: 'array',
              items: { type: 'string' },
              example: ['email must be a valid email'],
            },
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async register(@Body() registerInput: RegisterInput): Promise<AuthResponse> {
    return this.authService.register(registerInput);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password (rate limited)',
  })
  @ApiBody({
    type: LoginInput,
    description: 'User login credentials',
    examples: {
      example1: {
        summary: 'User login',
        description: 'Login with email and password',
        value: {
          email: 'user@example.com',
          password: 'SecurePass123!',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async login(@Body() loginInput: LoginInput): Promise<AuthResponse> {
    return this.authService.login(loginInput);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Get a new access token using a valid refresh token (rate limited)',
  })
  @ApiBody({
    description: 'Refresh token',
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          description: 'Valid refresh token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid refresh token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid refresh token' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<AuthResponse> {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieve the authenticated user profile information (rate limited)',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '64f5b2c3d1e5f7g8h9i0j1k2' },
        email: { type: 'string', example: 'user@example.com' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        role: { type: 'string', example: 'USER' },
        isEmailVerified: { type: 'boolean', example: true },
        isActive: { type: 'boolean', example: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getProfile(@CurrentUser() user: User): Promise<User> {
    return this.authService.getProfile(user.id);
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth login',
    description: 'Initiate Google OAuth authentication flow (rate limited)',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent page',
  })
  async googleAuth(): Promise<void> {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handle Google OAuth callback and authenticate user (rate limited)',
  })
  @ApiResponse({
    status: 200,
    description: 'Google authentication successful',
    type: AuthResponse,
  })
  async googleAuthRedirect(@Request() req: any): Promise<AuthResponse> {
    return this.authService.googleLogin(req.user);
  }

  @Get('github')
  @Public()
  @UseGuards(AuthGuard('github'))
  @ApiOperation({
    summary: 'GitHub OAuth login',
    description: 'Initiate GitHub OAuth authentication flow (rate limited)',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to GitHub OAuth consent page',
  })
  async githubAuth(): Promise<void> {
    // Guard redirects to GitHub
  }

  @Get('github/callback')
  @Public()
  @UseGuards(AuthGuard('github'))
  @ApiOperation({
    summary: 'GitHub OAuth callback',
    description:
      'Handle GitHub OAuth callback and authenticate user (rate limited)',
  })
  @ApiResponse({
    status: 200,
    description: 'GitHub authentication successful',
    type: AuthResponse,
  })
  async githubAuthRedirect(@Request() req: any): Promise<AuthResponse> {
    return this.authService.githubLogin(req.user);
  }
}
