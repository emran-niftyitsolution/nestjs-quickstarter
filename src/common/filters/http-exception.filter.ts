import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error: string;
  stack?: string;
}

interface RequestWithUser {
  url: string;
  method: string;
  user?: { id: string };
}

interface HttpResponse {
  status(code: number): HttpResponse;
  json(body: any): void;
}

interface GraphQLContext {
  req?: RequestWithUser;
}

@Catch(HttpException)
export class HttpExceptionFilter
  implements ExceptionFilter, GqlExceptionFilter
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const hostType = host.getType<'http' | 'graphql'>();

    if (hostType === 'graphql') {
      return this.handleGraphQLException(exception, host);
    }

    return this.handleHttpException(exception, host);
  }

  private handleHttpException(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponse>();
    const request = ctx.getRequest<RequestWithUser>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const isDevelopment =
      this.configService.get<string>('app.nodeEnv') === 'development';

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string }).message ||
          exception.message;

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: exception.name,
    };

    if (isDevelopment) {
      errorResponse.stack = exception.stack;
    }

    // Log error details
    this.logger.error(
      `HTTP ${status} Error: ${typeof message === 'string' ? message : 'Error'}`,
      {
        statusCode: status,
        path: request.url,
        method: request.method,
        userId: request.user?.id,
        stack: exception.stack,
      },
      'HttpExceptionFilter',
    );

    response.status(status).json(errorResponse);
  }

  private handleGraphQLException(
    exception: HttpException,
    host: ArgumentsHost,
  ) {
    const gqlHost = GqlArgumentsHost.create(host);
    const ctx = gqlHost.getContext<GraphQLContext>();
    const status = exception.getStatus();
    const isDevelopment =
      this.configService.get<string>('app.nodeEnv') === 'development';

    // Log GraphQL error
    this.logger.error(
      `GraphQL Error: ${exception.message}`,
      {
        statusCode: status,
        userId: ctx.req?.user?.id,
        stack: isDevelopment ? exception.stack : undefined,
      },
      'HttpExceptionFilter',
    );

    // Return the exception to be handled by GraphQL
    return exception;
  }
}
