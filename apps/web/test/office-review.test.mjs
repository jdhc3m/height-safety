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

test('office write actions are server actions that require a recorded reason', async () => {
  const api = await read('../src/lib/office-api.ts');
  const actions = await read(
    '../src/app/office/reviews/[inspectionId]/actions.ts',
  );
  const review = await read(
    '../src/app/office/reviews/[inspectionId]/page.tsx',
  );

  // Writes run only through the authenticated server-side session; the opaque
  // token never reaches the browser and nothing is logged.
  assert.match(actions, /'use server'/);
  assert.match(actions, /openOfficeSession\(\)/);
  assert.doesNotMatch(actions, /accessToken|console\./);

  // Every write requires a recorded reason before it is sent.
  assert.match(actions, /REASON_REQUIRED/);
  assert.match(actions, /issueType: 'change'/);

  // The page wires review and approval through server actions.
  assert.match(review, /<form action={resolveIssueAction}/);
  assert.match(review, /<form action={requestChangesAction}/);
  assert.match(review, /<form action={approveInspectionAction}/);

  // Approval hardening: endpoints exist and blocking is surfaced.
  assert.match(api, /\/approvals/);
  assert.match(api, /\/reviews\/issues/);
  assert.match(review, /Hard blockers cannot be waived/);
  assert.match(review, /Approval blocked/);
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
