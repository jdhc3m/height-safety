#!/usr/bin/env node
// Stage 4c7: drag the action card to the fixed connector position seen in the
// flow canvas (Start→Complete midpoint). Run from the repo root.

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
const TARGET = { x: 751, y: 356 };

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1600, height: 950 });

await p.goto(`${base}/actions/triggers/post-login`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);

const card = p.locator(`text=${ACTION_NAME}`).last();
const box = await card.boundingBox();
if (!box) {
  console.log('⚠ card not found');
  process.exit(1);
}
const sx = box.x + box.width / 2;
const sy = box.y + box.height / 2;
console.log(`dragging from (${Math.round(sx)}, ${Math.round(sy)}) to (${TARGET.x}, ${TARGET.y})`);

await p.mouse.move(sx, sy);
await p.waitForTimeout(200);
await p.mouse.down();
await p.waitForTimeout(200);
await p.mouse.move(sx - 30, sy - 10, { steps: 5 });
await p.waitForTimeout(400);
const steps = 40;
for (let i = 1; i <= steps; i++) {
  const x = sx - 30 + ((TARGET.x - (sx - 30)) * i) / steps;
  const y = sy - 10 + ((TARGET.y - (sy - 10)) * i) / steps;
  await p.mouse.move(x, y);
  if (i % 8 === 0) await p.waitForTimeout(150);
}
await p.waitForTimeout(800);
await p.mouse.up();
await p.waitForTimeout(2500);

await p.screenshot({ path: `${SHOT}/auth0-stage4c7-after.png`, fullPage: false });
const state = await p.evaluate((name) => {
  const nodes = [...document.querySelectorAll('*')].filter((e) => (e.textContent || '').trim() === name);
  const rects = nodes
    .map((n) => n.getBoundingClientRect())
    .filter((r) => r.width > 0)
    .map((r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }));
  const apply = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Apply');
  return { rects, applyEnabled: apply ? !apply.disabled : null };
}, ACTION_NAME);
console.log('STATE:', JSON.stringify(state));

const applyBtn = p.locator('button:has-text("Apply")').first();
if (await applyBtn.isVisible().catch(() => false) && !(await applyBtn.isDisabled().catch(() => false))) {
  await applyBtn.click();
  await p.waitForTimeout(3000);
  console.log('✓ Apply clicked');
} else {
  console.log('Apply not clickable (already applied or action not added)');
}
await p.screenshot({ path: `${SHOT}/auth0-stage4c7-final.png`, fullPage: false });

process.exit(0);