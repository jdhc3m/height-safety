#!/usr/bin/env node
// Stage 2d: set callback/logout URLs on both applications and actually save
// them, verifying persistence afterwards. Also inspect the custom API page.
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

async function dumpButtons(tag) {
  const buttons = await p.$$eval('button, [role="button"]', (els) =>
    els
      .filter((e) => e.offsetParent !== null)
      .slice(0, 60)
      .map((e) => {
        const text = (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
        return `${text || '(no text)'}${e.getAttribute('data-testid') ? ` [${e.getAttribute('data-testid')}]` : ''}`;
      }),
  );
  console.log(`(${tag} visible buttons: ${buttons.join(' | ') || 'none'})`);
}

async function readField(name) {
  return (await p.locator(`[name="${name}"]`).first().inputValue().catch(() => '')) ?? '';
}

async function fillField(name, wanted) {
  const current = await readField(name);
  const list = current.split('\n').map((s) => s.trim()).filter(Boolean);
  const missing = wanted.filter((w) => !list.includes(w));
  if (!missing.length) return false;
  await p.locator(`[name="${name}"]`).first().fill([...list, ...wanted].join('\n'));
  return true;
}

async function clickSave() {
  await p.waitForTimeout(800); // let the dirty-state save button render
  const candidates = p.locator('button:visible, [role="button"]:visible');
  const n = await candidates.count();
  for (let i = 0; i < n; i++) {
    const b = candidates.nth(i);
    const text = ((await b.innerText().catch(() => '')) || '').trim().toLowerCase();
    if (/^save( changes)?$/.test(text)) {
      await b.click();
      await p.waitForTimeout(2500);
      console.log(`✓ clicked save button "${text}"`);
      return true;
    }
  }
  await dumpButtons('after fill');
  return false;
}

async function configureApp(app, label) {
  await p.goto(`${base}/applications/${app.id}/settings`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('[name="callbacks"]', { timeout: 30000 });
  console.log(`--- ${label}`);
  const changed = await fillField('callbacks', app.callbacks);
  const changedLogout = await fillField('allowed_logout_urls', app.logout);
  if (!changed && !changedLogout) {
    console.log('✓ nothing to change');
    return;
  }
  if (!(await clickSave())) {
    console.log('⚠ save not clicked — values may be unsaved');
    return;
  }
  // Verify persistence with a reload.
  await p.goto(`${base}/applications/${app.id}/settings`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('[name="callbacks"]', { timeout: 30000 });
  const c = await readField('callbacks');
  const l = await readField('allowed_logout_urls');
  const ok = app.callbacks.every((w) => c.includes(w)) && app.logout.every((w) => l.includes(w));
  console.log(`${ok ? '✓ verified saved' : '⚠ NOT saved'} — callbacks="${c.replace(/\n/g, ' | ')}" logout="${l.replace(/\n/g, ' | ')}"`);
}

await configureApp(WEB, 'Regular Web App (My App)');
await configureApp(NATIVE, 'Native Android App (Height Safety)');

// Inspect the custom API entry point.
await p.goto(`${base}/apis`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
const row = p.locator('tr, [role="row"], li, a', { hasText: 'Height Safety API Local 2' }).last();
if (await row.isVisible().catch(() => false)) {
  await row.click();
  await p.waitForTimeout(2500);
  console.log(`--- after API click, url: ${p.url()}`);
  const tabs = await p.$$eval('a, button, [role="tab"]', (els) =>
    els
      .filter((e) => e.offsetParent !== null)
      .map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length < 40),
  );
  console.log(`(tabs/controls: ${[...new Set(tabs)].join(' | ')})`);
} else {
  console.log('⚠ API row not visible on /apis');
}

console.log('\nStage 2d complete. Chrome left open.');
process.exit(0);