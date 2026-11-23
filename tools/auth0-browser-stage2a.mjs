#!/usr/bin/env node
// Stage 2a: attach to the already-running automation Chrome (see
// tools/auth0-browser-launch.sh), make sure the owner is logged in, then list
// the tenant's Applications and APIs. Does NOT close Chrome at the end so the
// login session survives for later stages. Run from the repo root.

import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env.auth0.local');
const CDP = 'http://localhost:9222';
const WAIT_MS = 9 * 60 * 1000;

const env = Object.fromEntries(
  existsSync(ENV_FILE)
    ? readFileSync(ENV_FILE, 'utf8').split('\n').filter(Boolean).map((l) => l.split('=', 2))
    : [],
);
const domain = env.AUTH0_DOMAIN;
if (!domain) {
  console.error('AUTH0_DOMAIN missing from .env.auth0.local — run stage 1 first.');
  process.exit(1);
}
const [tenant, region] = domain.split('.');
const base = `https://manage.auth0.com/dashboard/${region}/${tenant}`;

let browser;
try {
  browser = await chromium.connectOverCDP(CDP);
} catch (err) {
  console.error(`Cannot attach to Chrome at ${CDP} — run tools/auth0-browser-launch.sh first. (${err.message})`);
  process.exit(1);
}
browser.on('disconnected', () => {
  console.error('Chrome was closed.');
  process.exit(1);
});

const context = browser.contexts()[0] ?? (await browser.newContext());
const DASH = /\/dashboard\/([a-z-]+)\/([a-z0-9][a-z0-9-]*)/;

function activeDashboardPage() {
  for (const p of context.pages()) {
    if (!p.isClosed() && DASH.test(p.url())) return p;
  }
  return null;
}

async function waitDashboard(timeoutMs) {
  const started = Date.now();
  let lastHint = 0;
  while (Date.now() - started < timeoutMs) {
    const p = activeDashboardPage();
    if (p) return p;
    if (Date.now() - lastHint > 20000) {
      lastHint = Date.now();
      const urls = context.pages().filter((x) => !x.isClosed()).map((x) => x.url().slice(0, 90));
      console.log(`Waiting for login... (${Math.round((Date.now() - started) / 1000)}s) ${urls.join(' | ')}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

async function scrape(p, url, tableSelector) {
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  try {
    await p.waitForSelector(tableSelector, { timeout: 20000 });
  } catch {
    console.log(`(no table found at ${url} — page text follows)`);
    const text = await p.innerText('body').catch(() => '');
    console.log(text.slice(0, 2000));
    return;
  }
  const rows = await p.$$eval(`${tableSelector} tbody tr`, (trs) =>
    trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()),
  );
  console.log(`--- ${url}`);
  rows.forEach((r, i) => console.log(`${i + 1}. ${r}`));
}

let p = activeDashboardPage();
if (!p) {
  console.log('Not logged in yet — sign in in the automation Chrome window (email + MFA).');
  p = context.pages()[0] ?? (await context.newPage());
  await p.goto('https://manage.auth0.com/', { waitUntil: 'domcontentloaded' });
  p = await waitDashboard(WAIT_MS);
  if (!p) {
    console.error('Timed out waiting for login. Chrome stays open — fix the login, then re-run this script.');
    process.exit(1);
  }
}

await scrape(p, `${base}/applications`, 'table');
await scrape(p, `${base}/apis`, 'table');
console.log('\nInventory complete. Chrome left open for the next stage.');
process.exit(0);