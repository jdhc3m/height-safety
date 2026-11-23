#!/usr/bin/env node
// Stage 4c-v4: open the Triggers page and attach the deployed action to the
// Login / Post Login trigger. Run from the repo root.

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

await p.goto(`${base}/actions/triggers`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);
console.log(`url: ${p.url().split('/dashboard')[1]}`);
await p.screenshot({ path: `${SHOT}/auth0-stage4c4-triggers.png`, fullPage: true });

const body = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ').slice(0, 600);
console.log('PAGE EXCERPT:', body.slice(0, 500));

// Find the Post Login trigger entry and open it.
const postLogin = p.locator('a, button, [role="row"], [role="link"], [role="button"]', { hasText: /login \/ post.?login|post.?login/i }).first();
if (await postLogin.isVisible().catch(() => false)) {
  await postLogin.click();
  await p.waitForTimeout(4000);
  console.log(`after Post Login click: ${p.url().split('/dashboard')[1]}`);
} else {
  console.log('⚠ Post Login entry not found');
}

await p.waitForTimeout(1500);
await p.screenshot({ path: `${SHOT}/auth0-stage4c4-trigger-detail.png`, fullPage: true });
const card = p.locator('div, li, button, [role="button"]', { hasText: ACTION_NAME }).last();
console.log(`action card visible: ${await card.isVisible().catch(() => false)}`);

process.exit(0);