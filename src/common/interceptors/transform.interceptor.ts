import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  statusCode: number;
  message: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const contextType = context.getType<'http' | 'graphql'>();

    // Only transform HTTP responses, not GraphQL
    if (contextType === 'graphql') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();

        return {
          data,
          statusCode: response.statusCode || 200,
          message: 'Success',
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
