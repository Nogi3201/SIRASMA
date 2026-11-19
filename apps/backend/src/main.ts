import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const port = process.env.BACKEND_PORT ?? 3000;
  await app.listen(port);

  console.log(`Backend running on http://localhost:${port}/api`);
}
await bootstrap();
