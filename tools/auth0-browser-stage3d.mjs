#!/usr/bin/env node
// Stage 3d: dump raw DOM around the One-time Password factor and the Always
// policy card to see the real attributes. Read-only. Run from the repo root.

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

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());

await p.goto(`${base}/security/mfa`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

function clean(html) {
  return html
    .replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>')
    .replace(/class="[^"]*"/g, 'class="…"')
    .replace(/\s+/g, ' ')
    .slice(0, 1500);
}

// All switch-ish elements with their nearby text.
const switches = await p.$$eval('[role="switch"], input[type="checkbox"], [class*="MuiSwitch"] input', (els) =>
  els.map((e) => ({
    role: e.getAttribute('role'),
    checked: e.getAttribute('aria-checked') ?? String(e.checked),
    disabled: e.hasAttribute('disabled') || e.getAttribute('aria-disabled') === 'true',
    visible: e.offsetParent !== null,
    text: (e.closest('div,li,label')?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
  })),
);
console.log('SWITCH-LIKE ELEMENTS:');
for (const s of switches) console.log(JSON.stringify(s));

// The Always card root: find element containing "Users are always required".
const alwaysHtml = await p.evaluate(() => {
  const els = [...document.querySelectorAll('div')].filter((e) =>
    (e.innerText || '').includes('Users are always required'),
  );
  if (!els.length) return '(not found)';
  let el = els[els.length - 1];
  while (el.parentElement && (el.parentElement.innerText || '').includes('Users are always required') && el.parentElement.innerText.length < el.innerText.length + 50) {
    el = el.parentElement;
    break;
  }
  return el.outerHTML;
});
console.log('\nALWAYS CARD HTML:\n' + clean(alwaysHtml));

// One-time Password row HTML.
const otpHtml = await p.evaluate(() => {
  const els = [...document.querySelectorAll('div,li')].filter((e) =>
    (e.innerText || '').startsWith('One-time Password'),
  );
  if (!els.length) return '(not found)';
  return els[0].outerHTML;
});
console.log('\nOTP ROW HTML:\n' + clean(otpHtml));

process.exit(0);