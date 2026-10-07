#!/usr/bin/env node
// Stage 3f: revert the One-time Password toggle to disabled (free plan cannot
// activate it) and read the owner login email from the Users page.
// Run from the repo root.

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
const [tenant, region] = domain.split('.');
const base = `https://manage.auth0.com/dashboard/${region}/${tenant}`;

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1440, height: 900 });

await p.goto(`${base}/security/mfa`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

const otp = p.locator('input[aria-label="Enable one-time passcode"]').first();
const state = (await otp.getAttribute('aria-checked').catch(() => null)) ?? String(await otp.isChecked().catch(() => '?'));
if (state === 'true') {
  await otp.scrollIntoViewIfNeeded().catch(() => {});
  await otp.click({ force: true });
  await p.waitForTimeout(1200);
  console.log('✓ OTP toggle reverted to disabled');
} else {
  console.log('OTP already disabled');
}
const after = (await otp.getAttribute('aria-checked').catch(() => null)) ?? String(await otp.isChecked().catch(() => '?'));
console.log(`OTP final state: ${after}`);

// Read the owner identity email from the Users list (first row).
await p.goto(`${base}/users`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const rows = await p.$$eval('table tbody tr', (trs) =>
  trs.slice(0, 5).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 160)),
);
console.log('\nUSERS:');
rows.forEach((r, i) => console.log(`${i + 1}. ${r}`));

process.exit(0);