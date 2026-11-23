import { NestFactory } from '@nestjs/core';

import { configureRuntimeApiApp } from './api-bootstrap';
import { AppModule } from './app.module';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureRuntimeApiApp(app);
  await app.listen(
    Number(process.env.PORT ?? 3000),
    process.env.HOST ?? '0.0.0.0',
  );
}

if (require.main === module) {
  void bootstrap();
}
