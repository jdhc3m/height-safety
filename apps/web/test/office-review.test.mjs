import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}

test('office API reads the company scope from a configured identity claim', async () => {
  const claim = await read('../src/lib/company-claim.ts');
  const api = await read('../src/lib/office-api.ts');

  assert.match(claim, /DEFAULT_COMPANY_ID_CLAIM/);
  assert.match(claim, /claims\/company_id/);
  assert.match(claim, /base64url/);
  assert.match(api, /AUTH0_COMPANY_ID_CLAIM/);
  assert.match(api, /readCompanyIdFromTokens/);
  assert.match(api, /'x-company-id': companyId/);
  assert.match(api, /providerAccessToken/);
  assert.match(api, /authorization: `Bearer \$\{session\.accessToken\}`/);
  assert.match(api, /cache: 'no-store'/);
  assert.doesNotMatch(api, /console\.(log|info|debug|warn|error)/);
});

test('office reads stay read-only and never call an approval or issue write', async () => {
  const api = await read('../src/lib/office-api.ts');
  const review = await read(
    '../src/app/office/reviews/[inspectionId]/page.tsx',
  );

  assert.doesNotMatch(api, /\/approvals/);
  assert.doesNotMatch(api, /method: 'POST'[\s\S]{0,120}\/reviews/);
  assert.doesNotMatch(review, /<form\b|onClick\b|useState\b|\/approvals/);
  assert.match(review, /Read-only/);
});

test('office review keeps neutral language and bounded failure states', async () => {
  const review = await read(
    '../src/app/office/reviews/[inspectionId]/page.tsx',
  );
  const office = await read('../src/app/office/page.tsx');

  assert.match(review, /never rewrite the\s+inspector/);
  assert.match(review, /does not certify an anchor or determine\s+compliance/);
  assert.match(review, /failure\.code/);
  assert.match(office, /isOfficeApiConfigured\(\)/);
  assert.match(
    office,
    /Nothing is displayed rather than showing unverified state/,
  );
});
