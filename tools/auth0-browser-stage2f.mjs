#!/usr/bin/env node
// Stage 2f: verify (and if needed set + save) callback/logout URLs for both
// applications, and check the "API Access" toggles for the custom API audience.
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

const WEB = {
  id: env.WEB_CLIENT_ID_TO_INSPECT ?? 'CdMj3rna47rWIKUoLWPCLpJnAMidOt4b',
  label: 'Web',
  callbacks: ['http://localhost:3000/auth/callback'],
  logout: ['http://localhost:3000'],
};
const NATIVE = {
  id: env.NATIVE_CLIENT_ID_TO_INSPECT ?? '31T9oNH3K6E0qWzsNRai9vQ7ZknTdL48',
  label: 'Native',
  callbacks: [`https://${domain}/android/au.com.heightsafety.app/callback`],
  logout: [`https://${domain}/android/au.com.heightsafety.app/callback`],
};

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1440, height: 900 });

async function openSettings(app) {
  await p.goto(`${base}/applications/${app.id}/settings`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await p.waitForSelector('body', { timeout: 15000 });
  await p.waitForTimeout(1500);
}

function urlsInButtons() {
  return p.$$eval('button, [role="button"]', (els) =>
    els
      .filter((e) => e.offsetParent !== null)
      .map((e) => (e.innerText || '').trim())
      .filter((t) => /^https?:\/\/\S+$/.test(t)),
  );
}

async function dismissBanners() {
  const d = p.locator('button:has-text("Dismiss")').first();
  if (await d.isVisible().catch(() => false)) await d.click().catch(() => {});
}

// Returns the set of URL chips visible after opening edit mode (server state).
async function readUrls(app) {
  await openSettings(app);
  await dismissBanners();
  const edit = p.locator('button:has-text("Edit Configuration")').first();
  if (await edit.isVisible().catch(() => false)) {
    await edit.click();
    await p.waitForTimeout(1200);
  }
  const urls = await urlsInButtons();
  console.log(`${app.label} URL chips: ${JSON.stringify(urls)}`);
  return urls;
}

async function addChip(name, url) {
  const input = p.locator(`[name="${name}"]`).first();
  await input.scrollIntoViewIfNeeded().catch(() => {});
  await input.click();
  await input.fill(url);
  await input.press('Enter');
  await p.waitForTimeout(400);
}

async function clickSaveAny() {
  await p.waitForTimeout(800);
  const cands = p.locator('button:visible, [role="button"]:visible');
  const n = await cands.count();
  for (let i = 0; i < n; i++) {
    const b = cands.nth(i);
    const text = ((await b.innerText().catch(() => '')) || '').trim().toLowerCase();
    if (text.startsWith('save')) {
      await b.scrollIntoViewIfNeeded().catch(() => {});
      await b.click();
      await p.waitForTimeout(2500);
      console.log(`✓ clicked save ("${text}")`);
      return true;
    }
  }
  await p.screenshot({ path: `${SHOT}/auth0-no-save.png`, fullPage: true });
  console.log('⚠ no save button found (screenshot saved)');
  return false;
}

async function ensureUrls(app) {
  const urls = await readUrls(app);
  const needC = app.callbacks.filter((u) => !urls.includes(u));
  const needL = app.logout.filter((u) => !urls.includes(u));
  if (!needC.length && !needL.length) {
    console.log(`✓ ${app.label}: all required URLs already saved`);
    return true;
  }
  for (const u of needC) await addChip('callbacks', u);
  for (const u of needL) await addChip('allowed_logout_urls', u);
  const saved = await clickSaveAny();
  if (!saved) return false;
  const after = await readUrls(app);
  const ok = [...app.callbacks, ...app.logout].every((u) => after.includes(u));
  console.log(`${ok ? '✓' : '⚠'} ${app.label} verification after save: ${JSON.stringify(after)}`);
  return ok;
}

// API Access tab: check the toggle for the custom API audience.
async function ensureApiAccess(app, audience) {
  await openSettings(app);
  await dismissBanners();
  const tab = p.locator('a, button, [role="tab"]', { hasText: 'API Access' }).first();
  if (!(await tab.isVisible().catch(() => false))) {
    console.log(`⚠ ${app.label}: API Access tab not found`);
    return;
  }
  await tab.click();
  await p.waitForTimeout(2000);
  const row = p.locator('tr, [role="row"], li, div', { hasText: audience }).last();
  const sw = row.locator('[role="switch"], input[type="checkbox"]').first();
  if (!(await sw.isVisible().catch(() => false))) {
    const body = (await p.innerText('body').catch(() => '')).slice(0, 500);
    console.log(`⚠ ${app.label}: no switch found for ${audience}. Page excerpt:\n${body}`);
    await p.screenshot({ path: `${SHOT}/auth0-api-access-${app.label}.png`, fullPage: true });
    return;
  }
  const checked = (await sw.getAttribute('aria-checked').catch(() => null)) ?? (await sw.isChecked().catch(() => false));
  console.log(`${app.label} API access for ${audience}: ${checked ? 'ON' : 'OFF'}`);
  if (!checked) {
    await sw.click().catch(async () => {
      await row.click();
    });
    await p.waitForTimeout(2500);
    const now = (await sw.getAttribute('aria-checked').catch(() => null)) ?? (await sw.isChecked().catch(() => false));
    console.log(`${now ? '✓ enabled' : '⚠ still off'} ${app.label} API access`);
  }
}

await ensureUrls(WEB);
await ensureUrls(NATIVE);
await ensureApiAccess(WEB, 'https://height-safety-api.local');
await ensureApiAccess(NATIVE, 'https://height-safety-api.local');

console.log('\nStage 2f complete. Chrome left open.');
process.exit(0);