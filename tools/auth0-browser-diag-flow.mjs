#!/usr/bin/env node
// Capture an authorization code for the web app client via the automation
// Chrome's persisted Auth0 session, then exchange it and print RAW session
// API responses (tokens redacted). Run from the repo root.

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
const clientId = env.AUTH0_CLIENT_ID;
const clientSecret = env.AUTH0_CLIENT_SECRET;
const audience = env.AUTH0_API_AUDIENCE;
const [tenant, region] = domain.split('.');
const base = `https://${domain}`;

const redirectUri = 'http://localhost:3000/auth/callback';
const state = 'diag-' + Date.now();
const authorizeUrl =
  `${base}/authorize?response_type=code` +
  `&client_id=${encodeURIComponent(clientId)}` +
  `&redirect_uri=${encodeURIComponent(redirectUri)}` +
  `&scope=${encodeURIComponent('openid profile email offline_access')}` +
  `&audience=${encodeURIComponent(audience)}` +
  `&state=${state}`;

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());

let code = null;
p.on('request', (req) => {
  const url = req.url();
  if (url.startsWith(redirectUri) && !code) {
    try {
      code = new URL(url).searchParams.get('code');
    } catch {}
  }
});

await p.goto(authorizeUrl, { waitUntil: 'domcontentloaded' });
const started = Date.now();
let consentClicked = 0;
while (!code && Date.now() - started < 90000) {
  const url = p.url();
  if (url.includes('/u/consent') && consentClicked < 2) {
    const allow = p.locator('button:has-text("Allow"), button:has-text("Continue"), input[type="submit"], button[type="submit"]').first();
    if (await allow.isVisible().catch(() => false)) {
      await allow.click().catch(() => {});
      consentClicked += 1;
      console.log('✓ clicked consent');
    }
  }
  await p.waitForTimeout(1000);
}
if (!code) {
  console.log('⚠ no authorization code captured; url:', p.url().slice(0, 120));
  await p.screenshot({ path: `${SHOT}/auth0-diag-no-code.png`, fullPage: true });
  process.exit(1);
}
console.log('✓ captured authorization code');

// Exchange the code for tokens.
const tokenRes = await fetch(`${base}/oauth/token`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  }),
});
const tokens = await tokenRes.json();
if (!tokens.access_token) {
  console.log('⚠ token exchange failed:', JSON.stringify(tokens).slice(0, 300));
  process.exit(1);
}
console.log('✓ provider token obtained (not printed)');

// 1) Exchange for an application session.
const sessionRes = await fetch('http://127.0.0.1:3001/api/v1/auth/sessions', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-company-id': 'aaa',
  },
  body: JSON.stringify({ providerAccessTokenDto: { providerAccessToken: tokens.access_token } }),
});
const sessionBody = await sessionRes.text();
console.log(`\n=== POST /auth/sessions → ${sessionRes.status}`);
console.log(
  sessionBody.length > 400
    ? sessionBody.slice(0, 200) + ' …(truncated, token redacted by truncation)…'
    : sessionBody,
);

if (sessionRes.ok) {
  const session = JSON.parse(sessionBody);
  // 2) /auth/me with the opaque token.
  const meRes = await fetch('http://127.0.0.1:3001/api/v1/auth/me', {
    headers: {
      authorization: `Bearer ${session.accessToken}`,
      'x-company-id': 'aaa',
    },
  });
  console.log(`\n=== GET /auth/me → ${meRes.status}`);
  console.log(await meRes.text());
}

// Clean up the browser tab state (avoid leaving a broken callback page).
await p.goto('about:blank').catch(() => {});
process.exit(0);