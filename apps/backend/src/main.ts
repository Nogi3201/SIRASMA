import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { getAllowedOrigins } from './config/security.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Base64 transport expands a 5 MB file to ~6.7 MB. Keep a bounded parser
  // limit so valid document uploads are accepted without allowing large bodies.
  (app as any).useBodyParser('json', { limit: '7mb' });


  // Parse cookies (HttpOnly refresh token)
  app.use(cookieParser());

  // Enable CORS with credentials
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || getAllowedOrigins(configService).includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin tidak diizinkan oleh kebijakan CORS.'));
    },
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
