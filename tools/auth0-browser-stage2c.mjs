#!/usr/bin/env node
// Stage 2c: attach to the running automation Chrome and
// 1) set the Required Callback/Logout URLs on the web and native applications,
// 2) reveal the web client secret and store it in .env.auth0.local (never printed),
// 3) check the custom API's application grants (read-only).
// Only the exact wizard-required URL fields are edited. Run from the repo root.

import { chromium } from 'playwright';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env.auth0.local');
const CDP = 'http://localhost:9222';

function upsertEnv(key, value) {
  const lines = existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, 'utf8').split('\n').filter(Boolean).filter((l) => !l.startsWith(`${key}=`))
    : [];
  lines.push(`${key}=${value}`);
  writeFileSync(ENV_FILE, lines.join('\n') + '\n', { mode: 0o600 });
  chmodSync(ENV_FILE, 0o600);
}

const env = Object.fromEntries(
  existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, 'utf8').split('\n').filter(Boolean).map((l) => l.split('=', 2))
    : [],
);
const domain = env.AUTH0_DOMAIN;
if (!domain) {
  console.error('AUTH0_DOMAIN missing — run stage 1 first.');
  process.exit(1);
}
const [tenant, region] = domain.split('.');
const base = `https://manage.auth0.com/dashboard/${region}/${tenant}`;

const WEB = {
  id: env.WEB_CLIENT_ID_TO_INSPECT ?? 'CdMj3rna47rWIKUoLWPCLpJnAMidOt4b',
  callbacks: ['http://localhost:3000/auth/callback'],
  logout: ['http://localhost:3000'],
};
const NATIVE = {
  id: env.NATIVE_CLIENT_ID_TO_INSPECT ?? '31T9oNH3K6E0qWzsNRai9vQ7ZknTdL48',
  callbacks: [`https://${domain}/android/au.com.heightsafety.app/callback`],
  logout: [`https://${domain}/android/au.com.heightsafety.app/callback`],
};

const browser = await chromium.connectOverCDP(CDP);
browser.on('disconnected', () => {
  console.error('Chrome was closed.');
  process.exit(1);
});
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());

async function setValue(name, wanted) {
  const el = p.locator(`[name="${name}"]`).first();
  const current = (await el.inputValue().catch(() => '')) ?? '';
  const list = current.split('\n').map((s) => s.trim()).filter(Boolean);
  const missing = wanted.filter((w) => !list.includes(w));
  if (missing.length === 0) {
    console.log(`✓ ${name} already contains required value(s)`);
    return false;
  }
  const merged = [...list, ...wanted].join('\n');
  await el.fill(merged);
  console.log(`✎ ${name} set (${missing.length} value(s) added)`);
  return true;
}

async function saveSection(fieldNames) {
  // The dashboard shows one Save button per section; find the one visible
  // after our fields and click it.
  const buttons = p.locator('button:has-text("Save"), button:has-text("save changes")');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const b = buttons.nth(i);
    if (await b.isVisible().catch(() => false)) {
      await b.click().catch(() => {});
      await p.waitForTimeout(1500);
      console.log('✓ clicked a Save button');
      return true;
    }
  }
  console.log('⚠ no visible Save button found — check the page');
  return false;
}

async function configureApp(app, label) {
  await p.goto(`${base}/applications/${app.id}/settings`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('[name="callbacks"]', { timeout: 30000 });
  console.log(`--- ${label}`);
  const changed = await setValue('callbacks', app.callbacks);
  const changedLogout = await setValue('allowed_logout_urls', app.logout);
  if (changed || changedLogout) await saveSection(['callbacks', 'allowed_logout_urls']);
}

await configureApp(WEB, 'Regular Web App (My App)');
await configureApp(NATIVE, 'Native Android App (Height Safety)');

// Reveal + capture the web client secret into the env file (not printed).
await p.goto(`${base}/applications/${WEB.id}/settings`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('[name="client_secret"]', { timeout: 30000 });
let secret = await p.locator('[name="client_secret"]').first().inputValue().catch(() => '');
if (!secret) {
  const reveal = p.locator('button:has-text("Reveal"), [aria-label*="eveal" i]').first();
  if (await reveal.isVisible().catch(() => false)) {
    await reveal.click();
    await p.waitForTimeout(800);
    secret = await p.locator('[name="client_secret"]').first().inputValue().catch(() => '');
  }
}
if (secret) {
  upsertEnv('AUTH0_CLIENT_ID', WEB.id);
  upsertEnv('AUTH0_CLIENT_SECRET', secret);
  upsertEnv('ANDROID_NATIVE_CLIENT_ID', NATIVE.id);
  upsertEnv('AUTH0_API_AUDIENCE', 'https://height-safety-api.local');
  console.log(`✓ AUTH0_CLIENT_SECRET captured into .env.auth0.local (${secret.length} chars, starts "${secret.slice(0, 2)}…")`);
} else {
  console.log('⚠ client secret still masked — copy it manually from the web app settings page');
}

// Read-only: check the custom API's application grants.
await p.goto(`${base}/apis`, { waitUntil: 'domcontentloaded' });
const apiLink = p.locator('a', { hasText: 'Height Safety API Local 2' }).first();
if (await apiLink.isVisible().catch(() => false)) {
  await apiLink.click();
  await p.waitForTimeout(2000);
  const grantsLink = p.locator('a, button', { hasText: 'Application Grants' }).first();
  if (await grantsLink.isVisible().catch(() => false)) {
    await grantsLink.click();
    await p.waitForTimeout(1500);
    const body = await p.innerText('body').catch(() => '');
    const idx = body.toLowerCase().indexOf('application grants');
    console.log('--- Application grants page text (excerpt):');
    console.log((idx >= 0 ? body.slice(idx) : body).slice(0, 600).replace(/\n{2,}/g, '\n'));
  } else {
    console.log('⚠ Application Grants tab not found on API page');
  }
} else {
  console.log('⚠ API link not found on APIs page');
}

console.log('\nStage 2c complete. Chrome left open.');
process.exit(0);