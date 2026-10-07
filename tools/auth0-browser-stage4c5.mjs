#!/usr/bin/env node
// Stage 4c5: attach the action to the Post Login trigger (drag), then Apply.
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

// Dismiss the welcome modal if present.
const done = p.locator('button:has-text("Done"), button:has-text("Skip"), [aria-label="Close"]').first();
if (await done.isVisible().catch(() => false)) {
  await done.click();
  await p.waitForTimeout(1000);
  console.log('✓ modal dismissed');
}
await p.screenshot({ path: `${SHOT}/auth0-stage4c5-canvas.png`, fullPage: false });

// Locate the drop zone: the flow canvas between Start and Complete.
const startNode = p.locator('text=Start').first();
const completeNode = p.locator('text=Complete').first();
const canvasInfo = await p.evaluate(() => {
  const texts = [...document.querySelectorAll('*')].filter(
    (e) => e.childElementCount === 0 && /^(start|complete)$/i.test((e.textContent || '').trim()),
  );
  return texts.map((e) => {
    const r = e.getBoundingClientRect();
    return { text: e.textContent.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
});
console.log('FLOW NODES:', JSON.stringify(canvasInfo));

const card = p.locator(`text=${ACTION_NAME}`).last();
const cardBox = await card.boundingBox().catch(() => null);
console.log(`card box: ${JSON.stringify(cardBox)}`);

const start = canvasInfo.find((n) => /start/i.test(n.text));
const complete = canvasInfo.find((n) => /complete/i.test(n.text));
const targetY = start && complete ? (start.y + complete.y) / 2 : 420;
const targetX = start ? start.x : 760;

if (cardBox) {
  // Manual mouse-driven drag for HTML5 DnD reliability.
  await p.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await p.mouse.down();
  await p.mouse.move(targetX, targetY, { steps: 12 });
  await p.waitForTimeout(400);
  await p.mouse.move(targetX + 6, targetY + 6, { steps: 4 });
  await p.mouse.up();
  await p.waitForTimeout(1500);
  console.log('✓ drag performed');
} else {
  console.log('⚠ action card not found for drag');
}
await p.screenshot({ path: `${SHOT}/auth0-stage4c5-after-drag.png`, fullPage: false });

// Verify the action now appears in the flow (a node with its name outside the panel).
const flowHasAction = await p.evaluate((name) => {
  const els = [...document.querySelectorAll('*')].filter(
    (e) => e.childElementCount === 0 && (e.textContent || '').trim() === name,
  );
  return els.length;
}, ACTION_NAME);
console.log(`action-name elements on page: ${flowHasAction}`);

// Apply the flow.
const apply = p.locator('button:has-text("Apply")').first();
if (await apply.isVisible().catch(() => false)) {
  const disabled = await apply.isDisabled().catch(() => true);
  if (!disabled) {
    await apply.click();
    await p.waitForTimeout(3000);
    console.log('✓ Apply clicked');
  } else {
    console.log('Apply button disabled — flow may already be applied');
  }
} else {
  console.log('⚠ Apply button not found');
}
await p.screenshot({ path: `${SHOT}/auth0-stage4c5-applied.png`, fullPage: false });

process.exit(0);