import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import net from 'node:net';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

const OFFICE_ROUTES = [
  '/office',
  '/office/reviews/synthetic-inspection',
  '/office/status-pill',
];

const EXPECTED_PILL_LABELS = [
  'Serviceable',
  'Defective',
  'Not inspected',
  'Further assessment',
  'Synchronised',
  'Conflict',
  'Sending',
  'Not synced',
  'Offline',
  'Draft',
  'Released',
  'Assigned',
  'In progress',
  'Submitted',
  'Under review',
  'Changes requested',
  'Approved for report',
  'Report generated',
  'Queued',
  'Processing',
  'Completed',
  'Failed',
  'Superseded',
  'Open',
  'Resolved',
];

let running;

const PAGE_TIMEOUT_MS = 60_000;

function newPage(browser) {
  const page = browser.newPage();
  return page.then((resolved) => {
    resolved.setDefaultTimeout(PAGE_TIMEOUT_MS);
    return resolved;
  });
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function startDevServer() {
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const output = [];
  const server = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'dev',
      '-H',
      '127.0.0.1',
      '-p',
      String(port),
    ],
    {
      cwd: webRoot,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  server.stdout.on('data', (chunk) => output.push(String(chunk)));
  server.stderr.on('data', (chunk) => output.push(String(chunk)));

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `next dev exited with ${server.exitCode}:\n${output.join('')}`,
      );
    }
    try {
      const response = await fetch(`${baseUrl}/office`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        return { server, baseUrl, output };
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  server.kill('SIGTERM');
  throw new Error(`next dev never became ready:\n${output.join('')}`);
}

function installPlaywrightBrowser() {
  const result = spawnSync(
    process.execPath,
    [
      path.join(repoRoot, 'node_modules', 'playwright', 'cli.js'),
      'install',
      'chromium',
    ],
    { cwd: repoRoot, stdio: 'inherit', timeout: 600_000 },
  );
  if (result.status !== 0) {
    throw new Error(
      `playwright install chromium failed with ${result.status}; the shell check needs the chromium headless shell`,
    );
  }
}

async function ensureRunning() {
  if (running) {
    return running;
  }
  const { server, baseUrl } = await startDevServer();
  running = { server, baseUrl, browser: undefined };
  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    console.warn('chromium launch failed; attempting browser install', error);
    installPlaywrightBrowser();
    browser = await chromium.launch();
  }
  running.browser = browser;
  return running;
}

test('shell navigation renders on every office route', async () => {
  const { browser, baseUrl } = await ensureRunning();
  const page = await newPage(browser);

  for (const route of OFFICE_ROUTES) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.shell-sidebar');

    const navLink = page.locator('.shell-nav a', { hasText: 'Jobs' });
    assert.equal(await navLink.getAttribute('href'), '/office');
    assert.equal(await navLink.count(), 1);

    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    assert.equal(await breadcrumb.count(), 1);
    assert.ok(await breadcrumb.textContent());

    const legalLink = page.locator('footer.shell-footer a[href="/legal"]');
    assert.equal(await legalLink.textContent(), 'Scope and legal');
  }

  await page.goto(`${baseUrl}/office`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.shell-sidebar');
  const jobsLink = page.locator('.shell-nav a', { hasText: 'Jobs' });
  assert.equal(await jobsLink.getAttribute('aria-current'), 'page');

  await page.goto(`${baseUrl}/office/reviews/synthetic-inspection`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('.shell-breadcrumb');
  const crumbText = await page
    .locator('nav[aria-label="Breadcrumb"]')
    .textContent();
  assert.ok(crumbText.includes('Reviews'));
  assert.ok(crumbText.includes('synthetic-inspection'));

  await page.close();
});

test('StatusPill variants render in the office shell', async () => {
  const { browser, baseUrl } = await ensureRunning();
  const page = await newPage(browser);
  await page.goto(`${baseUrl}/office/status-pill`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('.status-pill');

  const pills = await page.$$eval('.status-pill', (elements) =>
    elements.map((element) => ({
      label: element.textContent.trim(),
      classes: [...element.classList],
    })),
  );
  const labels = pills.map((pill) => pill.label);

  for (const expected of EXPECTED_PILL_LABELS) {
    assert.ok(
      labels.includes(expected),
      `expected a rendered "${expected}" status pill; rendered: ${labels.join(', ')}`,
    );
  }

  const tones = new Set(
    pills.flatMap((pill) =>
      pill.classes
        .filter((className) => className.startsWith('status-pill--'))
        .map((className) => className.slice('status-pill--'.length)),
    ),
  );
  for (const tone of [
    'green',
    'red',
    'yellow',
    'slate',
    'purple',
    'blue',
    'orange',
    'neutral',
  ]) {
    assert.ok(
      tones.has(tone),
      `expected the reference page to exercise the "${tone}" tone`,
    );
  }

  assert.ok(
    labels.includes('Example unknown state'),
    'unknown values must fall back to a humanised neutral pill',
  );

  await page.close();
});

after(async () => {
  if (running?.browser) {
    await running.browser.close();
  }
  if (running?.server) {
    running.server.stdout.destroy();
    running.server.stderr.destroy();
    running.server.kill('SIGTERM');
  }
});
