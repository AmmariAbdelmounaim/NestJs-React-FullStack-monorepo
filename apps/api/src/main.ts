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

  const expressApp = app.getHttpAdapter().getInstance();

  const publicPath = join(__dirname, 'public');
  const express = require('express');
  expressApp.use(express.static(publicPath));

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
  app.enableCors({
    origin: corsOrigin === 'same-origin' ? undefined : corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      enableImplicitConversion: true,
      excludeExtraneousValues: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Library Platform API')
    .setDescription('API documentation for the Library Platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
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
