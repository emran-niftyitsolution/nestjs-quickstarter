import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-redis-store';
import { Request } from 'express';
import { GraphQLError } from 'graphql';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationExceptionsFilter } from './common/filters/validation-exceptions.filter';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { winstonConfig } from './config/winston.config';
import { HealthModule } from './health/health.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    // Redis Cache Configuration
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis') as {
          host: string;
          port: number;
          password?: string;
          db: number;
          ttl: number;
        };
        return {
          store: redisStore,
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
          ttl: redisConfig.ttl,
          max: 100, // Maximum number of items in cache
          isGlobal: true,
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        winstonConfig(
          configService.get<string>('app.nodeEnv') || 'development',
        ),
      inject: [ConfigService],
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: true,
        sortSchema: true,
        playground: configService.get<string>('app.nodeEnv') !== 'production',
        introspection: true,
        context: ({ req }: { req: Request }) => ({ req }),
        formatError: (error: GraphQLError) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const originalError = (error.extensions?.originalError as any) || {};
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            Array.isArray(originalError.message) &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            originalError.statusCode === 400
          ) {
            return {
              message: 'Validation failed',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              errors:
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
                originalError.message.map((msg: string) => {
                  // Extract field name by finding the pattern before validation keywords
                  const validationKeywords = [
                    'must',
                    'should',
                    'is',
                    'are',
                    'has',
                    'have',
                    'be',
                  ];
                  let fieldName = 'unknown';

                  // Look for patterns like "Last name", "First name", "Email address", etc.
                  for (const keyword of validationKeywords) {
                    const index = msg.toLowerCase().indexOf(keyword);
                    if (index > 0) {
                      const beforeKeyword = msg.substring(0, index).trim();
                      // Convert "Last name" to "lastName", "First name" to "firstName", etc.
                      fieldName = beforeKeyword
                        .toLowerCase()
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                        .replace(/\s+(\w)/g, (_, letter) =>
                          letter.toUpperCase(),
                        );
                      break;
                    }
                  }

                  return {
                    field: fieldName,
                    message: msg,
                  };
                }),
              code: 'BAD_REQUEST',
              path: error.path,
              locations: error.locations,
            };
          }
          return error;
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri') as string,
      }),
      inject: [ConfigService],
    }),
    CommonModule,
    UserModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
