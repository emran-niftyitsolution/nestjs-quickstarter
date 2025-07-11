import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionsFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = ctx.getResponse<Response>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.getRequest();

    const status = HttpStatus.BAD_REQUEST;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const exceptionResponse = exception.getResponse() as any;

    // Check if this is a validation error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
      // Beautify validation errors
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const validationErrors = this.formatValidationErrors(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        exceptionResponse.message,
      );

      const errorResponse = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        path: request?.url || 'unknown',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        method: request?.method || 'unknown',
        message: 'Validation failed',
        errors: validationErrors,
      };

      // Handle different response types (HTTP vs GraphQL)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (response && typeof response.status === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        response.status(status).json(errorResponse);
      } else {
        // For GraphQL or other contexts where response.status is not available
        console.warn(
          'Validation filter: Response object does not support status method',
        );
      }
    } else {
      // Handle other BadRequestException cases
      const errorResponse = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        path: request?.url || 'unknown',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        method: request?.method || 'unknown',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        message: exceptionResponse.message || 'Bad Request',
      };

      // Handle different response types (HTTP vs GraphQL)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (response && typeof response.status === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        response.status(status).json(errorResponse);
      } else {
        // For GraphQL or other contexts where response.status is not available
        console.warn(
          'Validation filter: Response object does not support status method',
        );
      }
    }
  }

  private formatValidationErrors(
    messages: string[],
  ): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];

    for (const message of messages) {
      // Extract field name from validation message
      // Common patterns: "fieldName must be...", "fieldName should...", etc.
      const fieldMatch = message.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s+/);
      const field = fieldMatch ? fieldMatch[1] : 'unknown';

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      errors.push({
        field,
        message,
      });
    }

    return errors;
  }
}
