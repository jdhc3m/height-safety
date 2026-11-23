#!/usr/bin/env node
// Stage 4c-v3: expand the Actions nav group, find Flows, open the Login flow.
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

await p.goto(`${base}`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

// Expand the Actions nav item.
const navActions = p.locator('a, button, [role="menuitem"]', { hasText: /^Actions/ }).first();
await navActions.click().catch(() => {});
await p.waitForTimeout(1200);
const links = await p.$$eval('a', (els) =>
  els
    .filter((e) => e.offsetParent !== null)
    .map((e) => `${(e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30)} → ${e.getAttribute('href') ?? ''}`)
    .filter((t) => /action|flow|trigger|library/i.test(t)),
);
console.log('ACTIONS NAV LINKS:');
console.log(links.join('\n') || '(none)');

// Prefer a direct href to flows.
const flowsHref = links.find((l) => l.includes('/flows'));
if (flowsHref) {
  const href = flowsHref.split('→ ')[1];
  await p.goto(href.startsWith('http') ? href : `https://manage.auth0.com${href}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);
  console.log(`navigated: ${p.url().split('/dashboard')[1]}`);
} else {
  // Click the "Flows" sub-item.
  const flows = p.locator('a, button, [role="menuitem"]', { hasText: /^Flows/ }).first();
  await flows.click().catch(() => {});
  await p.waitForTimeout(2500);
  console.log(`after Flows click: ${p.url().split('/dashboard')[1]}`);
}

await p.screenshot({ path: `${SHOT}/auth0-stage4c3-flows.png`, fullPage: true });
const loginFlow = p.locator('a, button, [role="row"], [role="link"]', { hasText: /^Login/ }).last();
if (await loginFlow.isVisible().catch(() => false)) {
  await loginFlow.click();
  await p.waitForTimeout(4500);
  console.log(`after Login click: ${p.url().split('/dashboard')[1]}`);
  await p.screenshot({ path: `${SHOT}/auth0-stage4c3-editor.png`, fullPage: true });
  const card = p.locator('div, li, button, [role="button"]', { hasText: ACTION_NAME }).last();
  console.log(`action card visible: ${await card.isVisible().catch(() => false)}`);
} else {
  console.log('⚠ Login flow not found here');
}

process.exit(0);