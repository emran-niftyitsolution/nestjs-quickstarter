import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuthProvider,
  User,
  UserDocument,
  UserRole,
} from '../user/user.schema';
import { UserService } from '../user/user.service';
import { AuthResponse } from './dto/auth.response';
import { LoginInput } from './dto/login.input';
import { RegisterInput } from './dto/register.input';
import { JwtPayload } from './strategies/jwt.strategy';

interface OAuthProfile {
  id: string;
  emails?: Array<{ value: string }>;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  photos?: Array<{ value: string }>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerInput: RegisterInput): Promise<AuthResponse> {
    try {
      const user = await this.userService.create({
        ...registerInput,
        provider: AuthProvider.LOCAL,
      });

      const tokens = await this.generateTokens(user);

      return {
        user,
        ...tokens,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException('Registration failed');
    }
  }

  async login(loginInput: LoginInput): Promise<AuthResponse> {
    const { email, password } = loginInput;

    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.provider && user.provider !== AuthProvider.LOCAL) {
      throw new UnauthorizedException(
        `Please login with ${user.provider.toLowerCase()}`,
      );
    }

    if (!user.password) {
      throw new UnauthorizedException('Password not set for this account');
    }

    const isPasswordValid = await this.userService.verifyPassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userService.updateLastLogin(user._id.toString());

    const tokens = await this.generateTokens(user);

    return {
      user: user.toObject(),
      ...tokens,
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    try {
      return await this.userService.findOne(userId);
    } catch {
      return null;
    }
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async googleLogin(user: OAuthProfile): Promise<AuthResponse> {
    return this.oauthLogin(user, AuthProvider.GOOGLE);
  }

  async githubLogin(user: OAuthProfile): Promise<AuthResponse> {
    return this.oauthLogin(user, AuthProvider.GITHUB);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      });

      const user = await this.userService.findOne(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);

      return {
        user,
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async oauthLogin(
    profile: OAuthProfile,
    provider: AuthProvider,
  ): Promise<AuthResponse> {
    let user: UserDocument | User | null =
      await this.userService.findByProvider(provider, profile.id);

    if (!user) {
      // Check if user exists with same email
      const email = profile.emails?.[0]?.value;
      if (!email) {
        throw new UnauthorizedException('Email is required for OAuth login');
      }

      const existingUser = await this.userService.findByEmail(email);

      if (existingUser) {
        // For OAuth, we'll just use the existing user
        user = existingUser;
      } else {
        // Create new user - this returns User type
        const newUserData = {
          email,
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          avatar: profile.photos?.[0]?.value || '',
          provider,
          providerId: profile.id,
          isEmailVerified: true,
        };

        user = await this.userService.create(newUserData);
      }
    }

    if (user) {
      // Handle both User and UserDocument types safely
      const userId =
        (user as UserDocument)._id?.toString() || (user as User).id;
      await this.userService.updateLastLogin(userId);
    }

    const tokens = await this.generateTokens(user);

    return {
      user: user as User,
      ...tokens,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // For OAuth users, we need to get the user document with password
    const userWithPassword = await this.userService.findByEmail(user.email);

    if (!userWithPassword || !userWithPassword.password) {
      throw new UnauthorizedException('Unable to change password');
    }

    const isCurrentPasswordValid = await this.userService.verifyPassword(
      currentPassword,
      userWithPassword.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    return await this.userService.updatePassword(userId, newPassword);
  }

  async forgotPassword(email: string): Promise<boolean> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists or not
      return true;
    }

    const resetToken = this.generateRandomToken();
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await this.userService.setPasswordResetToken(
      user._id.toString(),
      resetToken,
      expires,
    );

    // TODO: Send email with reset token
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return true;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.userService.findByPasswordResetToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.userService.updatePassword(user._id.toString(), newPassword);
    await this.userService.clearPasswordResetToken(user._id.toString());

    return true;
  }

  private async generateTokens(
    user: UserDocument | User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Check if it's a UserDocument (has _id) or a User (has id)
    const userId = (user as UserDocument)._id
      ? (user as UserDocument)._id.toString()
      : (user as User).id;

    const payload: JwtPayload = {
      sub: userId,
      email: user.email,
      role: user.role || UserRole.USER,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private generateRandomToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
