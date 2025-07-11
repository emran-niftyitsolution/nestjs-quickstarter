import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Handle cases where req might be undefined or missing ip
    if (!req) {
      return 'unknown';
    }

    // Try to get IP from various possible sources
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const ip =
      req.ip ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.connection?.remoteAddress ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.socket?.remoteAddress ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.headers?.['x-forwarded-for'] ||
      'unknown';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ip;
  }

  protected async handleRequest(requestProps: any): Promise<boolean> {
    try {
      return await super.handleRequest(requestProps);
    } catch (error) {
      // Handle cases where response object doesn't have expected interface
      if (
        error instanceof Error &&
        error.message.includes('res.header is not a function')
      ) {
        // For GraphQL or other contexts where response.header is not available
        // We'll allow the request to proceed but log the throttling attempt
        console.warn('Throttling attempted but response object not compatible');
        return true;
      }
      throw error;
    }
  }
}
