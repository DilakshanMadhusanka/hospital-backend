
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT', 5000);
  const prefix = configService.get<string>('API_PREFIX', 'api/v1');

  // Security headers
  app.use(helmet());

  // API prefix
  app.setGlobalPrefix(prefix);

  // Request validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Government Hospital Management API')
    .setDescription(
      'Backend API for the Sri Lankan Government Hospital Management System',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);

  console.log(`Hospital API running on http://localhost:${port}/${prefix}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
