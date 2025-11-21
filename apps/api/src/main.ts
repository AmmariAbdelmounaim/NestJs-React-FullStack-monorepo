import {
  ClassSerializerInterceptor,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Get the underlying Express instance for SPA routing
  const expressApp = app.getHttpAdapter().getInstance();

  // Serve static files from public directory (client build)
  // __dirname is /app in the container, so public is at /app/public
  const publicPath = join(__dirname, 'public');
  const express = require('express');
  expressApp.use(express.static(publicPath));

  // Enable CORS - in production, same-origin is used, but allow configurable origins
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
  app.enableCors({
    origin: corsOrigin === 'same-origin' ? undefined : corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Enable global validation pipe to validate input DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Allow implicit type conversion
      },
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      // Critical: strips properties that are not @Expose()'d in the target class
      enableImplicitConversion: true,
      excludeExtraneousValues: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Library Platform API')
    .setDescription('API documentation for the Library Platform')
    .setVersion('1.0')
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
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('loans', 'Loan management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs/json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Serve index.html for client-side routing (SPA fallback)
  // This must be after all other routes are registered
  // Use a middleware that runs after static assets but handles SPA routing
  expressApp.use((req, res, next) => {
    // Skip API routes
    if (req.originalUrl.startsWith(`/${globalPrefix}`)) {
      return next();
    }
    // Skip requests for files (they should be handled by static middleware)
    if (req.originalUrl.includes('.') && !req.originalUrl.endsWith('/')) {
      return next();
    }
    // For all other routes, serve index.html (SPA routing)
    res.sendFile(join(publicPath, 'index.html'), (err) => {
      if (err) {
        next(err);
      }
    });
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
  Logger.log(
    `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
  Logger.log(`🌐 Frontend served from: http://localhost:${port}/`);
}

bootstrap();
