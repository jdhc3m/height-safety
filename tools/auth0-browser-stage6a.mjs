#!/usr/bin/env node
// Stage 6a: open the office web in the automation Chrome and wait for the
// owner to complete the Auth0 login, then report what the app shows.
// Run from the repo root.

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

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = await context.newPage();
await p.setViewportSize({ width: 1440, height: 900 });

await p.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
const signIn = p.locator('a:has-text("Sign in with Auth0"), button:has-text("Sign in with Auth0")').first();
if (await signIn.isVisible().catch(() => false)) {
  await signIn.click();
  console.log('Clicked "Sign in with Auth0" — complete the login in this tab.');
} else {
  console.log('No sign-in button found — maybe already logged in.');
}

const started = Date.now();
let lastHint = 0;
const AUTH0 = new RegExp(domain.replace(/\./g, '\\.'));

while (Date.now() - started < 6 * 60 * 1000) {
  const url = p.url();
  const onAuth0 = AUTH0.test(url);
  const onLocal = /localhost:3000/.test(url) && !/\/auth\/login/.test(url);
  if (onLocal && !onAuth0) {
    await p.waitForTimeout(3000); // let server render settle
    const text = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
    if (/sign in with auth0/i.test(text)) {
      // Still on the landing page — not logged in yet.
    } else {
      console.log(`\nURL: ${url}`);
      console.log(`PAGE: ${text.slice(0, 900)}`);
      await p.screenshot({ path: `${SHOT}/auth0-office-logged-in.png`, fullPage: true });
      console.log('\n✓ logged in — screenshot saved (auth0-office-logged-in.png)');
      process.exit(0);
    }
  }
  if (Date.now() - lastHint > 20000) {
    lastHint = Date.now();
    console.log(`waiting... (${Math.round((Date.now() - started) / 1000)}s) url: ${url.slice(0, 100)}`);
  }
  await p.waitForTimeout(1500);
}
console.log('timed out — screenshot:');
await p.screenshot({ path: `${SHOT}/auth0-office-timeout.png`, fullPage: true });
process.exit(1);