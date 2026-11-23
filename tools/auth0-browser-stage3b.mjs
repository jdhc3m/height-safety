#!/usr/bin/env node
// Stage 3b: enable the One-time Password factor and set the MFA policy to
// Always, then verify. Stops cleanly on any upgrade/paywall modal.
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
const [tenant, region] = domain.split('.');
const base = `https://manage.auth0.com/dashboard/${region}/${tenant}`;

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1440, height: 900 });

await p.goto(`${base}/security/mfa`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

function snap() {
  return p.screenshot({ path: `${SHOT}/auth0-stage3b.png`, fullPage: true }).catch(() => {});
}

async function upgradeModalDetected(where) {
  const t = (await p.innerText('body').catch(() => '')).toLowerCase();
  const hit = t.includes('upgrade') && (t.includes('plan') || t.includes('purchase') || t.includes('pricing'));
  if (hit) {
    console.log(`⚠ possible upgrade wall detected (${where})`);
    await snap();
  }
  return hit;
}

// 1) Enable the One-time Password factor toggle.
const otpRow = p.locator('div, li, section', { hasText: 'One-time Password' }).last();
const otpToggle = p
  .locator('[role="switch"]:visible, input[type="checkbox"]:visible')
  .filter({ hasNot: p.locator('xpath=self::*[@disabled]') });
let toggled = false;
const switches = await p.locator('[role="switch"]:visible').all();
for (const sw of switches) {
  const checked = await sw.getAttribute('aria-checked').catch(() => null);
  const rowText = ((await sw.locator('xpath=ancestor::*[self::div or self::li][1]').first().innerText().catch(() => '')) || '').toLowerCase();
  if (rowText.includes('one-time password') && checked === 'false') {
    await sw.scrollIntoViewIfNeeded().catch(() => {});
    await sw.click();
    await p.waitForTimeout(1200);
    toggled = true;
    console.log('✓ clicked One-time Password toggle');
    break;
  }
}
if (!toggled) console.log('(One-time Password toggle not found or already on)');
if (await upgradeModalDetected('factor toggle')) {
  process.exit(1);
}

// 2) Select the Always policy card.
const always = p.locator('div:has-text("Always"), [role="radio"]', { hasText: 'Always' }).last();
const radios = await p.locator('[role="radio"]:visible').all();
let picked = false;
for (const r of radios) {
  const t = ((await r.innerText().catch(() => '')) || '').toLowerCase();
  if (t.startsWith('always') || t.includes('users are always required')) {
    await r.scrollIntoViewIfNeeded().catch(() => {});
    await r.click();
    await p.waitForTimeout(800);
    picked = true;
    console.log('✓ selected Always policy');
    break;
  }
}
if (!picked) {
  // Fallback: click the card by heading text.
  const card = p.locator('div', { hasText: /^Always\s*Users are always required/ }).last();
  if (await card.isVisible().catch(() => false)) {
    await card.click();
    picked = true;
    console.log('✓ selected Always policy (fallback click)');
  }
}
if (!picked) console.log('⚠ Always policy card not found');
if (await upgradeModalDetected('policy select')) {
  process.exit(1);
}

// 3) Save the policy section.
const save = p.locator('button:visible', { hasText: /^save$/i }).last();
if (await save.isVisible().catch(() => false)) {
  await save.scrollIntoViewIfNeeded().catch(() => {});
  await save.click();
  await p.waitForTimeout(2500);
  console.log('✓ clicked Save');
} else {
  console.log('⚠ no Save button visible');
}
if (await upgradeModalDetected('save')) {
  process.exit(1);
}

// 4) Verify: reload and dump factor + policy state.
await p.goto(`${base}/security/mfa`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const body = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
const otpOn = /one-time password.*?(enabled)/i.test(body);
const policy = body.match(/require multi-factor auth.*?(never|always|use adaptive mfa)/i);
console.log(`VERIFY: OTP factor ${otpOn ? 'Enabled' : 'not detected as enabled'}`);
console.log(`VERIFY: policy reads "${policy ? policy[1] : '?'}"`);
await snap();

process.exit(0);