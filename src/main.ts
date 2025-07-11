import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const configService = app.get(ConfigService);
  const isProduction =
    configService.get<string>('app.nodeEnv') === 'production';

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Compression middleware
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Enable CORS for development
  app.enableCors();

  // Setup Swagger API Documentation
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('NestJS Quickstarter API')
      .setDescription(
        'Enterprise-grade NestJS API with authentication, RBAC, and SOLID architecture',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addOAuth2(
        {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
              tokenUrl: 'https://oauth2.googleapis.com/token',
              scopes: {
                openid: 'OpenID Connect',
                profile: 'User profile information',
                email: 'User email address',
              },
            },
          },
        },
        'google-oauth',
      )
      .addOAuth2(
        {
          type: 'oauth2',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://github.com/login/oauth/authorize',
              tokenUrl: 'https://github.com/login/oauth/access_token',
              scopes: {
                'user:email': 'User email address',
                'read:user': 'User profile information',
              },
            },
          },
        },
        'github-oauth',
      )
      .addServer('http://localhost:3000', 'Development server')
      .addServer('https://api.example.com', 'Production server')
      .addTag(
        'Authentication',
        'User authentication and authorization endpoints',
      )
      .addTag('Users', 'User management and profile endpoints')
      .addTag('Health', 'Application health check endpoints')
      .addTag('Admin', 'Administrative endpoints (Admin role required)')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
      deepScanRoutes: true,
    });

    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'NestJS Quickstarter API Documentation',
      customfavIcon: 'https://nestjs.com/img/logo-small.svg',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #e53e3e }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
      },
    });

    const logger = app.get<Logger>(WINSTON_MODULE_NEST_PROVIDER);
    logger.log('📚 Swagger documentation available at /api/docs', 'Bootstrap');
  }

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);

  const logger = app.get<Logger>(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`🚀 Application is running on port ${port}`, 'Bootstrap');

  if (!isProduction) {
    logger.log(
      `📖 GraphQL Playground: http://localhost:${port}/graphql`,
      'Bootstrap',
    );
    logger.log(
      `📚 API Documentation: http://localhost:${port}/api/docs`,
      'Bootstrap',
    );
  }
}

bootstrap();
