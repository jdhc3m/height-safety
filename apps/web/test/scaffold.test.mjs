import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('web scaffold exposes neutral foundation copy', async () => {
  const page = await readFile(
    new URL('../src/app/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(page, /Office workspace scaffold/);
  assert.match(page, /No customer data/);
});
