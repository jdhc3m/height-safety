import assert from 'node:assert/strict';
import test from 'node:test';

import { NestFactory } from '@nestjs/core';

import { configureRuntimeApiApp } from '../dist/api-bootstrap.js';
import { AppModule } from '../dist/app.module.js';

test('runtime API is mounted under the versioned contract prefix', async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureRuntimeApiApp(app);

  await app.listen(0);
  try {
    const address = app.getHttpServer().address();
    assert.ok(address && typeof address === 'object');

    const versionedHealth = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/health`,
    );
    assert.equal(versionedHealth.status, 200);

    const unversionedHealth = await fetch(
      `http://127.0.0.1:${address.port}/health`,
    );
    assert.equal(unversionedHealth.status, 404);
  } finally {
    await app.close();
  }
});
