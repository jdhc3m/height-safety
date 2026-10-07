#!/usr/bin/env node
// Stage 3c: precise read of the MFA page — which factor switches and policy
// cards are disabled (plan-gated). Read-only. Run from the repo root.

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

await p.goto(`${base}/security/mfa`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

// Walk the factor rows: name, plan badge, switch state/disabled.
const factors = await p.$$eval('div, li', (els) => {
  const rows = [];
  for (const e of els) {
    const t = (e.innerText || '').trim();
    if (!t) continue;
    const m = t.match(
      /^(WebAuthn with FIDO Security Keys|WebAuthn with FIDO Device Biometrics|One-time Password|Push Notification using Auth0 Guardian|Phone Message|Email|Recovery Code|DUO Security)\s*\n\s*(PRO MFA|ENTERPRISE MFA)?/,
    );
    if (!m) continue;
    const sw = e.querySelector('[role="switch"]');
    if (!sw) continue;
    rows.push({
      name: m[1],
      badge: m[2] ?? '(no badge)',
      checked: sw.getAttribute('aria-checked'),
      disabled: sw.hasAttribute('disabled') || sw.getAttribute('aria-disabled') === 'true',
    });
  }
  return rows;
});
console.log('FACTORS:');
for (const f of factors) console.log(`- ${f.name} [${f.badge}] checked=${f.checked} disabled=${f.disabled}`);

const cards = await p.$$eval('[role="radio"]', (els) =>
  els.map((e) => ({
    label: ((e.innerText || '') || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    checked: e.getAttribute('aria-checked'),
    disabled: e.hasAttribute('disabled') || e.getAttribute('aria-disabled') === 'true',
  })),
);
console.log('\nPOLICY CARDS:');
for (const c of cards) console.log(`- "${c.label}" checked=${c.checked} disabled=${c.disabled}`);

const body = (await p.innerText('body').catch(() => '')).toLowerCase();
for (const kw of ['upgrade', 'purchase', 'contact sales', 'plan']) {
  if (body.includes(kw)) {
    const i = body.indexOf(kw);
    console.log(`\npage mentions "${kw}": ...${body.slice(Math.max(0, i - 80), i + 120).replace(/\s+/g, ' ')}...`);
  }
}

process.exit(0);