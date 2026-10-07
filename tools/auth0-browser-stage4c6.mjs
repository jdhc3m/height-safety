#!/usr/bin/env node
// Stage 4c6: drag the action card onto the Start→Complete connector precisely.
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

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());
await p.setViewportSize({ width: 1600, height: 950 });

await p.goto(`${base}/actions/triggers/post-login`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);

// Find the connector midpoint from the node circles (SVG/div icons) — use the
// "User Logged In" and "Token Issued" captions.
const positions = await p.evaluate(() => {
  const find = (label) => {
    const els = [...document.querySelectorAll('*')].filter(
      (e) => e.childElementCount === 0 && (e.textContent || '').trim() === label && e.offsetParent !== null,
    );
    if (!els.length) return null;
    const r = els[0].getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
  const start = find('User Logged In');
  const complete = find('Token Issued');
  return { start, complete };
});
console.log('positions:', JSON.stringify(positions));
if (!positions.start || !positions.complete) {
  console.log('⚠ flow nodes not located');
  process.exit(1);
}
const target = {
  x: (positions.start.x + positions.complete.x) / 2,
  y: (positions.start.y + positions.complete.y) / 2,
};

const card = p.locator(`text=${ACTION_NAME}`).last();
const box = await card.boundingBox();
console.log(`card: ${JSON.stringify(box)} target: ${JSON.stringify(target)}`);

// Slow, deliberate drag with an initial lift so dragstart registers.
const sx = box.x + box.width / 2;
const sy = box.y + box.height / 2;
await p.mouse.move(sx, sy);
await p.waitForTimeout(200);
await p.mouse.down();
await p.waitForTimeout(150);
await p.mouse.move(sx - 40, sy - 15, { steps: 6 });
await p.waitForTimeout(300);
const steps = 30;
for (let i = 1; i <= steps; i++) {
  await p.mouse.move(
    sx - 40 + ((target.x - (sx - 40)) * i) / steps,
    sy - 15 + ((target.y - (sy - 15)) * i) / steps,
  );
  if (i % 6 === 0) await p.waitForTimeout(120);
}
await p.waitForTimeout(600);
await p.mouse.move(target.x, target.y - 3, { steps: 3 });
await p.mouse.up();
await p.waitForTimeout(2000);

await p.screenshot({ path: `${SHOT}/auth0-stage4c6-after.png`, fullPage: false });
const state = await p.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter((e) => e.offsetParent !== null);
  const apply = btns.find((b) => (b.textContent || '').trim() === 'Apply');
  const nodes = [...document.querySelectorAll('*')].filter(
    (e) => e.childElementCount === 0 && (e.textContent || '').trim() === 'Height Safety Post Login Claims',
  );
  return {
    applyEnabled: apply ? !apply.disabled : null,
    actionNodeCount: nodes.length,
    nodeRects: nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y) };
    }),
  };
});
console.log('STATE:', JSON.stringify(state));

// If the action landed (node in canvas area, x < 1200), click Apply.
if (state.applyEnabled === false && state.actionNodeCount > 1) {
  console.log('action appears in canvas but Apply disabled — checking apply state again');
}
const applyBtn = p.locator('button:has-text("Apply")').first();
if (await applyBtn.isVisible().catch(() => false)) {
  if (!(await applyBtn.isDisabled().catch(() => false))) {
    await applyBtn.click();
    await p.waitForTimeout(3000);
    console.log('✓ Apply clicked');
  } else {
    console.log('Apply still disabled');
  }
}
await p.screenshot({ path: `${SHOT}/auth0-stage4c6-final.png`, fullPage: false });

process.exit(0);