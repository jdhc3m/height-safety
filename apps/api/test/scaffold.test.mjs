import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('API scaffold keeps health route in NestJS source tree', async () => {
  const controller = await readFile(
    new URL('../src/health.controller.ts', import.meta.url),
    'utf8',
  );
  const module = await readFile(
    new URL('../src/app.module.ts', import.meta.url),
    'utf8',
  );
  const bootstrap = await readFile(
    new URL('../src/api-bootstrap.ts', import.meta.url),
    'utf8',
  );
  const main = await readFile(
    new URL('../src/main.ts', import.meta.url),
    'utf8',
  );

  assert.match(controller, /@Controller\('health'\)/);
  assert.match(module, /HealthController/);
  assert.match(bootstrap, /forbidNonWhitelisted: true/);
  assert.match(bootstrap, /whitelist: true/);
  assert.match(main, /configureRuntimeApiApp/);
});
