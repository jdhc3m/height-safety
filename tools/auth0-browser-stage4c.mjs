#!/usr/bin/env node
// Stage 4c: open the Login flow editor and attach the deployed action.
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

await p.goto(`${base}/actions/flows/login`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);
console.log(`url: ${p.url()}`);

const actionCard = p.locator('div, li, button, [role="button"]', { hasText: ACTION_NAME }).last();
const cardVisible = await actionCard.isVisible().catch(() => false);
console.log(`library card visible: ${cardVisible}`);
await p.screenshot({ path: `${SHOT}/auth0-stage4c-flow.png`, fullPage: true });

// Look for the add-action "+" control between Start and Complete.
const plusButtons = await p.$$eval('[data-testid*="add"], [aria-label*="add" i], [aria-label*="Add" i]', (els) =>
  els
    .filter((e) => e.offsetParent !== null)
    .map((e) => `${e.tagName.toLowerCase()} ${e.getAttribute('data-testid') ?? ''} ${e.getAttribute('aria-label') ?? ''}`.trim().slice(0, 80)),
);
console.log('ADD CONTROLS:', JSON.stringify(plusButtons, null, 1));

process.exit(0);