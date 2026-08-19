import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('web workspace exposes neutral foundation copy', async () => {
  const page = await readFile(
    new URL('../src/app/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(page, /Inspection evidence, ready for review/);
  assert.match(page, /No customer data/);
});

test('future-asset previews stay read-only and presentation-only', async () => {
  const page = await readFile(
    new URL('../src/app/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(page, /Future-asset previews/);
  assert.match(page, /Static lines/);
  assert.match(page, /Guardrails/);
  assert.match(page, /Walkways/);
  assert.match(page, /do not create register records/);
  assert.doesNotMatch(page, /<button\b|<form\b|onClick\b|useState\b/);
});
