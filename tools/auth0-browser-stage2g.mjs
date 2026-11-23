#!/usr/bin/env node
// Stage 2g: read the API Access tab for both applications and report the
// toggle state for the custom API audience. Run from the repo root.

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

const APPS = [
  { id: env.WEB_CLIENT_ID_TO_INSPECT ?? 'CdMj3rna47rWIKUoLWPCLpJnAMidOt4b', label: 'Web' },
  { id: env.NATIVE_CLIENT_ID_TO_INSPECT ?? '31T9oNH3K6E0qWzsNRai9vQ7ZknTdL48', label: 'Native' },
];
const AUDIENCE = 'https://height-safety-api.local';

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1440, height: 900 });

for (const app of APPS) {
  // Try the direct URL first; fall back to clicking the tab.
  await p.goto(`${base}/applications/${app.id}/api-access`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(2500);
  if (!p.url().includes('/api-access')) {
    await p.goto(`${base}/applications/${app.id}/settings`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1500);
    const tab = p.locator('a, [role="tab"]', { hasText: 'API Access' }).first();
    if (await tab.isVisible().catch(() => false)) await tab.click().catch(() => {});
    await p.waitForTimeout(2500);
  }
  console.log(`--- ${app.label}: ${p.url()}`);

  // List every switch on the page with its row text.
  const switches = await p.$$eval('[role="switch"], input[type="checkbox"]', (els) =>
    els
      .filter((e) => e.offsetParent !== null)
      .map((e) => {
        const row = e.closest('tr, [role="row"], li, [role="listitem"]') ?? e.parentElement;
        const text = ((row?.innerText ?? '') || '').replace(/\s+/g, ' ').trim().slice(0, 100);
        const checked = e.getAttribute('aria-checked') ?? (e.checked ? 'true' : 'false');
        return `switch="${checked}" row="${text}"`;
      }),
  );
  console.log(switches.length ? switches.join('\n') : '(no switches found)');
  if (!switches.length) {
    const body = (await p.innerText('body').catch(() => '')).replace(/\n{2,}/g, '\n').slice(0, 800);
    console.log('PAGE EXCERPT:\n' + body);
  }
  await p.screenshot({ path: `${SHOT}/auth0-api-access-${app.label}.png`, fullPage: true });
}

console.log('\nStage 2g complete.');
process.exit(0);