import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Parse cookies (HttpOnly refresh token)
  app.use(cookieParser());

  // Enable CORS with credentials
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global DTO Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.BACKEND_PORT ?? 3000;
  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}/api`);
}
await bootstrap();
