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
    '../src/app/office/(shell)/reviews/[inspectionId]/actions.ts',
  );
  const review = await read(
    '../src/app/office/(shell)/reviews/[inspectionId]/page.tsx',
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
    '../src/app/office/(shell)/reviews/[inspectionId]/page.tsx',
  );
  const office = await read('../src/app/office/(shell)/page.tsx');
  const legal = await read('../src/app/legal/page.tsx');

  assert.match(review, /never rewrite the\s+inspector/);
  assert.match(review, /Scope and legal/);
  assert.doesNotMatch(review, /certif/);
  assert.match(
    legal,
    /does not certify an\s+anchor, approve engineering work or\s+determine compliance/,
  );
  assert.match(review, /failure\.code/);
  assert.match(office, /isOfficeApiConfigured\(\)/);
  assert.match(
    office,
    /Nothing is displayed rather than showing unverified state/,
  );
});

test('approved snapshots flow to server-authenticated draft report delivery', async () => {
  const api = await read('../src/lib/office-api.ts');
  const actions = await read(
    '../src/app/office/(shell)/reviews/[inspectionId]/actions.ts',
  );
  const review = await read(
    '../src/app/office/(shell)/reviews/[inspectionId]/page.tsx',
  );
  const fileRoute = await read(
    '../src/app/office/(shell)/reports/[generationId]/file/route.ts',
  );
  const legal = await read('../src/app/legal/page.tsx');

  assert.match(api, /getApprovedSnapshot/);
  assert.match(api, /requestDraftReportGeneration/);
  assert.match(api, /getDraftReportGeneration/);
  assert.match(
    api,
    /reports\/generations\/\$\{encodeURIComponent\(generationId\)\}\/file/,
  );

  assert.match(actions, /requestDraftReportAction/);
  assert.match(actions, /snapshot\.sourceInspectionId !== inspectionId/);
  assert.match(actions, /requestDraftReportGeneration\(session, snapshotId\)/);
  assert.doesNotMatch(actions, /console\.|accessToken/);

  assert.match(review, /<form action={requestDraftReportAction}/);
  assert.match(review, /getDraftReportGeneration/);
  assert.match(review, /Download draft report PDF/);
  assert.match(
    legal,
    /A draft report does not issue a\s+certificate or determine compliance/,
  );

  assert.match(fileRoute, /openOfficeSession\(\)/);
  assert.match(fileRoute, /getDraftReportFile/);
  assert.match(fileRoute, /application\/pdf/);
  assert.match(fileRoute, /private, no-store/);
  assert.doesNotMatch(fileRoute, /console\.|accessToken/);
});
