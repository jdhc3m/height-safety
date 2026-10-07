#!/usr/bin/env node
// Stage 2e: open the web app settings edit mode, dump the exact controls and
// take screenshots so the next step can target the real save control.
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
const WEB_ID = env.WEB_CLIENT_ID_TO_INSPECT ?? 'CdMj3rna47rWIKUoLWPCLpJnAMidOt4b';

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());

await p.setViewportSize({ width: 1440, height: 900 });
await p.goto(`${base}/applications/${WEB_ID}/settings`, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('[name="callbacks"]', { timeout: 30000 });
await p.screenshot({ path: `${SHOT}/auth0-web-settings-initial.png`, fullPage: false });

const edit = p.locator('button:has-text("Edit Configuration")').first();
if (await edit.isVisible().catch(() => false)) {
  await edit.click();
  await p.waitForTimeout(1500);
  console.log('✓ clicked Edit Configuration');
}
await p.screenshot({ path: `${SHOT}/auth0-web-settings-edit.png`, fullPage: true });

const fields = await p.$$eval('input, textarea', (els) =>
  els
    .filter((e) => e.offsetParent !== null)
    .map((e) => `${e.tagName.toLowerCase()}[name="${e.name || ''}"] value="${(e.value || '').replace(/\n/g, ' | ').slice(0, 120)}"`),
);
console.log('FIELDS:\n' + fields.join('\n'));

const controls = await p.$$eval('button, [role="button"], a', (els) =>
  els
    .filter((e) => e.offsetParent !== null)
    .map((e) => {
      const t = e.getAttribute('data-testid') || '';
      const txt = (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
      return t ? `${e.tagName.toLowerCase()} [${t}] "${txt.slice(0, 40)}"` : null;
    })
    .filter(Boolean),
);
console.log('TESTIDS:\n' + [...new Set(controls)].join('\n'));

process.exit(0);