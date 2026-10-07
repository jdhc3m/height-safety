#!/usr/bin/env node
// Stage 4a: create the Post-Login Action in the Auth0 dashboard and paste the
// claim code into the editor. Does NOT deploy yet (inspected afterwards).
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

const ACTION_NAME = 'Height Safety Post Login Claims';

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1440, height: 900 });

await p.goto(`${base}/actions/library`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

// If the action already exists, open it instead of creating a duplicate.
const existing = p.locator('tr, [role="row"], a', { hasText: ACTION_NAME }).first();
if (await existing.isVisible().catch(() => false)) {
  await existing.click();
  await p.waitForTimeout(2500);
  console.log(`Action "${ACTION_NAME}" already exists — opened it`);
} else {
  const create = p.locator('button:has-text("Create Action"), a:has-text("Create Action"), button:has-text("Build Custom")').first();
  if (!(await create.isVisible().catch(() => false))) {
    console.log('⚠ Create Action button not found');
    await p.screenshot({ path: `${SHOT}/auth0-stage4a-library.png`, fullPage: true });
    process.exit(1);
  }
  await create.click();
  await p.waitForTimeout(1500);
  // Dialog: name + trigger + runtime.
  await p.locator('[role="dialog"] input, form input').first().fill(ACTION_NAME).catch(async () => {
    await p.keyboard.type(ACTION_NAME);
  });
  // Select trigger = Post Login if a select is present.
  const trigger = p.locator('[role="dialog"] select, [data-testid="action-trigger-selector"]').first();
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.selectOption({ label: 'Post Login' }).catch(async () => {
      await trigger.selectOption({ index: 1 });
    });
  }
  await p.screenshot({ path: `${SHOT}/auth0-stage4a-dialog.png`, fullPage: true });
  const confirmCreate = p.locator('[role="dialog"] button:has-text("Create"), [role="dialog"] button:has-text("Next"), button:has-text("Create")').last();
  await confirmCreate.click().catch(() => {});
  await p.waitForTimeout(4000);
  console.log('✓ create submitted');
}

// Editor should be open now — paste the code into Monaco.
await p.waitForTimeout(1500);
const editor = p.locator('.monaco-editor').first();
if (!(await editor.isVisible().catch(() => false))) {
  console.log('⚠ Monaco editor not visible');
  await p.screenshot({ path: `${SHOT}/auth0-stage4a-editor-missing.png`, fullPage: true });
  process.exit(1);
}
await editor.click();
await p.keyboard.press('ControlOrMeta+A');
await p.waitForTimeout(300);
await p.keyboard.insertText(ACTION_CODE);
await p.waitForTimeout(1000);
console.log('✓ code pasted into editor');

// Open the trigger drawer if present so we can verify Post Login, then screenshot.
await p.screenshot({ path: `${SHOT}/auth0-stage4a-editor.png`, fullPage: true });
const bodyText = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
console.log(`page mentions Post-Login: ${/post.?login/i.test(bodyText)}`);

process.exit(0);