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
    const response = ctx.getResponse();
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
      path: request.url || 'unknown',
      method: request.method || 'unknown',
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
        path: request.url,
        method: request.method,
        stack: exception instanceof Error ? exception.stack : String(exception),
      },
      'AllExceptionsFilter',
    );

    response.status(status).json(errorResponse);
  }
}
