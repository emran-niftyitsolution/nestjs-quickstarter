import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { AuthProvider } from '../../user/user.schema';
import { AuthService } from '../auth.service';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ||
        'http://localhost:3000/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    try {
      const authResponse = await this.authService.oauthLogin(
        profile,
        AuthProvider.GITHUB,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      done(null, authResponse);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      done(error, false);
    }
  }
}
