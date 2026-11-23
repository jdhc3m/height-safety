#!/usr/bin/env node
// Stage 2b: attach to the running automation Chrome and read the settings of
// the web application and native application (client secret, callback URLs).
// Read-only. Run from the repo root.

import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env.auth0.local');
const CDP = 'http://localhost:9222';

const env = Object.fromEntries(
  existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, 'utf8').split('\n').filter(Boolean).map((l) => l.split('=', 2))
    : [],
);
const domain = env.AUTH0_DOMAIN;
if (!domain) {
  console.error('AUTH0_DOMAIN missing — run stage 1 first.');
  process.exit(1);
}
const [tenant, region] = domain.split('.');
const base = `https://manage.auth0.com/dashboard/${region}/${tenant}`;

const WEB_CLIENT_ID = env.WEB_CLIENT_ID_TO_INSPECT ?? 'CdMj3rna47rWIKUoLWPCLpJnAMidOt4b';
const NATIVE_CLIENT_ID = env.NATIVE_CLIENT_ID_TO_INSPECT ?? '31T9oNH3K6E0qWzsNRai9vQ7ZknTdL48';

const browser = await chromium.connectOverCDP(CDP);
browser.on('disconnected', () => {
  console.error('Chrome was closed.');
  process.exit(1);
});
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());

async function readSettings(clientId, label) {
  const url = `${base}/applications/${clientId}/settings`;
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('input, textarea', { timeout: 30000 });
  // The client secret may be masked; its value is still in the DOM input.
  const fields = await p.$$eval('input, textarea', (els) =>
    els
      .map((e) => {
        const labelEl =
          e.labels?.[0]?.innerText ??
          e.closest('label')?.innerText ??
          e.closest('div')?.innerText ??
          '';
        return {
          tag: e.tagName.toLowerCase(),
          name: e.name || e.getAttribute('data-testid') || e.id || '',
          label: labelEl.replace(/\s+/g, ' ').slice(0, 60),
          type: e.type ?? '',
          value: e.value.replace(/\s+/g, ' ').slice(0, 300),
        };
      })
      .filter((f) => f.value || f.label),
  );
  console.log(`--- ${label} (${clientId})`);
  for (const f of fields) {
    const mark = f.type === 'password' ? ' [password field]' : '';
    console.log(`${f.name || f.label || '(unnamed)'} = ${f.value}${mark}`);
  }
}

await readSettings(WEB_CLIENT_ID, 'Regular Web App');
await readSettings(NATIVE_CLIENT_ID, 'Native Android App');
console.log('\nRead complete. Chrome left open.');
process.exit(0);