import assert from 'node:assert/strict';
import test from 'node:test';

import { ApprovedSnapshotService } from '../dist/approved-snapshot/approved-snapshot-service.js';
import { ApprovedSnapshotFailure } from '../dist/approved-snapshot/approved-snapshot.types.js';
import { InMemoryApprovedSnapshotStore } from '../dist/approved-snapshot/approved-snapshot-store.js';
import { PostgresApprovedSnapshotStore } from '../dist/approved-snapshot/approved-snapshot-postgres-store.js';

class FixedClock {
  now() {
    return new Date('2026-09-07T00:00:00.000Z');
  }
}

class FixedIdGenerator {
  constructor() {
    this.next = 1;
  }

  createId() {
    return `snapshot-${this.next++}`;
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
    authenticatedAt: new Date('2026-09-07T00:00:00.000Z'),
    sessionExpiresAt: new Date('2026-09-08T00:00:00.000Z'),
  };
}

function submission(overrides = {}) {
  return {
    companyId: 'company-a',
    jobId: 'job-a',
    siteId: 'site-a',
    jurisdiction: 'NSW',
    submissionId: 'submission-a',
    jobPackVersion: 2,
    anchorInspections: [
      {
        inspectionId: 'anchor-inspection-a',
        expectedAnchorId: 'anchor-a',
        provisionalAnchorId: null,
        identityConfirmed: true,
        locationConfirmed: true,
        location: 'North roof',
        observations: 'Recorded observation.',
        recordedOutcome: 'serviceable',
        exceptionReason: null,
        reconciliationProposal: null,
        reconciliationReferenceId: null,
        disposition: null,
        notes: 'Inspector-entered note.',
        defectDescription: null,
        recommendation: null,
        proofTestLoad: null,
        proofTestHold: null,
        proofTestResult: null,
        proofTestEquipmentReference: null,
        photos: [
          {
            localId: 'photo-a',
            storageReference: 'company-a/photo-a.jpg',
            capturedAtEpochMillis: 1_757_200_000_000,
            checksum: 'photo-a-sha',
            contentType: 'image/jpeg',
            byteSize: 2048,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function source(overrides = {}) {
  return {
    approvalId: 'approval-a',
    reviewStatus: 'approved_for_report_generation',
    companyId: 'company-a',
    jobId: 'job-a',
    siteId: 'site-a',
    jurisdiction: 'NSW',
    inspectionId: 'inspection-a',
    inspectionRevision: 3,
    evidenceVersion: 7,
    jobPackVersion: 2,
    inspectorUserId: 'inspector-a',
    requiredEvidenceSynchronised: true,
    openHardBlockerCount: 0,
    openChangeRequestCount: 0,
    submission: submission(),
    ...overrides,
  };
}

function makeHarness() {
  const audit = {
    events: [],
    record(event) {
      this.events.push(event);
    },
  };
  const service = new ApprovedSnapshotService({
    store: new InMemoryApprovedSnapshotStore(),
    auditSink: audit,
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });
  return { audit, service };
}

class FakeSqlDatabase {
  constructor(rows = [], queryError = null) {
    this.rows = rows;
    this.queryError = queryError;
    this.queries = [];
  }

  async transaction(work) {
    return work({
      query: async (text, values) => {
        this.queries.push({ text, values });
        if (this.queryError && text.includes('INSERT INTO')) {
          throw this.queryError;
        }
        return { rows: this.rows };
      },
    });
  }
}

class ConcurrentApprovalStore {
  constructor() {
    this.snapshot = undefined;
    this.reads = 0;
  }

  async findById() {
    return this.snapshot;
  }

  async findByApprovalId() {
    this.reads += 1;
    return this.reads === 1 ? undefined : this.snapshot;
  }

  async create(snapshot) {
    this.snapshot = snapshot;
    throw new ApprovedSnapshotFailure(
      'CONFLICT',
      'simulated concurrent approval insert',
    );
  }
}

async function expectFailure(action, code) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof ApprovedSnapshotFailure);
    assert.equal(error.code, code);
    return true;
  });
}

test('freezes a tenant-scoped approved inspection revision with evidence references', async () => {
  const { audit, service } = makeHarness();
  const result = await service.create(principal('company-a'), source());

  assert.equal(result.replayed, false);
  assert.equal(result.snapshot.snapshotId, 'snapshot-1');
  assert.equal(result.snapshot.jurisdiction, 'NSW');
  assert.equal(result.snapshot.sourceInspectionRevision, 3);
  assert.equal(result.snapshot.sourceEvidenceVersion, 7);
  assert.equal(result.snapshot.approvedByUserId, 'reviewer-a');
  assert.equal(
    result.snapshot.approvedAt.toISOString(),
    '2026-09-07T00:00:00.000Z',
  );
  assert.match(result.snapshot.sourceIdentitySha256, /^[a-f0-9]{64}$/);
  assert.match(result.snapshot.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    JSON.parse(result.snapshot.documentJson),
    result.snapshot.document,
  );
  assert.equal(
    result.snapshot.document.inspectionSubmission.anchorInspections[0].photos[0]
      .storageReference,
    'company-a/photo-a.jpg',
  );
  assert.deepEqual(
    audit.events.map((event) => event.action),
    ['inspection.snapshot_approved'],
  );
});

test('replaying one review approval returns the same immutable snapshot', async () => {
  const { audit, service } = makeHarness();
  const first = await service.create(principal('company-a'), source());
  const replay = await service.create(principal('company-a'), source());

  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.snapshot, first.snapshot);
  assert.equal(audit.events.length, 1);

  await expectFailure(
    () =>
      service.create(principal('company-a'), source({ inspectionRevision: 4 })),
    'CONFLICT',
  );
});

test('concurrent approval insert is replayed when the frozen source is identical', async () => {
  const audit = {
    events: [],
    record(event) {
      this.events.push(event);
    },
  };
  const service = new ApprovedSnapshotService({
    store: new ConcurrentApprovalStore(),
    auditSink: audit,
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });

  const result = await service.create(principal('company-a'), source());

  assert.equal(result.replayed, true);
  assert.equal(result.snapshot.snapshotId, 'snapshot-1');
  assert.equal(audit.events.length, 0);
});

test('approval gates reject unsynchronised evidence, blockers and open changes', async () => {
  const { service } = makeHarness();

  await expectFailure(
    () =>
      service.create(
        principal('company-a'),
        source({ requiredEvidenceSynchronised: false }),
      ),
    'CONFLICT',
  );
  await expectFailure(
    () =>
      service.create(
        principal('company-a'),
        source({ openHardBlockerCount: 1 }),
      ),
    'CONFLICT',
  );
  await expectFailure(
    () =>
      service.create(
        principal('company-a'),
        source({ openChangeRequestCount: 1 }),
      ),
    'CONFLICT',
  );
  await expectFailure(
    () =>
      service.create(
        principal('company-a'),
        source({ reviewStatus: 'under_review' }),
      ),
    'INVALID_INPUT',
  );
});

test('only office reviewers and administrators can approve or read snapshots', async () => {
  const { service } = makeHarness();

  await expectFailure(
    () => service.create(principal('company-a', 'inspector'), source()),
    'ROLE_FORBIDDEN',
  );
  const created = await service.create(
    principal('company-a', 'administrator', 'admin-a'),
    source(),
  );
  assert.equal(
    (
      await service.get(
        principal('company-a', 'administrator', 'admin-a'),
        created.snapshot.snapshotId,
      )
    ).approvedByUserId,
    'admin-a',
  );
  await expectFailure(
    () =>
      service.get(
        principal('company-a', 'inspector'),
        created.snapshot.snapshotId,
      ),
    'ROLE_FORBIDDEN',
  );
});

test('tenant scope and source identity cannot be crossed or rewritten', async () => {
  const { service } = makeHarness();
  const created = await service.create(principal('company-a'), source());

  await expectFailure(
    () => service.get(principal('company-b'), created.snapshot.snapshotId),
    'NOT_FOUND',
  );
  await expectFailure(
    () =>
      service.create(
        principal('company-a'),
        source({
          companyId: 'company-b',
          submission: submission({ companyId: 'company-b' }),
        }),
      ),
    'CONFLICT',
  );
});

test('stored evidence stays unchanged when source or returned values are mutated', async () => {
  const { service } = makeHarness();
  const input = source();
  const created = await service.create(principal('company-a'), input);
  input.submission.anchorInspections[0].photos[0].checksum = 'changed';
  created.snapshot.document.inspectionSubmission.anchorInspections[0].photos[0].checksum =
    'changed-again';

  const stored = await service.get(
    principal('company-a'),
    created.snapshot.snapshotId,
  );
  assert.equal(
    stored.document.inspectionSubmission.anchorInspections[0].photos[0]
      .checksum,
    'photo-a-sha',
  );
  assert.equal(stored.sha256, created.snapshot.sha256);
});

test('preserves Queensland as recorded site context without deriving a rule', async () => {
  const { service } = makeHarness();
  const result = await service.create(
    principal('company-a'),
    source({
      approvalId: 'approval-qld',
      jurisdiction: 'QLD',
      submission: submission({ jurisdiction: 'QLD' }),
    }),
  );

  assert.equal(result.snapshot.jurisdiction, 'QLD');
  assert.equal(result.snapshot.document.jurisdiction, 'QLD');
});

test('PostgreSQL adapter applies tenant context and round-trips immutable snapshot content', async () => {
  const { service } = makeHarness();
  const created = await service.create(principal('company-a'), source());
  const snapshot = created.snapshot;
  const database = new FakeSqlDatabase([
    {
      company_id: snapshot.companyId,
      snapshot_id: snapshot.snapshotId,
      approval_id: snapshot.approvalId,
      inspection_id: snapshot.sourceInspectionId,
      jurisdiction: snapshot.jurisdiction,
      snapshot_document: snapshot.documentJson,
      sha256: snapshot.sha256,
    },
  ]);
  const store = new PostgresApprovedSnapshotStore(database);

  await store.create(snapshot);
  const byId = await store.findById('company-a', snapshot.snapshotId);
  const byApproval = await store.findByApprovalId(
    'company-a',
    snapshot.approvalId,
  );

  assert.deepEqual(byId, snapshot);
  assert.deepEqual(byApproval, snapshot);
  assert.equal(
    database.queries[0].text,
    "SELECT set_config('app.company_id', $1, true)",
  );
  assert.deepEqual(database.queries[0].values, ['company-a']);
  assert.match(database.queries[1].text, /approval_id/);
  assert.deepEqual(database.queries[1].values.slice(0, 5), [
    'company-a',
    'snapshot-1',
    'approval-a',
    'inspection-a',
    'NSW',
  ]);
});

test('PostgreSQL adapter maps approval uniqueness and corrupt content to typed failures', async () => {
  const { service } = makeHarness();
  const created = await service.create(principal('company-a'), source());
  const uniqueDatabase = new FakeSqlDatabase([], { code: '23505' });
  const uniqueStore = new PostgresApprovedSnapshotStore(uniqueDatabase);

  await expectFailure(() => uniqueStore.create(created.snapshot), 'CONFLICT');

  const corruptDatabase = new FakeSqlDatabase([
    {
      company_id: 'company-a',
      snapshot_id: 'snapshot-1',
      approval_id: 'approval-a',
      inspection_id: 'inspection-a',
      jurisdiction: 'NSW',
      snapshot_document: created.snapshot.documentJson,
      sha256: 'wrong-sha',
    },
  ]);
  const corruptStore = new PostgresApprovedSnapshotStore(corruptDatabase);

  await expectFailure(
    () => corruptStore.findById('company-a', 'snapshot-1'),
    'PERSISTENCE_UNAVAILABLE',
  );
});
