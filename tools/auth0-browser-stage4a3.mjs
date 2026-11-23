#!/usr/bin/env node
// Stage 4a-v3: click the exact "Create Custom Action" menu item, observe the
// resulting page, and fill whatever name/trigger UI appears.
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

const ACTION_NAME = 'Height Safety Post Login Claims';
const OWNER_EMAIL = 'jdhc3m@gmail.com';
const COMPANY_ID = 'aaa';

const ACTION_CODE = `/**
 * Height Safety - Post-Login claims (owner wizard stage 4).
 *
 * MFA claim: set to true ONLY when a real MFA method ran. The free plan has
 * no MFA factors, so this stays false here by design (owner decision C).
 * Upgrade the plan and re-verify before any real pilot.
 *
 * Company claim (D-049): sets the office tenant scope for mapped identities.
 * A claim is never authorisation on its own; the API verifies membership.
 */
exports.onExecutePostLogin = async (event, api) => {
  const MFA_CLAIM = 'https://height-safety.example/claims/mfa_satisfied';
  const COMPANY_CLAIM = 'https://height-safety.example/claims/company_id';

  const methods = (event.authentication && event.authentication.methods) || [];
  const mfaSatisfied = methods.some((m) => m && m.name === 'mfa');
  if (mfaSatisfied) {
    api.accessToken.setCustomClaim(MFA_CLAIM, true);
    api.idToken.setCustomClaim(MFA_CLAIM, true);
  }

  const email = ((event.user && event.user.email) || '').toLowerCase();
  const COMPANY_BY_EMAIL = {
    '${OWNER_EMAIL}': '${COMPANY_ID}',
  };
  const companyId = COMPANY_BY_EMAIL[email];
  if (companyId) {
    api.accessToken.setCustomClaim(COMPANY_CLAIM, companyId);
    api.idToken.setCustomClaim(COMPANY_CLAIM, companyId);
  }
};`;

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1440, height: 900 });

await p.goto(`${base}/actions/library`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

const existing = p.locator('tr', { hasText: ACTION_NAME }).first();
if (await existing.isVisible().catch(() => false)) {
  console.log('Action exists — opening');
  await existing.dblclick().catch(async () => await existing.click());
  await p.waitForTimeout(3500);
} else {
  await p.locator('button:has-text("Create Action")').first().click();
  await p.waitForTimeout(900);
  const clicked = await p.evaluate(() => {
    const els = [...document.querySelectorAll('li, a, div, span, button')].filter(
      (e) => e.childElementCount === 0 && (e.textContent || '').trim() === 'Create Custom Action' && e.offsetParent !== null,
    );
    if (!els.length) return 'menu item not found';
    els[0].click();
    return 'clicked exact menu item';
  });
  console.log(clicked);
  await p.waitForTimeout(3500);
  console.log(`url now: ${p.url()}`);
}

await p.screenshot({ path: `${SHOT}/auth0-stage4a3-after-menu.png`, fullPage: true });

// Dump all visible inputs/selects with labels for diagnosis.
const controls = await p.$$eval('input, select, [role="combobox"]', (els) =>
  els
    .filter((e) => e.offsetParent !== null)
    .map((e) => ({
      tag: e.tagName.toLowerCase(),
      type: e.type || '',
      name: e.name || e.id || '',
      label: (e.labels?.[0]?.innerText ?? e.closest('label')?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 50),
      value: (e.value || '').slice(0, 40),
    })),
);
console.log('VISIBLE CONTROLS:', JSON.stringify(controls, null, 1));

// If a plain input exists, fill the name.
const nameField = p.locator('input:visible').first();
if (await nameField.isVisible().catch(() => false)) {
  await nameField.fill(ACTION_NAME).catch(() => {});
  console.log('✓ filled name field');
}

// Handle native selects for trigger.
const selects = p.locator('select:visible');
const nSel = await selects.count();
for (let i = 0; i < nSel; i++) {
  const s = selects.nth(i);
  const opts = await s.locator('option').allTextContents().catch(() => []);
  console.log(`select ${i}: ${JSON.stringify(opts)}`);
  const post = opts.find((o) => /post.?login/i.test(o));
  if (post) {
    await s.selectOption({ label: post }).catch(async () => await s.selectOption({ index: opts.indexOf(post) }));
    console.log('✓ trigger = Post Login');
  }
}

// Look for a MUI combobox if there is no select.
const combo = p.locator('[role="combobox"]:visible').first();
if ((await combo.isVisible().catch(() => false)) && nSel === 0) {
  await combo.click();
  await p.waitForTimeout(700);
  const opt = p.locator('[role="option"]', { hasText: /post.?login/i }).first();
  if (await opt.isVisible().catch(() => false)) {
    await opt.click();
    console.log('✓ combobox trigger = Post Login');
  }
  await p.keyboard.press('Escape');
}

await p.screenshot({ path: `${SHOT}/auth0-stage4a3-form.png`, fullPage: true });

// Continue/next button.
const btns = p.locator('button:visible');
const nB = await btns.count();
for (let i = 0; i < nB; i++) {
  const t = ((await btns.nth(i).innerText().catch(() => '')) || '').trim();
  if (/^(create|next|add action)$/i.test(t)) {
    await btns.nth(i).click();
    console.log(`✓ clicked "${t}"`);
    break;
  }
}
await p.waitForTimeout(4000);
console.log(`url now: ${p.url()}`);
const editor = p.locator('.monaco-editor').first();
await editor.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
if (await editor.isVisible().catch(() => false)) {
  await editor.click();
  await p.keyboard.press('ControlOrMeta+A');
  await p.waitForTimeout(300);
  await p.keyboard.insertText(ACTION_CODE);
  await p.waitForTimeout(1200);
  console.log('✓ code pasted');
  await p.screenshot({ path: `${SHOT}/auth0-stage4a3-editor.png`, fullPage: true });
} else {
  console.log('⚠ editor not visible');
  await p.screenshot({ path: `${SHOT}/auth0-stage4a3-noeditor.png`, fullPage: true });
}

process.exit(0);