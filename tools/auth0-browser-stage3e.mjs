#!/usr/bin/env node
// Stage 3e: enable the One-time Password factor, select the Always policy,
// save, and verify. Detects plan-gating dialogs. Run from the repo root.

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

async function paywall(where) {
  await p.waitForTimeout(800);
  const dialogs = await p.$$eval('[role="dialog"], [role="alertdialog"]', (els) =>
    els.filter((e) => e.offsetParent !== null).map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 200)),
  );
  const t = dialogs.join(' | ').toLowerCase();
  if (t && (t.includes('upgrade') || t.includes('pro') || t.includes('plan') || t.includes('purchase'))) {
    console.log(`⚠ PLAN GATE at ${where}: ${t}`);
    await p.screenshot({ path: `${SHOT}/auth0-paywall.png`, fullPage: true });
    return true;
  }
  return false;
}

await p.goto(`${base}/security/mfa`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

// 1) Enable the OTP factor via its labelled checkbox.
const otp = p.locator('input[aria-label="Enable one-time passcode"]').first();
if (!(await otp.isVisible().catch(() => false))) {
  console.log('⚠ OTP checkbox not found — page structure changed');
  process.exit(1);
}
const checkedBefore = await otp.getAttribute('aria-checked') ?? String(await otp.isChecked().catch(() => false));
if (checkedBefore === 'true') {
  console.log('✓ OTP already enabled');
} else {
  await otp.scrollIntoViewIfNeeded().catch(() => {});
  await otp.click({ force: true }).catch(async (e) => {
    console.log(`direct click failed (${e.message?.slice(0, 60)}) — trying check()`);
    await otp.check({ force: true });
  });
  await p.waitForTimeout(1500);
  console.log('✓ clicked OTP enable');
  if (await paywall('otp enable')) process.exit(1);
  const now = (await otp.getAttribute('aria-checked')) ?? String(await otp.isChecked().catch(() => false));
  console.log(`OTP checkbox now: ${now}`);
}

// 2) Select the Always policy: click the nearest pointer-enabled ancestor.
const picked = await p.evaluate(() => {
  const spans = [...document.querySelectorAll('span, p')].filter((e) =>
    (e.textContent || '').includes('Users are always required to use an additional factor'),
  );
  if (!spans.length) return 'no text node';
  let el = spans[0];
  for (let i = 0; i < 10 && el; i++) {
    const cur = getComputedStyle(el).cursor;
    if (cur === 'pointer') {
      el.click();
      return `clicked <${el.tagName.toLowerCase()} class=${(el.className || '').toString().slice(0, 40)}>`;
    }
    el = el.parentElement;
  }
  return 'no pointer ancestor found';
});
console.log(`Always policy: ${picked}`);
await p.waitForTimeout(800);
if (await paywall('policy select')) process.exit(1);

// 3) Save the policies section (first visible Save button).
const saves = p.locator('button:visible', { hasText: /^save$/i });
const n = await saves.count();
if (n > 0) {
  await saves.first().scrollIntoViewIfNeeded().catch(() => {});
  await saves.first().click();
  await p.waitForTimeout(2500);
  console.log('✓ clicked Save');
} else {
  console.log('⚠ no Save button visible');
  await p.screenshot({ path: `${SHOT}/auth0-stage3e.png`, fullPage: true });
}
if (await paywall('save')) process.exit(1);

// 4) Verify with a fresh load.
await p.goto(`${base}/security/mfa`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const body = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
console.log(`VERIFY OTP row says: ${/one-time password .*? (enabled|disabled)/i.exec(body)?.[1] ?? '?'}`);
console.log(`VERIFY policy: ${body.includes('Never Users are not required') ? 'Never selected' : '?'}`);
await p.screenshot({ path: `${SHOT}/auth0-stage3e-final.png`, fullPage: true });

process.exit(0);