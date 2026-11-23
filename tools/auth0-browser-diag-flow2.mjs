#!/usr/bin/env node
// Complete the auth-code flow: Accept consent, capture the code, exchange it,
// then exercise /auth/sessions and /auth/me raw. Run from the repo root.

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
const clientId = env.AUTH0_CLIENT_ID;
const clientSecret = env.AUTH0_CLIENT_SECRET;
const audience = env.AUTH0_API_AUDIENCE;
const base = `https://${domain}`;
const redirectUri = 'http://localhost:3000/auth/callback';

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0] ?? (await browser.newContext());
const p = context.pages().find((x) => !x.isClosed()) ?? (await context.newPage());

let code = null;
p.on('request', (req) => {
  if (req.url().startsWith(redirectUri) && !code) {
    code = new URL(req.url()).searchParams.get('code');
  }
});

await p.goto(
  `${base}/authorize?response_type=code&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent('openid profile email offline_access')}` +
    `&audience=${encodeURIComponent(audience)}&state=diag3`,
  { waitUntil: 'domcontentloaded' },
);

const started = Date.now();
while (!code && Date.now() - started < 90000) {
  if (p.url().includes('/u/consent')) {
    const accept = p.locator('button:has-text("Accept")').first();
    if (await accept.isVisible().catch(() => false)) {
      await accept.click().catch(() => {});
      console.log('✓ clicked Accept');
    }
  }
  await p.waitForTimeout(800);
}
if (!code) {
  console.log('⚠ no code; url:', p.url().slice(0, 120));
  process.exit(1);
}
console.log('✓ code captured');

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

const sessionRes = await fetch('http://127.0.0.1:3001/api/v1/auth/sessions', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-company-id': 'aaa' },
  body: JSON.stringify({ providerAccessToken: tokens.access_token }),
});
const sessionBody = await sessionRes.text();
console.log(`\n=== POST /auth/sessions → ${sessionRes.status}`);
console.log(
  sessionRes.ok
    ? sessionBody.replace(/"accessToken":"[^"]+"/, '"accessToken":"<redacted>"')
    : sessionBody,
);

if (sessionRes.ok) {
  const session = JSON.parse(sessionBody);
  const meRes = await fetch('http://127.0.0.1:3001/api/v1/auth/me', {
    headers: { authorization: `Bearer ${session.accessToken}`, 'x-company-id': 'aaa' },
  });
  console.log(`\n=== GET /auth/me → ${meRes.status}`);
  console.log(await meRes.text());

  const jobsRes = await fetch('http://127.0.0.1:3001/api/v1/jobs', {
    headers: { authorization: `Bearer ${session.accessToken}`, 'x-company-id': 'aaa' },
  });
  console.log(`\n=== GET /jobs → ${jobsRes.status}`);
  console.log((await jobsRes.text()).slice(0, 500));
}

await p.goto('about:blank').catch(() => {});
process.exit(0);