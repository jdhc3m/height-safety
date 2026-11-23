#!/usr/bin/env node
// Stage 6b: reload the office web after the API base URL fix and report the
// jobs table state. Run from the repo root.

import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHOT = '/var/folders/0l/b700nwys2tj56ssxv3pjf16w0000gn/T/opencode';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed() && x.url().includes('localhost:3000')) ?? (await context.newPage());
await p.setViewportSize({ width: 1440, height: 900 });

await p.goto('http://localhost:3000/office', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
const text = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
console.log(`URL: ${p.url()}`);
console.log(`PAGE: ${text.slice(0, 1200)}`);
await p.screenshot({ path: `${SHOT}/auth0-office-jobs.png`, fullPage: true });
console.log('\nscreenshot saved (auth0-office-jobs.png)');
process.exit(0);