import assert from 'node:assert/strict';
import test from 'node:test';

import { ApprovedSnapshotService } from '../dist/approved-snapshot/approved-snapshot-service.js';
import { ApprovedSnapshotFailure } from '../dist/approved-snapshot/approved-snapshot.types.js';
import {
  InMemoryApprovedSnapshotStore,
  InMemoryApprovedSnapshotStateReader,
} from '../dist/approved-snapshot/approved-snapshot-store.js';
import { PostgresApprovedSnapshotStore } from '../dist/approved-snapshot/approved-snapshot-postgres-store.js';
import { PostgresApprovedSnapshotStateReader } from '../dist/approved-snapshot/approved-snapshot-postgres-state-reader.js';

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

function durableState(overrides = {}) {
  return {
    inspectionId: 'inspection-a',
    revisionNumber: 3,
    latestRevisionNumber: 3,
    workflowStatus: 'submitted',
    jobPackVersion: 2,
    inspectorUserId: 'inspector-a',
    requiredEvidenceSynchronised: true,
    openHardBlockerCount: 0,
    openChangeRequestCount: 0,
    evidenceVersion: 7,
    submission: submission(),
    ...overrides,
  };
}

function makeAuthoritativeHarness(
  state,
  store = new InMemoryApprovedSnapshotStore(),
  stateCompanyId = 'company-a',
) {
  const audit = {
    events: [],
    record(event) {
      this.events.push(event);
    },
  };
  const reader = new InMemoryApprovedSnapshotStateReader();
  reader.put(stateCompanyId, state);
  const service = new ApprovedSnapshotService({
    store,
    auditSink: audit,
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
    stateReader: reader,
  });
  return { audit, service, reader, store };
}

class QueuedSqlDatabase {
  constructor(rowsPerQuery) {
    this.rowsPerQuery = rowsPerQuery;
    this.queries = [];
  }

  async transaction(work) {
    return work({
      query: async (text, values) => {
        this.queries.push({ text, values });
        return { rows: this.rowsPerQuery[this.queries.length - 1] ?? [] };
      },
    });
  }
}

class FakeSqlDatabase {
  constructor(
    rows = [],
    queryError = null,
    transitionRows = [{ job_id: 'job-a' }],
  ) {
    this.rows = rows;
    this.queryError = queryError;
    this.transitionRows = transitionRows;
    this.queries = [];
    this.transactionCount = 0;
    this.committedTransactions = 0;
    this.rolledBackTransactions = 0;
  }

  async transaction(work) {
    const transactionId = ++this.transactionCount;
    try {
      const result = await work({
        query: async (text, values) => {
          this.queries.push({ text, values, transactionId });
          if (this.queryError && text.includes('INSERT INTO')) {
            throw this.queryError;
          }
          return {
            rows: /RETURNING job_id/.test(text)
              ? this.transitionRows
              : this.rows,
          };
        },
      });
      this.committedTransactions += 1;
      return result;
    } catch (error) {
      this.rolledBackTransactions += 1;
      throw error;
    }
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

test('PostgreSQL approval writes the snapshot and audit event in one transaction', async () => {
  const { service: sourceService } = makeHarness();
  const sourceSnapshot = await sourceService.create(
    principal('company-a'),
    source(),
  );
  const database = new FakeSqlDatabase();
  const store = new PostgresApprovedSnapshotStore(database);
  const service = new ApprovedSnapshotService({
    store,
    auditSink: {
      record() {
        throw new Error('separate audit sink must not be used');
      },
    },
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });

  await service.create(principal('company-a'), source());

  assert.equal(database.queries.length, 5);
  assert.equal(
    database.queries[0].text,
    "SELECT set_config('app.company_id', $1, true)",
  );
  assert.match(database.queries[1].text, /approval_id/);
  assert.equal(
    database.queries[2].text,
    "SELECT set_config('app.company_id', $1, true)",
  );
  assert.match(database.queries[3].text, /INSERT INTO inspection_snapshots/);
  assert.match(database.queries[4].text, /INSERT INTO audit_events/);
  assert.equal(database.queries[4].values[0], 'company-a');
  assert.equal(database.queries[4].values[2], 'reviewer-a');
  assert.equal(
    database.queries[4].values[5],
    sourceSnapshot.snapshot.snapshotId,
  );
  assert.equal(
    database.queries[2].transactionId,
    database.queries[4].transactionId,
  );
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

test('atomic PostgreSQL approval rolls back the snapshot when audit persistence fails', async () => {
  const { service } = makeHarness();
  const created = await service.create(principal('company-a'), source());
  const database = new FakeSqlDatabase([], new Error('audit unavailable'));
  const store = new PostgresApprovedSnapshotStore(database);

  await assert.rejects(
    () =>
      store.createWithAudit(created.snapshot, {
        companyId: 'company-a',
        actorUserId: 'reviewer-a',
        action: 'inspection.snapshot_approved',
        targetType: 'inspection_snapshot',
        targetId: created.snapshot.snapshotId,
        occurredAt: created.snapshot.approvedAt,
      }),
    (error) =>
      error instanceof ApprovedSnapshotFailure &&
      error.code === 'PERSISTENCE_UNAVAILABLE',
  );
  assert.equal(database.committedTransactions, 0);
  assert.equal(database.rolledBackTransactions, 1);
});

test('authoritative approval freezes the durable submitted revision and replays exactly once', async () => {
  const { service, store } = makeAuthoritativeHarness(durableState());
  const result = await service.createApproved(principal('company-a'), {
    inspectionId: 'inspection-a',
  });

  assert.equal(result.replayed, false);
  assert.equal(result.snapshot.approvalId, 'inspection:inspection-a:rev:3');
  assert.equal(result.snapshot.sourceInspectionId, 'inspection-a');
  assert.equal(result.snapshot.sourceInspectionRevision, 3);
  assert.equal(result.snapshot.sourceEvidenceVersion, 7);
  assert.equal(result.snapshot.document.inspectorUserId, 'inspector-a');
  assert.equal(result.snapshot.document.inspectionSubmission.jobId, 'job-a');
  assert.deepEqual(
    store.auditEvents.map((event) => event.action),
    ['inspection.snapshot_approved'],
  );
  assert.deepEqual(
    store.jobTransitions.map((transition) => [
      transition.companyId,
      transition.jobId,
      transition.workflowStatus,
    ]),
    [['company-a', 'job-a', 'approved_for_report_generation']],
  );

  const replay = await service.createApproved(principal('company-a'), {
    inspectionId: 'inspection-a',
  });
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.snapshot, result.snapshot);
  assert.equal(store.auditEvents.length, 1);
  assert.equal(store.jobTransitions.length, 1);
});

test('authoritative approval gates reject durable blockers, changes, unsynchronised evidence and stale revisions', async () => {
  const cases = [
    {
      overrides: { openHardBlockerCount: 1 },
      message: 'inspection has unresolved hard blockers',
    },
    {
      overrides: { openChangeRequestCount: 2 },
      message: 'inspection has open change requests',
    },
    {
      overrides: { requiredEvidenceSynchronised: false },
      message: 'required inspection evidence is not synchronised',
    },
    {
      overrides: { workflowStatus: 'working' },
      message: 'inspection revision is not submitted for review',
    },
    {
      overrides: { latestRevisionNumber: 4 },
      message: 'a newer inspection revision exists for this job',
    },
  ];
  for (const { overrides, message } of cases) {
    const { service } = makeAuthoritativeHarness(durableState(overrides));
    await assert.rejects(
      () =>
        service.createApproved(principal('company-a'), {
          inspectionId: 'inspection-a',
        }),
      (error) => {
        assert.ok(error instanceof ApprovedSnapshotFailure);
        assert.equal(error.code, 'CONFLICT');
        assert.equal(error.message, message);
        return true;
      },
    );
  }
});

test('authoritative approval is tenant-scoped and requires a configured reader', async () => {
  const { service } = makeAuthoritativeHarness(
    durableState(),
    new InMemoryApprovedSnapshotStore(),
    'company-b',
  );
  await expectFailure(
    () =>
      service.createApproved(principal('company-a'), {
        inspectionId: 'inspection-a',
      }),
    'NOT_FOUND',
  );

  const unconfigured = new ApprovedSnapshotService({
    store: new InMemoryApprovedSnapshotStore(),
    auditSink: { record() {} },
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });
  await expectFailure(
    () =>
      unconfigured.createApproved(principal('company-a'), {
        inspectionId: 'inspection-a',
      }),
    'PERSISTENCE_UNAVAILABLE',
  );
});

test('PostgreSQL state reader reads review counts, payload and photo state in one tenant-bound transaction', async () => {
  const payload = submission();
  const database = new QueuedSqlDatabase([
    [],
    [
      {
        inspection_id: 'inspection-a',
        job_id: 'job-a',
        site_id: 'site-a',
        jurisdiction: 'NSW',
        revision_number: 3,
        inspector_user_id: 'inspector-a',
        inspection_workflow_status: 'submitted',
        job_pack_version: 2,
      },
    ],
    [{ latest_revision: 3 }],
    [{ open_blockers: 0, open_changes: 0 }],
    [{ entity_version: 7, request_body: JSON.stringify({ payload }) }],
    [{ pending_photos: 0 }],
  ]);
  const reader = new PostgresApprovedSnapshotStateReader(database);

  const state = await reader.findSubmissionState('company-a', 'inspection-a');

  assert.equal(database.queries.length, 6);
  assert.equal(
    database.queries[0].text,
    "SELECT set_config('app.company_id', $1, true)",
  );
  assert.match(database.queries[1].text, /FROM inspections i/);
  assert.match(database.queries[2].text, /MAX\(revision_number\)/);
  assert.match(database.queries[3].text, /FILTER \(WHERE status = 'open'/);
  assert.match(database.queries[4].text, /SELECT entity_version, request_body/);
  assert.doesNotMatch(database.queries[4].text, /->/);
  assert.match(database.queries[5].text, /upload_state <> 'uploaded'/);
  assert.deepEqual(database.queries[5].values, ['company-a', 'inspection-a']);
  assert.deepEqual(state, {
    inspectionId: 'inspection-a',
    revisionNumber: 3,
    latestRevisionNumber: 3,
    workflowStatus: 'submitted',
    jobPackVersion: 2,
    inspectorUserId: 'inspector-a',
    requiredEvidenceSynchronised: true,
    openHardBlockerCount: 0,
    openChangeRequestCount: 0,
    evidenceVersion: 7,
    submission: payload,
  });
});

test('PostgreSQL state reader fails closed on unknown rows and payload mismatch', async () => {
  const emptyReader = new PostgresApprovedSnapshotStateReader(
    new QueuedSqlDatabase([[]]),
  );
  const missing = await emptyReader.findSubmissionState(
    'company-a',
    'inspection-a',
  );
  assert.equal(missing, undefined);

  const mismatchReader = new PostgresApprovedSnapshotStateReader(
    new QueuedSqlDatabase([
      [],
      [
        {
          inspection_id: 'inspection-a',
          job_id: 'job-a',
          site_id: 'site-a',
          jurisdiction: 'NSW',
          revision_number: 3,
          inspector_user_id: 'inspector-a',
          inspection_workflow_status: 'submitted',
          job_pack_version: 2,
        },
      ],
      [{ latest_revision: 3 }],
      [{ open_blockers: 0, open_changes: 0 }],
      [
        {
          entity_version: 7,
          request_body: JSON.stringify({
            payload: submission({ jobId: 'other-job' }),
          }),
        },
      ],
      [{ pending_photos: 0 }],
    ]),
  );
  await expectFailure(
    () => mismatchReader.findSubmissionState('company-a', 'inspection-a'),
    'PERSISTENCE_UNAVAILABLE',
  );
});

test('PostgreSQL approval commits snapshot, audit event and job pointer in one transaction', async () => {
  const database = new FakeSqlDatabase();
  const { audit, service } = makeAuthoritativeHarness(
    durableState(),
    new PostgresApprovedSnapshotStore(database),
  );

  await service.createApproved(principal('company-a'), {
    inspectionId: 'inspection-a',
  });

  assert.equal(database.queries.length, 7);
  assert.equal(
    database.queries[0].text,
    "SELECT set_config('app.company_id', $1, true)",
  );
  assert.match(database.queries[1].text, /approval_id/);
  assert.match(database.queries[3].text, /pg_advisory_xact_lock/);
  assert.deepEqual(database.queries[3].values, [
    'company-a',
    'inspection_submission',
    'job-a',
  ]);
  assert.match(database.queries[4].text, /INSERT INTO inspection_snapshots/);
  assert.match(database.queries[5].text, /INSERT INTO audit_events/);
  assert.match(database.queries[6].text, /UPDATE jobs/);
  assert.match(database.queries[6].text, /'approved_for_report_generation'/);
  assert.match(database.queries[6].text, /'changes_requested'/);
  assert.match(database.queries[6].text, /RETURNING job_id/);
  assert.deepEqual(database.queries[6].values.slice(0, 2), [
    'company-a',
    'job-a',
  ]);
  const approvalTransactionId = database.queries[2].transactionId;
  assert.equal(database.queries[3].transactionId, approvalTransactionId);
  assert.equal(database.queries[4].transactionId, approvalTransactionId);
  assert.equal(database.queries[5].transactionId, approvalTransactionId);
  assert.equal(database.queries[6].transactionId, approvalTransactionId);
  assert.equal(database.committedTransactions, 2);
  assert.deepEqual(
    audit.events.map((event) => event.action),
    [],
  );
});

test('PostgreSQL approval rolls back the job pointer when snapshot persistence fails', async () => {
  const database = new FakeSqlDatabase([], { code: '23505' });
  const { service } = makeAuthoritativeHarness(
    durableState(),
    new PostgresApprovedSnapshotStore(database),
  );

  await expectFailure(
    () =>
      service.createApproved(principal('company-a'), {
        inspectionId: 'inspection-a',
      }),
    'CONFLICT',
  );
  assert.ok(database.rolledBackTransactions >= 1);
  assert.ok(
    database.queries.every((query) => !/UPDATE jobs/.test(query.text)),
    'job pointer must not move when snapshot persistence fails',
  );
});

test('authoritative approval fails closed when the store cannot move the job pointer', async () => {
  const reader = new InMemoryApprovedSnapshotStateReader();
  reader.put('company-a', durableState());
  const service = new ApprovedSnapshotService({
    store: {
      async findById() {
        return undefined;
      },
      async findByApprovalId() {
        return undefined;
      },
      async create() {},
    },
    auditSink: { record() {} },
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
    stateReader: reader,
  });

  await expectFailure(
    () =>
      service.createApproved(principal('company-a'), {
        inspectionId: 'inspection-a',
      }),
    'PERSISTENCE_UNAVAILABLE',
  );
});

test('PostgreSQL approval fails closed when the approved revision is no longer the submitted revision', async () => {
  const database = new FakeSqlDatabase([], null, []);
  const { service } = makeAuthoritativeHarness(
    durableState(),
    new PostgresApprovedSnapshotStore(database),
  );

  await expectFailure(
    () =>
      service.createApproved(principal('company-a'), {
        inspectionId: 'inspection-a',
      }),
    'CONFLICT',
  );
  assert.ok(database.rolledBackTransactions >= 1);
  assert.ok(
    database.queries.some((query) => /RETURNING job_id/.test(query.text)),
    'guarded job transition must be attempted before failing closed',
  );
});
