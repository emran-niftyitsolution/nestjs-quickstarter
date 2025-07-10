import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

export const winstonConfig = (nodeEnv: string): WinstonModuleOptions => {
  const isDevelopment = nodeEnv === 'development';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isDevelopment
        ? combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            colorize(),
            errors({ stack: true }),
            simple(),
          )
        : combine(timestamp(), errors({ stack: true }), json()),
    }),
  ];

  // Add file transports for production
  if (!isDevelopment) {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: combine(timestamp(), errors({ stack: true }), json()),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: combine(timestamp(), errors({ stack: true }), json()),
      }),
    );
  }

  return {
    level: isDevelopment ? 'debug' : 'info',
    format: combine(timestamp(), errors({ stack: true }), json()),
    transports,
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
  };
};
