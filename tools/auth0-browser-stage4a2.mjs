#!/usr/bin/env node
// Stage 4a-v2: create the Post-Login Action via the Library dropdown, fill the
// dialog (name, Post Login trigger), and paste the code into the editor.
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

const OWNER_EMAIL = 'jdhc3m@gmail.com';
const COMPANY_ID = 'aaa';
const ACTION_NAME = 'Height Safety Post Login Claims';

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

const existing = p.locator('tr, [role="row"]', { hasText: ACTION_NAME }).first();
if (await existing.isVisible().catch(() => false)) {
  console.log('Action already exists in library — opening editor');
  await existing.dblclick().catch(async () => await existing.click());
  await p.waitForTimeout(3000);
} else {
  await p.locator('button:has-text("Create Action")').first().click();
  await p.waitForTimeout(800);
  await p.locator('li, [role="menuitem"], a, div', { hasText: 'Create Custom Action' }).first().click();
  await p.waitForTimeout(2000);
  console.log('✓ Create Custom Action clicked');

  await p.screenshot({ path: `${SHOT}/auth0-stage4a2-dialog.png`, fullPage: true });

  // Fill the dialog: name first.
  const nameInput = p.locator('[role="dialog"] input:visible, form input:visible').first();
  await nameInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await nameInput.fill(ACTION_NAME);

  // Trigger select — a native <select> most likely.
  const selects = p.locator('[role="dialog"] select, form select');
  const nSel = await selects.count();
  console.log(`dialog selects: ${nSel}`);
  for (let i = 0; i < nSel; i++) {
    const s = selects.nth(i);
    const opts = await s.locator('option').allTextContents().catch(() => []);
    console.log(`select ${i}: ${JSON.stringify(opts)}`);
    if (opts.some((o) => /post.?login/i.test(o))) {
      const label = opts.find((o) => /post.?login/i.test(o));
      await s.selectOption({ label }).catch(async () => {
        await s.selectOption({ index: opts.findIndex((o) => /post.?login/i.test(o)) });
      });
      console.log('✓ trigger set to Post Login');
    }
  }

  await p.screenshot({ path: `${SHOT}/auth0-stage4a2-dialog-filled.png`, fullPage: true });
  const next = p.locator('[role="dialog"] button:has-text("Create"), [role="dialog"] button:has-text("Next"), [role="dialog"] button:has-text("Save")').last();
  await next.click().catch(() => {});
  await p.waitForTimeout(5000);
}

// Editor may open on a new page/URL.
await p.waitForTimeout(2000);
const editor = p.locator('.monaco-editor').first();
await editor.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
if (!(await editor.isVisible().catch(() => false))) {
  console.log(`⚠ Monaco still not visible; url=${p.url()}`);
  await p.screenshot({ path: `${SHOT}/auth0-stage4a2-noeditor.png`, fullPage: true });
  process.exit(1);
}
await editor.click();
await p.waitForTimeout(500);
await p.keyboard.press('ControlOrMeta+A');
await p.waitForTimeout(300);
await p.keyboard.insertText(ACTION_CODE);
await p.waitForTimeout(1200);
console.log('✓ code pasted');
await p.screenshot({ path: `${SHOT}/auth0-stage4a2-editor.png`, fullPage: true });

process.exit(0);