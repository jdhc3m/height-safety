#!/usr/bin/env node
// Stage 4b: re-paste the Action code via the clipboard (Monaco-safe), verify
// the editor content, then deploy. Run from the repo root.

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
await context.grantPermissions(['clipboard-read', 'clipboard-write']);
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1440, height: 900 });

const editor = p.locator('.monaco-editor').first();
if (!(await editor.isVisible().catch(() => false))) {
  await p.goto(`https://manage.auth0.com/dashboard/${region}/${domain.split('.')[1]}/${tenant}/actions/library`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const row = p.locator('tr', { hasText: 'Height Safety Post Login Claims' }).first();
  await row.dblclick().catch(async () => await row.click());
  await p.waitForTimeout(3500);
}
if (!(await editor.isVisible().catch(() => false))) {
  console.log('⚠ editor not reachable');
  process.exit(1);
}

// Clear the editor completely, then paste via clipboard.
await editor.click();
await p.keyboard.press('ControlOrMeta+A');
await p.waitForTimeout(300);
await p.keyboard.press('Backspace');
await p.waitForTimeout(500);
await p.evaluate((code) => navigator.clipboard.writeText(code), ACTION_CODE);
await p.keyboard.press('ControlOrMeta+V');
await p.waitForTimeout(1500);

// Read back the rendered editor text for a sanity check.
const rendered = await p.evaluate(() => {
  const lines = document.querySelector('.monaco-editor .view-lines');
  return lines ? lines.innerText : '';
});
const flat = rendered.replace(/\s+/g, ' ');
const checks = {
  hasExport: flat.includes('exports.onExecutePostLogin'),
  hasMfaClaim: flat.includes('claims/mfa_satisfied'),
  hasCompanyClaim: flat.includes('claims/company_id'),
  hasEmailMap: flat.includes('jdhc3m@gmail.com'),
  hasCompanyId: flat.includes("'aaa'"),
  hasMethods: flat.includes('event.authentication.methods'),
};
console.log('EDITOR SANITY:', JSON.stringify(checks));
const missing = Object.entries(checks).filter(([, ok]) => !ok);
if (missing.length) {
  console.log(`⚠ ${missing.length} marker(s) missing — screenshot saved, not deploying`);
  await p.screenshot({ path: `${SHOT}/auth0-stage4b-bad-paste.png`, fullPage: true });
  process.exit(1);
}
console.log('✓ editor content verified');

// Deploy.
await p.locator('button:has-text("Deploy")').first().click();
await p.waitForTimeout(3000);
const body = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
console.log(`deploy feedback: ${/deployed/i.test(body) ? 'page mentions "deployed"' : 'no explicit confirmation text'}`);
await p.screenshot({ path: `${SHOT}/auth0-stage4b-deployed.png`, fullPage: true });

process.exit(0);