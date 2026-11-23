#!/usr/bin/env node
// Stage 1 of the Auth0 browser flow: open the Auth0 dashboard in a visible
// Chrome window, wait for the owner to log in (and complete MFA), then capture
// the tenant domain and save it to .env.auth0.local. Run from the repo root.

import { chromium } from 'playwright';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env.auth0.local');
const PROFILE_DIR = '/var/folders/0l/b700nwys2tj56ssxv3pjf16w0000gn/T/opencode/auth0-profile';
const LOGIN_TIMEOUT_MS = 9 * 60 * 1000;

function upsertEnv(key, value) {
  const lines = existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, 'utf8').split('\n').filter(Boolean).filter((l) => !l.startsWith(`${key}=`))
    : [];
  lines.push(`${key}=${value}`);
  writeFileSync(ENV_FILE, lines.join('\n') + '\n', { mode: 0o600 });
  chmodSync(ENV_FILE, 0o600);
}

let context;
try {
  context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: 'chrome',
    viewport: null,
    ignoreDefaultArgs: ['--enable-automation', '--enable-automation-abandoned-server-caveat'],
    args: [
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
    ],
  });
} catch (err) {
  console.error('Failed to launch Chrome:', err.message ?? err);
  process.exit(1);
}

console.log('Chrome is open. If a login page is showing, sign in and complete MFA.');
console.log('If you see a tenant picker, click the tenant you want to configure.');

const page = context.pages()[0] ?? (await context.newPage());
await page.goto('https://manage.auth0.com/', { waitUntil: 'domcontentloaded' });

let closing = false;
context.on('close', () => {
  closing = true;
  console.error('The whole Chrome window was closed before login completed.');
  process.exit(1);
});

const DASH = /\/dashboard\/([a-z-]+)\/([a-z0-9][a-z0-9-]*)/;

async function dashboardUrl() {
  for (const p of context.pages()) {
    if (p.isClosed()) continue;
    const m = p.url().match(DASH);
    if (m) return m;
  }
  return null;
}

function describePages() {
  return context
    .pages()
    .filter((p) => !p.isClosed())
    .map((p) => {
      let u = p.url();
      if (u.length > 100) u = u.slice(0, 100) + '…';
      return u || '(blank)';
    })
    .join(' | ') || '(no tabs)';
}

const started = Date.now();
let lastHint = 0;

while (true) {
  if (closing) process.exit(1);
  const m = await dashboardUrl();
  if (m) {
    const [, region, tenant] = m;
    const domain = `${tenant}.${region}.auth0.com`;
    upsertEnv('AUTH0_DOMAIN', domain);
    console.log(`\nDetected tenant: ${tenant} (region ${region})`);
    console.log(`Domain saved to .env.auth0.local as AUTH0_DOMAIN=${domain}`);
    if (domain.endsWith('.us.auth0.com')) {
      console.log('Note: US tenant — acceptable for local dev per D-046; does not close the AU pilot action.');
    } else if (domain.endsWith('.au.auth0.com')) {
      console.log('Note: AU tenant — matches the pilot target locality.');
    }
    await context.close();
    process.exit(0);
  }
  if (Date.now() - lastHint > 20000) {
    lastHint = Date.now();
    console.log(`Waiting... (${Math.round((Date.now() - started) / 1000)}s) current page(s): ${describePages()}`);
  }
  if (Date.now() - started > LOGIN_TIMEOUT_MS) {
    console.error('Timed out after 5 minutes. Re-run this script to try again (session is kept).');
    await context.close();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 1500));
}