/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { clearAllMocks, mockLogger } from '../../test/test-utils';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);

    clearAllMocks();
  });

  const createMockHost = (contextType: 'http' | 'graphql' = 'http') => {
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const mockRequest = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    };

    const mockHost: ArgumentsHost = {
      switchToHttp: jest.fn(() => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
        getNext: jest.fn(),
      })) as any,
      getType: jest.fn(() => contextType) as any,
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };

    return { mockHost, mockResponse, mockRequest };
  };

  describe('catch', () => {
    describe('HTTP Exceptions', () => {
      it('should handle BadRequestException correctly', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new HttpException(
          'Validation failed',
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.BAD_REQUEST,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          ),
          path: '/test',
        });
        expect(logger.error).toHaveBeenCalledWith(
          'HTTP Exception: Validation failed',
          expect.objectContaining({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Validation failed',
            url: '/test',
            method: 'GET',
          }),
        );
      });

      it('should handle UnauthorizedException correctly', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new HttpException(
          'Unauthorized',
          HttpStatus.UNAUTHORIZED,
        );

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.UNAUTHORIZED,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Unauthorized',
          timestamp: expect.any(String),
          path: '/test',
        });
      });

      it('should handle ForbiddenException correctly', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new HttpException(
          'Forbidden resource',
          HttpStatus.FORBIDDEN,
        );

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Forbidden resource',
          timestamp: expect.any(String),
          path: '/test',
        });
      });

      it('should handle NotFoundException correctly', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new HttpException(
          'User not found',
          HttpStatus.NOT_FOUND,
        );

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'User not found',
          timestamp: expect.any(String),
          path: '/test',
        });
      });

      it('should handle ConflictException correctly', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new HttpException(
          'Email already exists',
          HttpStatus.CONFLICT,
        );

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.CONFLICT,
          message: 'Email already exists',
          timestamp: expect.any(String),
          path: '/test',
        });
      });

      it('should handle InternalServerErrorException correctly', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new HttpException(
          'Something went wrong',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Something went wrong',
          timestamp: expect.any(String),
          path: '/test',
        });
        expect(logger.error).toHaveBeenCalledWith(
          'HTTP Exception: Something went wrong',
          expect.objectContaining({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          }),
        );
      });
    });

    describe('Non-HTTP Exceptions', () => {
      it('should handle generic Error correctly', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new Error('Database connection failed');

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          timestamp: expect.any(String),
          path: '/test',
        });
        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled Exception: Database connection failed',
          expect.objectContaining({
            stack: expect.any(String),
            url: '/test',
            method: 'GET',
          }),
        );
      });

      it('should handle TypeError correctly', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new TypeError('Cannot read property of undefined');

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          timestamp: expect.any(String),
          path: '/test',
        });
        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled Exception: Cannot read property of undefined',
          expect.objectContaining({
            name: 'TypeError',
            stack: expect.any(String),
          }),
        );
      });

      it('should handle ReferenceError correctly', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new ReferenceError('Variable is not defined');

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          timestamp: expect.any(String),
          path: '/test',
        });
      });

      it('should handle exceptions without message', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new Error();

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          timestamp: expect.any(String),
          path: '/test',
        });
      });
    });

    describe('GraphQL context', () => {
      it('should handle exceptions in GraphQL context', () => {
        const { mockHost, mockResponse } = createMockHost('graphql');
        const exception = new HttpException(
          'GraphQL error',
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.BAD_REQUEST,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'GraphQL error',
          timestamp: expect.any(String),
          path: '/test',
        });
      });

      it('should handle non-HTTP exceptions in GraphQL context', () => {
        const { mockHost, mockResponse } = createMockHost('graphql');
        const exception = new Error('GraphQL resolver error');

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          timestamp: expect.any(String),
          path: '/test',
        });
      });
    });

    describe('Request context handling', () => {
      it('should extract request information correctly', () => {
        const { mockHost, mockRequest } = createMockHost();
        mockRequest.url = '/api/users';
        mockRequest.method = 'POST';
        mockRequest.ip = '192.168.1.1';
        mockRequest.headers = { 'user-agent': 'Mozilla/5.0' };

        const exception = new HttpException(
          'Test error',
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockHost);

        expect(logger.error).toHaveBeenCalledWith(
          'HTTP Exception: Test error',
          expect.objectContaining({
            url: '/api/users',
            method: 'POST',
            ip: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
          }),
        );
      });

      it('should handle missing request properties gracefully', () => {
        const { mockHost, mockRequest } = createMockHost();
        (mockRequest as any).url = undefined;
        (mockRequest as any).method = undefined;
        (mockRequest as any).ip = undefined;
        (mockRequest as any).headers = {};

        const exception = new HttpException(
          'Test error',
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockHost);

        expect(logger.error).toHaveBeenCalledWith(
          'HTTP Exception: Test error',
          expect.objectContaining({
            url: undefined,
            method: undefined,
            ip: undefined,
            userAgent: undefined,
          }),
        );
      });

      it('should handle missing request object gracefully', () => {
        const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };

        const mockHost: ArgumentsHost = {
          switchToHttp: jest.fn(() => ({
            getResponse: () => mockResponse,
            getRequest: () => null,
            getNext: () => null,
          })),
          getType: jest.fn(() => 'http' as any),
          getArgs: jest.fn(),
          getArgByIndex: jest.fn(),
          switchToRpc: jest.fn(),
          switchToWs: jest.fn(),
        };

        const exception = new HttpException(
          'Test error',
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.BAD_REQUEST,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Test error',
          timestamp: expect.any(String),
          path: undefined,
        });
      });
    });

    describe('Error logging', () => {
      it('should log HTTP exceptions with appropriate level', () => {
        const { mockHost } = createMockHost();
        const exception = new HttpException(
          'Client error',
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockHost);

        expect(logger.error).toHaveBeenCalledWith(
          'HTTP Exception: Client error',
          expect.objectContaining({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Client error',
          }),
        );
      });

      it('should log server errors with full context', () => {
        const { mockHost } = createMockHost();
        const exception = new HttpException(
          'Server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );

        filter.catch(exception, mockHost);

        expect(logger.error).toHaveBeenCalledWith(
          'HTTP Exception: Server error',
          expect.objectContaining({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Server error',
            url: '/test',
            method: 'GET',
            ip: '127.0.0.1',
          }),
        );
      });

      it('should log unhandled exceptions with stack trace', () => {
        const { mockHost } = createMockHost();
        const exception = new Error('Unexpected error');

        filter.catch(exception, mockHost);

        expect(logger.error).toHaveBeenCalledWith(
          'Unhandled Exception: Unexpected error',
          expect.objectContaining({
            name: 'Error',
            message: 'Unexpected error',
            stack: expect.any(String),
            url: '/test',
            method: 'GET',
          }),
        );
      });

      it('should not expose sensitive information in logs', () => {
        const { mockHost, mockRequest } = createMockHost();
        mockRequest.headers = {
          authorization: 'Bearer secret-token',
          'x-api-key': 'secret-api-key',
          'user-agent': 'Mozilla/5.0',
        };

        const exception = new HttpException(
          'Test error',
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockHost);

        expect(logger.error).toHaveBeenCalledWith(
          'HTTP Exception: Test error',
          expect.objectContaining({
            userAgent: 'Mozilla/5.0',
          }),
        );

        // Should not log sensitive headers
        expect(logger.error).not.toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            authorization: expect.any(String),
            'x-api-key': expect.any(String),
          }),
        );
      });
    });

    describe('Response formatting', () => {
      it('should format timestamp correctly', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new HttpException(
          'Test error',
          HttpStatus.BAD_REQUEST,
        );

        filter.catch(exception, mockHost);

        const responseCall = mockResponse.json.mock.calls[0][0];
        expect(responseCall.timestamp).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        );
      });

      it('should include correct path in response', () => {
        const { mockHost, mockResponse, mockRequest } = createMockHost();
        mockRequest.url = '/api/users/123';
        const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

        filter.catch(exception, mockHost);

        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Not found',
          timestamp: expect.any(String),
          path: '/api/users/123',
        });
      });

      it('should sanitize error messages for production', () => {
        const { mockHost, mockResponse } = createMockHost();
        const exception = new Error('Database password: secret123');

        filter.catch(exception, mockHost);

        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error', // Sanitized message
          timestamp: expect.any(String),
          path: '/test',
        });
      });
    });

    describe('Edge cases', () => {
      it('should handle null exception', () => {
        const { mockHost, mockResponse } = createMockHost();

        filter.catch(null as any, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          timestamp: expect.any(String),
          path: '/test',
        });
      });

      it('should handle undefined exception', () => {
        const { mockHost, mockResponse } = createMockHost();

        filter.catch(undefined as any, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          timestamp: expect.any(String),
          path: '/test',
        });
      });

      it('should handle exception with circular references', () => {
        const { mockHost, mockResponse } = createMockHost();
        const circularObj: any = { name: 'circular' };
        circularObj.self = circularObj;
        const exception = new Error('Circular reference error');
        (exception as any).circular = circularObj;

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });
});
