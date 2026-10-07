#!/usr/bin/env node
// Stage 4c-v2: reach the Login flow via /actions/flows and open its editor.
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

const ACTION_NAME = 'Height Safety Post Login Claims';

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1600, height: 950 });

for (const url of [`${base}/actions/flows`, `${base}/actions/flows/login`]) {
  await p.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(3000);
  console.log(`tried ${url.split('/dashboard')[1]} → ${p.url().split('/dashboard')[1]}`);
  if (p.url().includes('/flows')) break;
}
await p.screenshot({ path: `${SHOT}/auth0-stage4c2-flows.png`, fullPage: true });

// Click the Login flow entry wherever it is.
const loginEntry = p.locator('a, button, [role="link"], [role="row"], div', { hasText: /^Login/ }).last();
if (await loginEntry.isVisible().catch(() => false)) {
  await loginEntry.click();
  await p.waitForTimeout(4000);
  console.log(`after click: ${p.url().split('/dashboard')[1]}`);
} else {
  console.log('⚠ Login flow entry not found on this page');
  const text = (await p.innerText('body').catch(() => '')).slice(0, 400);
  console.log(text);
  process.exit(1);
}

await p.waitForTimeout(2000);
await p.screenshot({ path: `${SHOT}/auth0-stage4c2-editor.png`, fullPage: true });
const card = p.locator('div, li, button, [role="button"]', { hasText: ACTION_NAME }).last();
console.log(`action card visible in panel: ${await card.isVisible().catch(() => false)}`);

process.exit(0);