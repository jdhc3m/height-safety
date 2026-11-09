import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { RegisterReconciliationController } from '../dist/register-reconciliation/register-reconciliation.controller.js';
import { RegisterReconciliationService } from '../dist/register-reconciliation/register-reconciliation-service.js';
import { PostgresRegisterReconciliationStore } from '../dist/register-reconciliation/postgres-register-reconciliation-store.js';
import { InMemoryRegisterReconciliationStore } from '../dist/register-reconciliation/register-reconciliation-store.js';
import { RegisterReconciliationFailure } from '../dist/register-reconciliation/register-reconciliation.types.js';
import { UnconfiguredRegisterReconciliationStore } from '../dist/register-reconciliation/register-reconciliation.types.js';

const NOW = new Date('2026-11-09T00:00:00.000Z');

class FixedClock {
  now() {
    return new Date(NOW.getTime());
  }
}

class FixedIdGenerator {
  constructor(prefix) {
    this.prefix = prefix;
    this.next = 1;
  }

  createId() {
    return `${this.prefix}-${this.next++}`;
  }
}

function principal(companyId, role = 'office_reviewer', userId = 'reviewer-a') {
  return {
    companyId,
    sessionId: `session-${userId}`,
    userId,
    identitySubject: `subject-${userId}`,
    email: `${userId}@example.test`,
    role,
    mfaSatisfied: role === 'administrator',
    authenticatedAt: new Date(NOW.getTime()),
    sessionExpiresAt: new Date(NOW.getTime() + 86_400_000),
  };
}

function proposal(overrides = {}) {
  return {
    companyId: 'company-a',
    proposalId: 'anchor-inspection-a',
    inspectionId: 'inspection-a',
    revisionNumber: 2,
    jobId: 'job-a',
    siteId: 'site-a',
    jurisdiction: 'NSW',
    proposalType: 'newly_discovered',
    provisionalAnchorId: 'provisional-001',
    reconciliationReferenceId: null,
    inspectorNote: 'Not in the released pack.',
    recordedLocation: 'North roof',
    recordedOutcome: 'serviceable',
    submittedByUserId: 'inspector-a',
    submittedAt: new Date('2026-11-08T12:00:00.000Z'),
    photos: [
      {
        photoId: 'photo-001',
        localId: 'photo-001',
        checksum: 'sha256-photo-001',
        capturedAt: '2026-11-08T11:00:00.000Z',
        uploadState: 'uploaded',
      },
    ],
    ...overrides,
  };
}

function decisionRecord(overrides = {}) {
  return {
    companyId: 'company-a',
    proposalDecisionId: 'decision-1',
    proposalId: 'anchor-inspection-a',
    inspectionId: 'inspection-a',
    siteId: 'site-a',
    proposalType: 'newly_discovered',
    decision: 'accepted',
    decidedByUserId: 'reviewer-a',
    decidedAt: new Date(NOW.getTime()),
    registerAnchorId: 'anchor-1',
    assignedLabel: 'A-12',
    assignedLocation: 'North roof',
    reason: null,
    ...overrides,
  };
}

function makeFixture(store = new InMemoryRegisterReconciliationStore()) {
  const service = new RegisterReconciliationService({
    store,
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator('decision'),
  });
  return { store, service };
}

const AUTHORIZATION = 'Bearer opaque-session';

test('proposal list is limited to administrators and office reviewers', async () => {
  const { service } = makeFixture();

  await assert.rejects(
    service.listOpenProposals(principal('company-a', 'inspector'), 'site-a'),
    (error) =>
      error instanceof RegisterReconciliationFailure &&
      error.code === 'ROLE_FORBIDDEN',
  );
  await assert.rejects(
    service.decideProposal(
      principal('company-a', 'inspector'),
      'site-a',
      'anchor-inspection-a',
      { decision: 'reject', reason: 'Not the same anchor' },
    ),
    (error) =>
      error instanceof RegisterReconciliationFailure &&
      error.code === 'ROLE_FORBIDDEN',
  );
});

test('proposal list validates the site scope and returns copied records', async () => {
  const store = new InMemoryRegisterReconciliationStore();
  const stored = proposal();
  store.seedProposals([stored]);
  const { service } = makeFixture(store);

  await assert.rejects(
    service.listOpenProposals(principal('company-a'), '   '),
    (error) =>
      error instanceof RegisterReconciliationFailure &&
      error.code === 'INVALID_INPUT',
  );
  await assert.rejects(
    service.listOpenProposals(principal('company-a'), 's'.repeat(129)),
    (error) =>
      error instanceof RegisterReconciliationFailure &&
      error.code === 'INVALID_INPUT',
  );

  const proposals = await service.listOpenProposals(
    principal('company-a'),
    'site-a',
  );
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].proposalId, 'anchor-inspection-a');
  assert.notEqual(proposals[0], stored);
  assert.notEqual(proposals[0].submittedAt, stored.submittedAt);
  assert.equal(
    proposals[0].submittedAt.getTime(),
    stored.submittedAt.getTime(),
  );
  assert.notEqual(proposals[0].photos[0], stored.photos[0]);
});

test('decision input validation forbids conflicting fields', async () => {
  const store = new InMemoryRegisterReconciliationStore();
  store.seedProposals([proposal()]);
  const { service } = makeFixture(store);

  const invalid = [
    { decision: 'approve', reason: 'nope' },
    { decision: 'reject' },
    { decision: 'reject', reason: '' },
    { decision: 'reject', reason: 'r'.repeat(10_001) },
    { decision: 'reject', reason: 'ok', assignedLabel: 'A-1' },
    { decision: 'reject', reason: 'ok', location: 'North' },
    { decision: 'accept', reason: 'not allowed' },
    { decision: 'accept', assignedLabel: 'x'.repeat(129) },
    { decision: 'accept', location: 'x'.repeat(2001) },
  ];
  for (const input of invalid) {
    await assert.rejects(
      service.decideProposal(
        principal('company-a'),
        'site-a',
        'anchor-inspection-a',
        input,
      ),
      (error) => {
        assert.ok(
          error instanceof RegisterReconciliationFailure &&
            error.code === 'INVALID_INPUT',
          `expected INVALID_INPUT for ${JSON.stringify(input)}`,
        );
        return true;
      },
    );
  }
  assert.equal(store.decisions.length, 0);
});

test('accept of a newly discovered proposal creates an active register anchor', async () => {
  const store = new InMemoryRegisterReconciliationStore();
  store.seedProposals([proposal()]);
  const { service } = makeFixture(store);

  const result = await service.decideProposal(
    principal('company-a'),
    'site-a',
    'anchor-inspection-a',
    { decision: 'accept', assignedLabel: 'A-12', location: 'North roof' },
  );

  assert.equal(result.replayed, false);
  assert.equal(result.decision.decision, 'accepted');
  assert.equal(result.decision.assignedLabel, 'A-12');
  assert.equal(result.decision.assignedLocation, 'North roof');
  assert.equal(result.decision.reason, null);

  const created = store.anchors.find(
    (anchor) => anchor.anchorId === result.decision.registerAnchorId,
  );
  assert.ok(created);
  assert.equal(created.siteId, 'site-a');
  assert.equal(created.label, 'A-12');
  assert.equal(created.location, 'North roof');
  assert.equal(created.anchorType, 'single_point');
  assert.equal(created.registerStatus, 'active');

  assert.equal(store.auditEvents.length, 1);
  const event = store.auditEvents[0];
  assert.equal(event.action, 'register.proposal_accepted');
  assert.equal(event.targetType, 'register_proposal_decision');
  assert.equal(event.metadata.proposalType, 'newly_discovered');
  assert.equal(event.metadata.provisionalAnchorId, 'provisional-001');
  assert.equal(event.metadata.registerAnchorId, created.anchorId);
});

test('accept of a replacement updates the referenced register anchor', async () => {
  const store = new InMemoryRegisterReconciliationStore();
  store.seedProposals([
    proposal({
      proposalId: 'anchor-inspection-b',
      proposalType: 'replacement',
      reconciliationReferenceId: 'anchor-existing',
      provisionalAnchorId: null,
    }),
  ]);
  store.seedAnchors([
    {
      companyId: 'company-a',
      anchorId: 'anchor-existing',
      siteId: 'site-a',
      label: 'A-05',
      registerId: null,
      location: 'Old plant room',
      anchorType: 'single_point',
      manufacturer: null,
      model: null,
      installContext: null,
      registerStatus: 'active',
      notes: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  ]);
  const { service } = makeFixture(store);

  const result = await service.decideProposal(
    principal('company-a'),
    'site-a',
    'anchor-inspection-b',
    { decision: 'accept', location: 'New plant room' },
  );

  assert.equal(result.replayed, false);
  assert.equal(result.decision.registerAnchorId, 'anchor-existing');
  const updated = store.anchors.find(
    (anchor) => anchor.anchorId === 'anchor-existing',
  );
  assert.equal(updated.label, 'A-05');
  assert.equal(updated.location, 'New plant room');
  assert.equal(store.auditEvents[0].action, 'register.proposal_accepted');
});

test('accept of a replacement without a register reference is refused', async () => {
  const store = new InMemoryRegisterReconciliationStore();
  store.seedProposals([
    proposal({
      proposalId: 'anchor-inspection-c',
      proposalType: 'replacement',
      reconciliationReferenceId: null,
    }),
  ]);
  const { service } = makeFixture(store);

  await assert.rejects(
    service.decideProposal(
      principal('company-a'),
      'site-a',
      'anchor-inspection-c',
      {
        decision: 'accept',
      },
    ),
    (error) =>
      error instanceof RegisterReconciliationFailure &&
      error.code === 'INVALID_INPUT',
  );

  store.seedProposals([
    proposal({
      proposalId: 'anchor-inspection-d',
      proposalType: 'duplicate',
      reconciliationReferenceId: 'anchor-missing',
    }),
  ]);
  await assert.rejects(
    service.decideProposal(
      principal('company-a'),
      'site-a',
      'anchor-inspection-d',
      {
        decision: 'accept',
      },
    ),
    (error) =>
      error instanceof RegisterReconciliationFailure &&
      error.code === 'NOT_FOUND',
  );
});

test('reject records a reason and writes no register anchor', async () => {
  const store = new InMemoryRegisterReconciliationStore();
  store.seedProposals([proposal()]);
  const { service } = makeFixture(store);

  const result = await service.decideProposal(
    principal('company-a'),
    'site-a',
    'anchor-inspection-a',
    { decision: 'reject', reason: 'Not the same anchor' },
  );

  assert.equal(result.replayed, false);
  assert.equal(result.decision.decision, 'rejected');
  assert.equal(result.decision.reason, 'Not the same anchor');
  assert.equal(result.decision.registerAnchorId, null);
  assert.equal(store.anchors.length, 0);
  assert.equal(store.auditEvents.length, 1);
  assert.equal(store.auditEvents[0].action, 'register.proposal_rejected');
  assert.equal(store.auditEvents[0].metadata.reason, 'Not the same anchor');
});

test('a decided proposal replays the same decision and refuses the other', async () => {
  const store = new InMemoryRegisterReconciliationStore();
  store.seedProposals([proposal()]);
  const { service } = makeFixture(store);

  const rejected = await service.decideProposal(
    principal('company-a'),
    'site-a',
    'anchor-inspection-a',
    { decision: 'reject', reason: 'Not the same anchor' },
  );
  assert.equal(rejected.replayed, false);

  // A rejected proposal cannot be accepted later without a new submission.
  await assert.rejects(
    service.decideProposal(
      principal('company-a'),
      'site-a',
      'anchor-inspection-a',
      {
        decision: 'accept',
      },
    ),
    (error) =>
      error instanceof RegisterReconciliationFailure &&
      error.code === 'CONFLICT',
  );

  const replay = await service.decideProposal(
    principal('company-a'),
    'site-a',
    'anchor-inspection-a',
    { decision: 'reject', reason: 'Different reason, same outcome' },
  );
  assert.equal(replay.replayed, true);
  assert.equal(replay.decision.reason, 'Not the same anchor');
  assert.equal(store.auditEvents.length, 1);
  assert.equal(store.decisions.length, 1);
});

test('decisions are tenant-scoped in the durable store port', async () => {
  const store = new InMemoryRegisterReconciliationStore();
  store.seedProposals([
    proposal(),
    proposal({ companyId: 'company-b', siteId: 'site-b' }),
  ]);

  const proposals = await store.listOpenProposals('company-a', 'site-a');
  assert.deepEqual(
    proposals.map((item) => item.proposalId),
    ['anchor-inspection-a'],
  );

  const applied = await store.decideProposal(
    proposals[0],
    decisionRecord(),
    null,
    {
      companyId: 'company-a',
      actorUserId: 'reviewer-a',
      action: 'register.proposal_rejected',
      targetType: 'register_proposal_decision',
      targetId: 'decision-1',
      occurredAt: new Date(NOW.getTime()),
      metadata: { reason: 'Not the same anchor' },
    },
  );
  assert.equal(applied, true);
  assert.equal(store.auditEvents.length, 1);
  const decided = await store.listOpenProposals('company-a', 'site-a');
  assert.equal(decided.length, 0);
  const otherCompany = await store.listOpenProposals('company-b', 'site-b');
  assert.deepEqual(
    otherCompany.map((item) => item.proposalId),
    ['anchor-inspection-a'],
  );
});

test('unconfigured register reconciliation persistence fails closed', async () => {
  const store = new UnconfiguredRegisterReconciliationStore();
  // The fail-closed adapter surfaces unavailability on the first call; the
  // assertion accepts either a synchronous throw or a rejected promise.
  let unavailable;
  try {
    await store.listOpenProposals('company-a', 'site-a');
  } catch (error) {
    unavailable = error;
  }

  assert.ok(
    unavailable instanceof RegisterReconciliationFailure &&
      unavailable.code === 'PERSISTENCE_UNAVAILABLE',
  );
});

test('proposal controller authenticates and serializes the site list', async () => {
  const authenticated = [];
  const controller = new RegisterReconciliationController(
    {
      authenticateSession(companyId, token) {
        authenticated.push({ companyId, token });
        return principal(companyId);
      },
    },
    {
      async listOpenProposals(tenantPrincipal, siteId) {
        assert.equal(tenantPrincipal.companyId, 'company-a');
        assert.equal(siteId, 'site-a');
        return [proposal()];
      },
    },
  );

  const response = await controller.listProposals(
    AUTHORIZATION,
    'company-a',
    'site-a',
  );

  assert.deepEqual(authenticated, [
    { companyId: 'company-a', token: 'opaque-session' },
  ]);
  assert.equal(response.length, 1);
  assert.equal(response[0].proposalId, 'anchor-inspection-a');
  assert.equal(response[0].submittedAt, '2026-11-08T12:00:00.000Z');
  assert.deepEqual(response[0].photos, [
    {
      photoId: 'photo-001',
      localId: 'photo-001',
      checksum: 'sha256-photo-001',
      capturedAt: '2026-11-08T11:00:00.000Z',
      uploadState: 'uploaded',
    },
  ]);
});

test('proposal controller authenticates and serializes one decision', async () => {
  const record = decisionRecord();
  const controller = new RegisterReconciliationController(
    {
      authenticateSession(companyId) {
        return principal(companyId);
      },
    },
    {
      async decideProposal(tenantPrincipal, siteId, proposalId, input) {
        assert.equal(tenantPrincipal.companyId, 'company-a');
        assert.equal(siteId, 'site-a');
        assert.equal(proposalId, 'anchor-inspection-a');
        assert.deepEqual(input, {
          decision: 'accept',
          assignedLabel: 'A-12',
          location: 'North roof',
        });
        return { decision: record, replayed: false };
      },
    },
  );

  const response = await controller.decideProposal(
    AUTHORIZATION,
    'company-a',
    'site-a',
    'anchor-inspection-a',
    { decision: 'accept', assignedLabel: 'A-12', location: 'North roof' },
  );

  assert.equal(response.proposalDecisionId, 'decision-1');
  assert.equal(response.decision, 'accepted');
  assert.equal(response.replayed, false);
  assert.equal(response.decidedAt, NOW.toISOString());
});

function httpErrorFixture() {
  return new RegisterReconciliationController(
    {
      authenticateSession(companyId) {
        return principal(companyId);
      },
    },
    {
      async listOpenProposals() {
        throw new RegisterReconciliationFailure(
          'NOT_FOUND',
          'site was not found',
        );
      },
      async decideProposal() {
        throw new RegisterReconciliationFailure(
          'CONFLICT',
          'proposal was already decided',
        );
      },
    },
  );
}

test('proposal controller maps service failures to HTTP errors', async () => {
  const controller = httpErrorFixture();

  await assert.rejects(
    controller.listProposals(AUTHORIZATION, 'company-a', 'site-a'),
    NotFoundException,
  );
  await assert.rejects(
    controller.decideProposal(
      AUTHORIZATION,
      'company-a',
      'site-a',
      'anchor-inspection-a',
      { decision: 'accept' },
    ),
    ConflictException,
  );
});

class FakeSqlTransaction {
  constructor(statements, scriptedResults) {
    this.statements = statements;
    this.scriptedResults = scriptedResults;
  }

  async query(text, values) {
    this.statements.push({ text: text.replace(/\s+/g, ' ').trim(), values });
    const next = this.scriptedResults.shift();
    return next ?? { rows: [], rowCount: 1 };
  }
}

class FakeSqlDatabase {
  constructor(statements, scriptedResults = []) {
    this.statements = statements;
    this.scriptedResults = scriptedResults;
  }

  async transaction(work) {
    return work(new FakeSqlTransaction(this.statements, this.scriptedResults));
  }
}

test('PostgreSQL proposal list is tenant-scoped, site-filtered and newest first', async () => {
  const statements = [];
  const database = new FakeSqlDatabase(statements, [
    { rows: [], rowCount: 1 },
    { rows: [{ site_id: 'site-a' }], rowCount: 1 },
    {
      rows: [
        {
          anchor_inspection_id: 'anchor-inspection-a',
          inspection_id: 'inspection-a',
          revision_number: 2,
          job_id: 'job-a',
          site_id: 'site-a',
          jurisdiction: 'NSW',
          reconciliation_proposal: 'newly_discovered',
          provisional_anchor_id: 'provisional-001',
          reconciliation_reference_id: null,
          notes: 'Not in the released pack.',
          location: 'North roof',
          recorded_outcome: 'serviceable',
          inspector_user_id: 'inspector-a',
          submitted_at: new Date('2026-11-08T12:00:00.000Z'),
        },
      ],
      rowCount: 1,
    },
    { rows: [], rowCount: 0 },
  ]);
  const store = new PostgresRegisterReconciliationStore(database);

  const proposals = await store.listOpenProposals('company-a', 'site-a');
  assert.equal(proposals.length, 1);
  assert.equal(proposals[0].proposalId, 'anchor-inspection-a');
  assert.deepEqual(proposals[0].photos, []);

  const listStatement = statements[2].text;
  assert.match(listStatement, /LEFT JOIN register_reconciliation_decisions/);
  assert.match(listStatement, /ai\.company_id = \$1/);
  assert.match(listStatement, /ai\.site_id = \$2/);
  assert.match(listStatement, /decision\.proposal_decision_id IS NULL/);
  assert.match(listStatement, /ORDER BY ins\.submitted_at DESC/);
  const photoStatement = statements[3].text;
  assert.match(photoStatement, /p\.anchor_inspection_id = ANY\(\$2\)/);
  assert.match(statements[1].text, /FROM sites/);
});

test('PostgreSQL decideProposal persists the decision, anchor change and audit event together', async () => {
  const statements = [];
  const database = new FakeSqlDatabase(statements);
  const store = new PostgresRegisterReconciliationStore(database);
  const item = proposal();
  const decision = decisionRecord();

  const applied = await store.decideProposal(
    item,
    decision,
    {
      kind: 'create',
      anchor: {
        companyId: 'company-a',
        anchorId: 'anchor-1',
        siteId: 'site-a',
        label: 'A-12',
        registerId: null,
        location: 'North roof',
        anchorType: 'single_point',
        manufacturer: null,
        model: null,
        installContext: null,
        registerStatus: 'active',
        notes: null,
        createdAt: new Date(NOW.getTime()),
        updatedAt: new Date(NOW.getTime()),
      },
    },
    {
      companyId: 'company-a',
      actorUserId: 'reviewer-a',
      action: 'register.proposal_accepted',
      targetType: 'register_proposal_decision',
      targetId: 'decision-1',
      occurredAt: new Date(NOW.getTime()),
      metadata: { proposalType: 'newly_discovered' },
    },
  );

  assert.equal(applied, true);
  assert.equal(statements.length, 4);
  assert.match(statements[0].text, /set_config/);
  assert.match(
    statements[1].text,
    /INSERT INTO register_reconciliation_decisions/,
  );
  assert.match(
    statements[1].text,
    /ON CONFLICT \(company_id, anchor_inspection_id\) DO NOTHING/,
  );
  assert.match(statements[2].text, /INSERT INTO anchors/);
  assert.match(statements[3].text, /INSERT INTO audit_events/);
  assert.match(statements[3].text, /target_type/);
});

test('PostgreSQL decideProposal returns false without anchor or audit writes on replay', async () => {
  const statements = [];
  const database = new FakeSqlDatabase(statements, [
    { rows: [], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ]);
  const store = new PostgresRegisterReconciliationStore(database);
  const item = proposal();
  const decision = decisionRecord();

  const applied = await store.decideProposal(item, decision, null, {
    companyId: 'company-a',
    actorUserId: 'reviewer-a',
    action: 'register.proposal_rejected',
    targetType: 'register_proposal_decision',
    targetId: 'decision-1',
    occurredAt: new Date(NOW.getTime()),
    metadata: { reason: 'Not the same anchor' },
  });

  assert.equal(applied, false);
  assert.equal(statements.length, 2);
});

test('PostgreSQL decision rows that cross company scope are refused', async () => {
  const statements = [];
  const database = new FakeSqlDatabase(statements, [
    { rows: [], rowCount: 1 },
    {
      rows: [
        {
          company_id: 'company-b',
          proposal_decision_id: 'decision-1',
          anchor_inspection_id: 'anchor-inspection-a',
          inspection_id: 'inspection-a',
          site_id: 'site-a',
          proposal_type: 'newly_discovered',
          decision: 'accepted',
          decided_by_user_id: 'reviewer-a',
          register_anchor_id: 'anchor-1',
          assigned_label: 'A-12',
          assigned_location: 'North roof',
          reason: null,
          created_at: new Date(NOW.getTime()),
        },
      ],
      rowCount: 1,
    },
  ]);
  const store = new PostgresRegisterReconciliationStore(database);

  await assert.rejects(
    store.findDecision('company-a', 'anchor-inspection-a'),
    (error) =>
      error instanceof RegisterReconciliationFailure &&
      error.code === 'PERSISTENCE_UNAVAILABLE',
  );
});

test('generated contract exposes the site reconciliation proposal operations', async () => {
  const { readFile } = await import('node:fs/promises');
  const contract = JSON.parse(
    await readFile(
      new URL('../../../contracts/openapi/v1/openapi.json', import.meta.url),
      'utf8',
    ),
  );
  const listOperation =
    contract.paths['/sites/{siteId}/reconciliation-proposals'].get;
  assert.equal(listOperation.operationId, 'listReconciliationProposals');
  assert.deepEqual(listOperation.responses['200'].content, {
    'application/json': {
      schema: {
        items: {
          $ref: '#/components/schemas/ReconciliationProposalResponseDto',
        },
        type: 'array',
      },
    },
  });

  const decisionOperation =
    contract.paths[
      '/sites/{siteId}/reconciliation-proposals/{proposalId}/decision'
    ].post;
  assert.equal(decisionOperation.operationId, 'decideReconciliationProposal');

  const typescriptClient = await readFile(
    new URL(
      '../../../clients/typescript/src/apis/RegisterReconciliationApi.ts',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(
    typescriptClient,
    /listReconciliationProposals\([^\n]+Promise<Array<ReconciliationProposalResponseDto>>/,
  );
  const kotlinClient = await readFile(
    new URL(
      '../../../clients/kotlin/src/main/kotlin/au/com/heightsafety/api/apis/RegisterReconciliationApi.kt',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(kotlinClient, /listReconciliationProposals/);
});
