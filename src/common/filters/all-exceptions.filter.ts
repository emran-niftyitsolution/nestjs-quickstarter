import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = ctx.getResponse();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.getRequest();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.message
      : 'Internal server error';

    const isDevelopment =
      this.configService.get<string>('app.nodeEnv') === 'development';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      path: request?.url || 'unknown',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      method: request?.method || 'unknown',
      message,
      ...(isDevelopment && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Log the error
    this.logger.error(
      `${isHttpException ? 'HTTP' : 'Unexpected'} Error: ${message}`,
      {
        statusCode: status,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        path: request?.url || 'unknown',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        method: request?.method || 'unknown',
        stack: exception instanceof Error ? exception.stack : String(exception),
      },
      'AllExceptionsFilter',
    );

    // Handle different response types (HTTP vs GraphQL)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (response && typeof response.status === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      response.status(status).json(errorResponse);
    } else {
      // For GraphQL or other contexts where response.status is not available
      this.logger.error('Response object does not support status method', {
        responseType: typeof response,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        hasStatus: typeof response?.status,
      });
    }
  }
}
