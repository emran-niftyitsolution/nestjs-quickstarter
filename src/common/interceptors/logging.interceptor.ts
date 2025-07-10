import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const contextType = context.getType<'http' | 'graphql'>();

    if (contextType === 'graphql') {
      return this.handleGraphQLLogging(context, next, start);
    }

    return this.handleHttpLogging(context, next, start);
  }

  private handleHttpLogging(
    context: ExecutionContext,
    next: CallHandler,
    start: number,
  ): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const method = request.method;
    const url = request.url;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip;

    return next.handle().pipe(
      tap(() => {
        const response = ctx.getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - start;

        this.logger.log(
          `${method} ${url} ${statusCode} - ${duration}ms`,
          {
            method,
            url,
            statusCode,
            duration,
            userAgent,
            ip,
            userId: request.user?.id,
          },
          'LoggingInterceptor',
        );
      }),
    );
  }

  private handleGraphQLLogging(
    context: ExecutionContext,
    next: CallHandler,
    start: number,
  ): Observable<any> {
    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo();
    const request = gqlContext.getContext().req;

    const operationType = info.operation.operation;
    const operationName = info.fieldName;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;

        this.logger.log(
          `GraphQL ${operationType} ${operationName} - ${duration}ms`,
          {
            operationType,
            operationName,
            duration,
            userId: request?.user?.id,
          },
          'LoggingInterceptor',
        );
      }),
    );
  }
}
