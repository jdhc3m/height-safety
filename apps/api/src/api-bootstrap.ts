import { ValidationPipe, type INestApplication } from '@nestjs/common';

export const API_V1_PREFIX = 'api/v1';

export function configureApiApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: false,
      whitelist: true,
    }),
  );
}

export function configureRuntimeApiApp(app: INestApplication): void {
  configureApiApp(app);
  app.setGlobalPrefix(API_V1_PREFIX);
}
