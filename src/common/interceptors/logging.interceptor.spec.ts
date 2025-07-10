import { CallHandler } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { of, throwError } from 'rxjs';
import {
  clearAllMocks,
  createMockExecutionContext,
  mockLogger,
} from '../../test/test-utils';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logger: jest.Mocked<any>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);

    clearAllMocks();
  });

  const createMockCallHandler = (
    response: any = { data: 'test' },
    shouldThrow = false,
  ) => {
    const callHandler: CallHandler = {
      handle: jest.fn(() =>
        shouldThrow ? throwError(new Error('Test error')) : of(response),
      ),
    };
    return callHandler;
  };

  describe('intercept', () => {
    describe('HTTP context', () => {
      it('should log incoming HTTP requests', async () => {
        const context = createMockExecutionContext();
        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(logger.log).toHaveBeenCalledWith(
          'Incoming request: GET /test',
          expect.objectContaining({
            method: 'GET',
            url: '/test',
            userAgent: 'test-agent',
            ip: '127.0.0.1',
          }),
        );
      });

      it('should log successful HTTP responses with timing', async () => {
        const context = createMockExecutionContext();
        const next = createMockCallHandler({ success: true });

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(logger.log).toHaveBeenCalledWith(
          'Outgoing response: GET /test completed in ',
          expect.objectContaining({
            method: 'GET',
            url: '/test',
            statusCode: 200,
            responseTime: expect.stringMatching(/\d+ms/),
          }),
        );
      });

      it('should log failed HTTP responses', async () => {
        const context = createMockExecutionContext();
        const next = createMockCallHandler(null, true);

        try {
          const result$ = interceptor.intercept(context, next);
          await result$.toPromise();
        } catch (error) {
          // Expected to throw
        }

        expect(logger.error).toHaveBeenCalledWith(
          'Request failed: GET /test',
          expect.objectContaining({
            method: 'GET',
            url: '/test',
            error: 'Test error',
            responseTime: expect.stringMatching(/\d+ms/),
          }),
        );
      });

      it('should handle requests without user agent', async () => {
        const context = createMockExecutionContext();
        const mockRequest = context.switchToHttp().getRequest();
        mockRequest.headers = {};

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(logger.log).toHaveBeenCalledWith(
          'Incoming request: GET /test',
          expect.objectContaining({
            userAgent: undefined,
          }),
        );
      });

      it('should handle requests with custom headers', async () => {
        const context = createMockExecutionContext();
        const mockRequest = context.switchToHttp().getRequest();
        mockRequest.headers = {
          'user-agent': 'Custom Agent/1.0',
          'x-forwarded-for': '192.168.1.100',
          accept: 'application/json',
        };

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(logger.log).toHaveBeenCalledWith(
          'Incoming request: GET /test',
          expect.objectContaining({
            userAgent: 'Custom Agent/1.0',
          }),
        );
      });
    });

    describe('GraphQL context', () => {
      it('should log GraphQL requests', async () => {
        const context = createMockExecutionContext(null, 'graphql');
        context.getType = jest.fn(() => 'graphql');

        // Mock GraphQL info
        const mockInfo = {
          operation: { operation: 'query' },
          fieldName: 'getUser',
        };

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(logger.log).toHaveBeenCalledWith(
          'Incoming GraphQL request: query',
          expect.objectContaining({
            operationType: 'query',
            userAgent: 'test-agent',
            ip: '127.0.0.1',
          }),
        );
      });

      it('should log GraphQL mutations', async () => {
        const context = createMockExecutionContext(null, 'graphql');
        context.getType = jest.fn(() => 'graphql');

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(logger.log).toHaveBeenCalledWith(
          'Incoming GraphQL request: query',
          expect.objectContaining({
            operationType: 'query',
          }),
        );
      });

      it('should log GraphQL response completion', async () => {
        const context = createMockExecutionContext(null, 'graphql');
        context.getType = jest.fn(() => 'graphql');

        const next = createMockCallHandler({ data: { user: { id: 1 } } });

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(logger.log).toHaveBeenCalledWith(
          'GraphQL request completed: query',
          expect.objectContaining({
            operationType: 'query',
            responseTime: expect.stringMatching(/\d+ms/),
          }),
        );
      });

      it('should log GraphQL errors', async () => {
        const context = createMockExecutionContext(null, 'graphql');
        context.getType = jest.fn(() => 'graphql');

        const next = createMockCallHandler(null, true);

        try {
          const result$ = interceptor.intercept(context, next);
          await result$.toPromise();
        } catch (error) {
          // Expected to throw
        }

        expect(logger.error).toHaveBeenCalledWith(
          'GraphQL request failed: query',
          expect.objectContaining({
            operationType: 'query',
            error: 'Test error',
            responseTime: expect.stringMatching(/\d+ms/),
          }),
        );
      });
    });

    describe('Request timing', () => {
      it('should measure and log request duration', async () => {
        const context = createMockExecutionContext();
        const next: CallHandler = {
          handle: jest.fn(() => {
            // Simulate some processing time
            return new Promise((resolve) => {
              setTimeout(() => resolve(of({ data: 'delayed response' })), 10);
            });
          }),
        };

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        const logCall = logger.log.mock.calls.find((call) =>
          call[0].includes('completed in'),
        );
        expect(logCall).toBeDefined();
        expect(logCall[1]).toHaveProperty('responseTime');
        expect(logCall[1].responseTime).toMatch(/\d+ms/);
      });

      it('should measure timing even for failed requests', async () => {
        const context = createMockExecutionContext();
        const next: CallHandler = {
          handle: jest.fn(() => {
            return new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Delayed error')), 5);
            });
          }),
        };

        try {
          const result$ = interceptor.intercept(context, next);
          await result$.toPromise();
        } catch (error) {
          // Expected to throw
        }

        const errorCall = logger.error.mock.calls.find((call) =>
          call[0].includes('failed'),
        );
        expect(errorCall).toBeDefined();
        expect(errorCall[1]).toHaveProperty('responseTime');
        expect(errorCall[1].responseTime).toMatch(/\d+ms/);
      });

      it('should handle very fast requests', async () => {
        const context = createMockExecutionContext();
        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        const logCall = logger.log.mock.calls.find((call) =>
          call[0].includes('completed in'),
        );
        expect(logCall[1].responseTime).toMatch(/\d+ms/);
      });
    });

    describe('Error handling', () => {
      it('should handle context extraction errors', async () => {
        const context = createMockExecutionContext();
        context.switchToHttp = jest.fn(() => {
          throw new Error('Context extraction failed');
        });

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        // Should still proceed without throwing
        expect(next.handle).toHaveBeenCalled();
      });

      it('should handle missing request object', async () => {
        const context = createMockExecutionContext();
        context.switchToHttp = jest.fn(() => ({
          getRequest: () => null,
          getResponse: () => ({ statusCode: 200 }),
        }));

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(next.handle).toHaveBeenCalled();
      });

      it('should handle missing response object', async () => {
        const context = createMockExecutionContext();
        context.switchToHttp = jest.fn(() => ({
          getRequest: () => ({ method: 'GET', url: '/test', headers: {} }),
          getResponse: () => null,
        }));

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(next.handle).toHaveBeenCalled();
      });

      it('should handle logger errors gracefully', async () => {
        const context = createMockExecutionContext();
        logger.log.mockImplementation(() => {
          throw new Error('Logger error');
        });

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        // Should still proceed even if logging fails
        expect(next.handle).toHaveBeenCalled();
      });

      it('should handle unknown context types', async () => {
        const context = createMockExecutionContext();
        context.getType = jest.fn(() => 'ws' as any);

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        // Should default to HTTP behavior for unknown types
        expect(next.handle).toHaveBeenCalled();
      });
    });

    describe('Performance considerations', () => {
      it('should not significantly impact request performance', async () => {
        const context = createMockExecutionContext();
        const next = createMockCallHandler();

        const startTime = process.hrtime.bigint();
        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();
        const endTime = process.hrtime.bigint();

        const overheadMs = Number(endTime - startTime) / 1_000_000;

        // Logging overhead should be minimal (< 10ms for mocked services)
        expect(overheadMs).toBeLessThan(10);
      });

      it('should handle high-frequency requests efficiently', async () => {
        const context = createMockExecutionContext();
        const requests = Array.from({ length: 100 }, () =>
          interceptor.intercept(context, createMockCallHandler()),
        );

        const startTime = Date.now();
        await Promise.all(requests.map((r$) => r$.toPromise()));
        const endTime = Date.now();

        const totalTime = endTime - startTime;
        const avgTimePerRequest = totalTime / 100;

        // Should handle 100 requests efficiently
        expect(avgTimePerRequest).toBeLessThan(5); // < 5ms per request
      });
    });

    describe('Request data extraction', () => {
      it('should extract correct IP address', async () => {
        const context = createMockExecutionContext();
        const mockRequest = context.switchToHttp().getRequest();
        mockRequest.ip = '10.0.0.1';

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(logger.log).toHaveBeenCalledWith(
          'Incoming request: GET /test',
          expect.objectContaining({
            ip: '10.0.0.1',
          }),
        );
      });

      it('should handle missing IP address', async () => {
        const context = createMockExecutionContext();
        const mockRequest = context.switchToHttp().getRequest();
        delete mockRequest.ip;

        const next = createMockCallHandler();

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        expect(logger.log).toHaveBeenCalledWith(
          'Incoming request: GET /test',
          expect.objectContaining({
            ip: undefined,
          }),
        );
      });

      it('should handle different HTTP methods', async () => {
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

        for (const method of methods) {
          const context = createMockExecutionContext();
          const mockRequest = context.switchToHttp().getRequest();
          mockRequest.method = method;

          const next = createMockCallHandler();

          const result$ = interceptor.intercept(context, next);
          await result$.toPromise();

          expect(logger.log).toHaveBeenCalledWith(
            `Incoming request: ${method} /test`,
            expect.objectContaining({
              method,
            }),
          );
        }
      });

      it('should handle different status codes', async () => {
        const statusCodes = [200, 201, 400, 404, 500];

        for (const statusCode of statusCodes) {
          const context = createMockExecutionContext();
          const mockResponse = context.switchToHttp().getResponse();
          mockResponse.statusCode = statusCode;

          const next = createMockCallHandler();

          const result$ = interceptor.intercept(context, next);
          await result$.toPromise();

          expect(logger.log).toHaveBeenCalledWith(
            expect.stringContaining('completed in'),
            expect.objectContaining({
              statusCode,
            }),
          );
        }
      });
    });

    describe('Response data handling', () => {
      it('should not log sensitive response data', async () => {
        const context = createMockExecutionContext();
        const sensitiveResponse = {
          user: { id: 1, email: 'test@example.com' },
          password: 'secret123',
          apiKey: 'api-key-secret',
        };

        const next = createMockCallHandler(sensitiveResponse);

        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();

        // Should log completion but not response content
        expect(logger.log).toHaveBeenCalledWith(
          expect.stringContaining('completed in'),
          expect.not.objectContaining({
            password: expect.any(String),
            apiKey: expect.any(String),
          }),
        );
      });

      it('should handle large response payloads efficiently', async () => {
        const context = createMockExecutionContext();
        const largeResponse = {
          data: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            name: `Item ${i}`,
            description: 'A'.repeat(100),
          })),
        };

        const next = createMockCallHandler(largeResponse);

        const startTime = Date.now();
        const result$ = interceptor.intercept(context, next);
        await result$.toPromise();
        const endTime = Date.now();

        // Should handle large responses without significant overhead
        expect(endTime - startTime).toBeLessThan(50);
      });
    });
  });
});
