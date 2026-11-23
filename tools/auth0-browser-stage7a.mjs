#!/usr/bin/env node
// Check which connections are enabled for the native Android application.
// Read-only. Run from the repo root.

import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env.auth0.local');
const CDP = 'http://localhost:9222';
const SHOT = '/var/folders/0l/b700nwys2tj56ssxv3pjf16w0000gn/T/opencode';

const env = Object.fromEntries(
  existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, 'utf8').split('\n').filter(Boolean).map((l) => l.split('=', 2))
    : [],
);
const domain = env.AUTH0_DOMAIN;
const [tenant, region] = domain.split('.');
const base = `https://manage.auth0.com/dashboard/${region}/${tenant}`;
const NATIVE_ID = env.ANDROID_NATIVE_CLIENT_ID;

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1440, height: 900 });

await p.goto(`${base}/connections/social`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const rows = await p.$$eval('table tbody tr', (trs) =>
  trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 120)),
);
console.log('SOCIAL CONNECTIONS:');
rows.forEach((r) => console.log(r));
await p.screenshot({ path: `${SHOT}/auth0-social-connections.png`, fullPage: true });

// Open the Google connection and check its enabled applications.
const googleRow = p.locator('tr, [role="row"]', { hasText: /google/i }).first();
if (await googleRow.isVisible().catch(() => false)) {
  await googleRow.click().catch(async () => {
    await googleRow.locator('a, button').first().click();
  });
  await p.waitForTimeout(2500);
  console.log(`\nnavigated: ${p.url()}`);
  const tabs = await p.$$eval('a, [role="tab"]', (els) =>
    els
      .filter((e) => e.offsetParent !== null)
      .map((e) => (e.innerText || '').trim())
      .filter((t) => t && t.length < 30),
  );
  console.log('tabs:', [...new Set(tabs)].join(' | '));
  await p.screenshot({ path: `${SHOT}/auth0-google-connection.png`, fullPage: true });
}

process.exit(0);