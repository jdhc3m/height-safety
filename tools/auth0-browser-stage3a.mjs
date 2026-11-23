#!/usr/bin/env node
// Stage 3a: read the tenant MFA settings and database connection
// email-verification state. Read-only. Run from the repo root.

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

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1440, height: 900 });

async function shotAndText(url, name) {
  await p.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(2500);
  console.log(`\n===== ${name} (${p.url()})`);
  const checks = await p.$$eval('input[type="checkbox"], [role="switch"], [role="radio"], [role="checkbox"]', (els) =>
    els
      .filter((e) => e.offsetParent !== null)
      .map((e) => {
        const row = e.closest('tr, li, [role="listitem"], label, div') ?? e.parentElement;
        const label = ((row?.innerText ?? '') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
        const on =
          e.getAttribute('aria-checked') ??
          e.getAttribute('aria-pressed') ??
          (e.checked ? 'true' : 'false');
        return `[${on}] ${label}`;
      }),
  );
  console.log('TOGGLES/CHECKS:');
  console.log(checks.join('\n') || '(none found)');
  await p.screenshot({ path: `${SHOT}/auth0-${name}.png`, fullPage: true });
}

await shotAndText(`${base}/security/mfa`, 'mfa-settings');
await shotAndText(`${base}/connections/database`, 'db-connections');

// Open the first (likely default) database connection settings.
const conn = p.locator('tr, [role="row"]', { hasText: /auth0|database/i }).last();
console.log('\n===== database connection rows:');
const rows = await p.$$eval('table tbody tr', (trs) =>
  trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 120)),
);
console.log(rows.join('\n') || '(no rows)');

process.exit(0);