import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('web authentication boundary uses Auth0 middleware and protected office route', async () => {
  const middleware = await readFile(
    new URL('../src/middleware.ts', import.meta.url),
    'utf8',
  );
  const office = await readFile(
    new URL('../src/app/office/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(middleware, /auth0\.middleware\(request\)/);
  assert.match(middleware, /_next\/static/);
  assert.match(office, /auth0\.getSession\(\)/);
  assert.match(office, /redirect\('\/auth\/login\?returnTo=\/office'\)/);
  assert.match(office, /Company membership/);
  assert.match(
    office,
    /does not\s+imply that office review or reporting is complete/,
  );
});
