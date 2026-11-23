import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { StreamableFile } from '@nestjs/common';

import {
  LocalPrivateReportObjectStore,
  UnconfiguredReportArtifactObjectStore,
  reportArtifactObjectStoreFromEnvironment,
} from '../dist/reports/local-private-report-object-store.js';
import { PostgresReportGenerationStore } from '../dist/reports/postgres-report-generation-store.js';
import { UnconfiguredReportGenerationStore } from '../dist/reports/report-generation-store.js';
import { ReportGenerationController } from '../dist/reports/report-generation.controller.js';
import { ReportGenerationService } from '../dist/reports/report-generation-service.js';
import { ReportGenerationWorker } from '../dist/reports/report-generation-worker.js';
import { buildReportHtml } from '../dist/reports/report-renderer.js';
import {
  ReportGenerationFailure,
  REPORT_TEMPLATE_VERSION,
} from '../dist/reports/report-generation.types.js';
import {
  createReportRenderDeadline,
  ReportRenderDeadlineExceededError,
  REPORT_RENDER_TIMEOUT_MS,
  withReportRenderDeadline,
} from '../dist/reports/report-render-deadline.js';

const NOW = new Date('2026-10-06T00:00:00.000Z');
const SNAPSHOT_SHA256 = 'a'.repeat(64);

class FixedClock {
  now() {
    return new Date(NOW.getTime());
  }
}

class FixedIdGenerator {
  constructor() {
    this.next = 1;
  }

  createId() {
    return `generated-${this.next++}`;
  }
}

function principal(companyId = 'company-a', role = 'office_reviewer') {
  return {
    companyId,
    sessionId: 'session-reviewer-a',
    userId: 'reviewer-a',
    identitySubject: 'subject-reviewer-a',
    email: 'reviewer-a@example.test',
    role,
    mfaSatisfied: role === 'administrator',
    authenticatedAt: new Date(NOW.getTime()),
    sessionExpiresAt: new Date(NOW.getTime() + 60_000),
  };
}

function approvedSnapshot(overrides = {}) {
  const document = {
    snapshotSchemaVersion: 2,
    approvalId: 'approval-a',
    reviewStatus: 'approved_for_report_generation',
    companyId: 'company-a',
    jobId: 'job-a',
    siteId: 'site-a',
    jurisdiction: 'NSW',
    sourceInspectionId: 'inspection-a',
    sourceInspectionRevision: 3,
    sourceEvidenceVersion: 7,
    jobPackVersion: 2,
    inspectorUserId: 'inspector-a',
    approvedByUserId: 'reviewer-a',
    approvedAt: NOW.toISOString(),
    sourceIdentitySha256: 'b'.repeat(64),
    inspectionSubmission: {
      companyId: 'company-a',
      jobId: 'job-a',
      siteId: 'site-a',
      jurisdiction: 'NSW',
      submissionId: 'submission-a',
      jobPackVersion: 2,
      anchorInspections: [],
    },
    reportContext: {
      jobPackVersion: 2,
      inspectionStartedAt: '2026-10-05T23:00:00.000Z',
      inspectionSubmittedAt: NOW.toISOString(),
      site: {
        siteId: 'site-a',
        clientId: 'client-a',
        name: 'Fictional site',
        address: null,
        jurisdiction: 'NSW',
        siteReference: null,
      },
      expectedAnchors: [],
      reviewIssues: [],
    },
  };
  return {
    companyId: 'company-a',
    snapshotId: 'snapshot-a',
    approvalId: 'approval-a',
    jobId: 'job-a',
    siteId: 'site-a',
    jurisdiction: 'NSW',
    sourceInspectionId: 'inspection-a',
    sourceInspectionRevision: 3,
    sourceEvidenceVersion: 7,
    approvedByUserId: 'reviewer-a',
    approvedAt: new Date(NOW.getTime()),
    sourceIdentitySha256: document.sourceIdentitySha256,
    documentJson: JSON.stringify(document),
    document,
    sha256: SNAPSHOT_SHA256,
    ...overrides,
  };
}

function generationRecord(overrides = {}) {
  return {
    companyId: 'company-a',
    generationId: 'generation-a',
    idempotencyKey: 'c'.repeat(64),
    reportId: 'report-a',
    reportRevisionId: 'report-revision-a',
    snapshotId: 'snapshot-a',
    snapshotSha256: SNAPSHOT_SHA256,
    jobId: 'job-a',
    sourceInspectionId: 'inspection-a',
    sourceInspectionRevision: 3,
    jurisdiction: 'NSW',
    templateVersion: REPORT_TEMPLATE_VERSION,
    createdByUserId: 'reviewer-a',
    reviewedByUserId: 'reviewer-a',
    requestedAt: new Date(NOW.getTime()),
    status: 'queued',
    revisionNumber: null,
    attemptCount: 0,
    lastFailureCode: null,
    completedAt: null,
    ...overrides,
  };
}

function enqueueInput(overrides = {}) {
  return {
    companyId: 'company-a',
    generationId: 'generation-new',
    idempotencyKey: 'd'.repeat(64),
    reportId: 'report-new',
    reportRevisionId: 'revision-new',
    snapshot: approvedSnapshot(),
    templateVersion: REPORT_TEMPLATE_VERSION,
    createdByUserId: 'reviewer-a',
    reviewedByUserId: 'reviewer-a',
    requestedAt: new Date(NOW.getTime()),
    ...overrides,
  };
}

function databaseGenerationRow(input, overrides = {}) {
  return {
    company_id: input.companyId,
    generation_id: input.generationId,
    generation_idempotency_key: input.idempotencyKey,
    report_id: 'report-a',
    report_revision_id: input.reportRevisionId,
    job_id: 'job-a',
    source_inspection_id: 'inspection-a',
    source_snapshot_id: 'snapshot-a',
    source_snapshot_sha256: SNAPSHOT_SHA256,
    jurisdiction: 'NSW',
    template_version: REPORT_TEMPLATE_VERSION,
    created_by_user_id: input.createdByUserId,
    reviewed_by_user_id: input.reviewedByUserId,
    requested_at: new Date(NOW.getTime()),
    status: 'queued',
    revision_number: null,
    attempt_count: 0,
    last_failure_code: null,
    completed_at: null,
    source_inspection_revision: 3,
    ...overrides,
  };
}

class EnqueueDatabase {
  constructor({ input, insertRowCount = 1, generationRow, auditError = null }) {
    this.input = input;
    this.insertRowCount = insertRowCount;
    this.generationRow = generationRow ?? databaseGenerationRow(input);
    this.auditError = auditError;
    this.queries = [];
    this.committedTransactions = 0;
    this.rolledBackTransactions = 0;
  }

  async transaction(work) {
    try {
      const result = await work({
        query: async (text, values) => {
          this.queries.push({ text, values });
          if (text.includes("set_config('app.company_id'")) {
            return { rows: [], rowCount: 1 };
          }
          if (text.includes('FROM inspection_snapshots')) {
            return {
              rows: [
                {
                  inspection_id: 'inspection-a',
                  jurisdiction: 'NSW',
                  sha256: SNAPSHOT_SHA256,
                },
              ],
              rowCount: 1,
            };
          }
          if (text.includes('INSERT INTO reports')) {
            return { rows: [], rowCount: 1 };
          }
          if (text.includes('SELECT report_id FROM reports')) {
            return { rows: [{ report_id: 'report-a' }], rowCount: 1 };
          }
          if (text.includes('INSERT INTO report_generation_jobs')) {
            return { rows: [], rowCount: this.insertRowCount };
          }
          if (text.includes('FROM report_generation_jobs generation')) {
            return { rows: [this.generationRow], rowCount: 1 };
          }
          if (text.includes('INSERT INTO audit_events')) {
            if (this.auditError) throw this.auditError;
            return { rows: [], rowCount: 1 };
          }
          throw new Error(`unexpected SQL in enqueue test: ${text}`);
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

class ClaimDatabase {
  constructor(generationRow) {
    this.generationRow = generationRow;
    this.queries = [];
  }

  async transaction(work) {
    return work({
      query: async (text, values) => {
        this.queries.push({ text, values });
        if (text.includes("set_config('app.company_id'")) {
          return { rows: [], rowCount: 1 };
        }
        if (text.includes('FOR UPDATE OF generation')) {
          return { rows: [this.generationRow], rowCount: 1 };
        }
        if (text.includes('FROM jobs job')) {
          return {
            rows: [
              {
                workflow_status: 'approved_for_report_generation',
                latest_revision: 3,
              },
            ],
            rowCount: 1,
          };
        }
        if (text.includes('pg_advisory_xact_lock')) {
          return { rows: [], rowCount: 1 };
        }
        if (text.includes('SELECT GREATEST(')) {
          return { rows: [{ next_revision: 4 }], rowCount: 1 };
        }
        if (text.includes('UPDATE report_generation_jobs')) {
          return {
            rows: [
              {
                ...this.generationRow,
                status: 'processing',
                revision_number: values[2],
                attempt_count: 2,
                lease_token: values[3],
                lease_expires_at: values[4],
              },
            ],
            rowCount: 1,
          };
        }
        throw new Error(`unexpected SQL in claim test: ${text}`);
      },
    });
  }
}

class CompletionDatabase {
  constructor({ claim, artifact, latestRevision }) {
    this.claim = claim;
    this.artifact = artifact;
    this.latestRevision = latestRevision;
    this.queries = [];
    this.insertedRevision = undefined;
    this.returnedRevision = undefined;
  }

  async transaction(work) {
    return work({
      query: async (text, values) => {
        this.queries.push({ text, values });
        if (text.includes("set_config('app.company_id'")) {
          return { rows: [], rowCount: 1 };
        }
        if (text.includes('pg_advisory_xact_lock')) {
          return { rows: [], rowCount: 1 };
        }
        if (text.includes('FOR UPDATE OF generation')) {
          return {
            rows: [
              {
                ...databaseGenerationRow(
                  {
                    ...enqueueInput(),
                    generationId: this.claim.generationId,
                    idempotencyKey: this.claim.idempotencyKey,
                    reportRevisionId: this.claim.reportRevisionId,
                    createdByUserId: this.claim.createdByUserId,
                    reviewedByUserId: this.claim.reviewedByUserId,
                  },
                  {
                    report_id: this.claim.reportId,
                    status: 'processing',
                    revision_number: this.claim.revisionNumber,
                    attempt_count: this.claim.attemptCount,
                  },
                ),
                lease_token: this.claim.leaseToken,
                lease_expires_at: new Date(NOW.getTime() + 180_000),
              },
            ],
            rowCount: 1,
          };
        }
        if (text.includes('FROM jobs job')) {
          return {
            rows: [
              {
                workflow_status: 'report_generated',
                latest_revision: this.claim.sourceInspectionRevision,
              },
            ],
            rowCount: 1,
          };
        }
        if (
          text.includes('FROM report_revisions revision') &&
          text.includes('generation_idempotency_key = $2')
        ) {
          return { rows: [], rowCount: 0 };
        }
        if (text.includes('INSERT INTO object_references')) {
          return { rows: [], rowCount: 1 };
        }
        if (text.includes('FROM object_references')) {
          return {
            rows: [
              {
                object_id: this.artifact.objectId,
                content_type: 'application/pdf',
                byte_size: this.artifact.byteSize,
                sha256: this.artifact.sha256,
              },
            ],
            rowCount: 1,
          };
        }
        if (text.includes('SELECT MAX(revision_number) AS latest_revision')) {
          return {
            rows: [{ latest_revision: this.latestRevision }],
            rowCount: 1,
          };
        }
        if (text.includes('UPDATE report_revisions')) {
          return { rows: [], rowCount: 0 };
        }
        if (text.includes('INSERT INTO report_revisions')) {
          this.insertedRevision = { text, values };
          return { rows: [], rowCount: 1 };
        }
        if (text.includes('UPDATE jobs')) {
          return { rows: [{ job_id: this.claim.jobId }], rowCount: 1 };
        }
        if (text.includes('INSERT INTO audit_events')) {
          return { rows: [], rowCount: 1 };
        }
        if (text.includes('UPDATE report_generation_jobs')) {
          return { rows: [], rowCount: 1 };
        }
        if (
          text.includes('FROM report_revisions revision') &&
          text.includes('report_revision_id = $2')
        ) {
          return {
            rows: [this.returnedRevision],
            rowCount: 1,
          };
        }
        throw new Error(`unexpected SQL in completion test: ${text}`);
      },
    });
  }
}

class MemoryObjectStore {
  constructor() {
    this.objects = new Map();
    this.puts = [];
  }

  async putIfAbsent(objectKey, bytes, expectedSha256) {
    const actualSha256 = createHash('sha256').update(bytes).digest('hex');
    assert.equal(actualSha256, expectedSha256);
    this.puts.push({ objectKey, sha256: actualSha256 });
    const existing = this.objects.get(objectKey);
    if (existing) {
      if (existing.sha256 !== actualSha256) {
        throw new Error('report object key already contains different bytes');
      }
      return;
    }
    this.objects.set(objectKey, {
      bytes: Buffer.from(bytes),
      sha256: actualSha256,
    });
  }

  async read(objectKey) {
    const object = this.objects.get(objectKey);
    return object ? Buffer.from(object.bytes) : undefined;
  }
}

test('report request idempotency is scoped to the approved snapshot and template', async () => {
  const snapshot = approvedSnapshot();
  const rows = new Map();
  const enqueued = [];
  const service = new ReportGenerationService({
    snapshots: {
      async get(_principal, snapshotId) {
        assert.equal(snapshotId, snapshot.snapshotId);
        return snapshot;
      },
    },
    store: {
      async enqueue(input) {
        enqueued.push(input);
        const existing = rows.get(input.idempotencyKey);
        if (existing) return existing;
        const created = generationRecord({
          generationId: input.generationId,
          reportRevisionId: input.reportRevisionId,
          idempotencyKey: input.idempotencyKey,
          requestedAt: input.requestedAt,
        });
        rows.set(input.idempotencyKey, created);
        return created;
      },
    },
    objects: new MemoryObjectStore(),
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });

  const first = await service.request(principal(), snapshot.snapshotId);
  const replay = await service.request(principal(), snapshot.snapshotId);

  assert.equal(enqueued[0].templateVersion, REPORT_TEMPLATE_VERSION);
  assert.equal(enqueued[0].idempotencyKey, enqueued[1].idempotencyKey);
  assert.equal(first.generationId, replay.generationId);
  assert.equal(first.reportRevisionId, replay.reportRevisionId);
});

test('report requests are limited to office reviewers and administrators', async () => {
  const service = new ReportGenerationService({
    snapshots: {
      async get() {
        return approvedSnapshot();
      },
    },
    store: {
      async enqueue() {
        throw new Error('must not enqueue');
      },
    },
    objects: new MemoryObjectStore(),
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });

  await assert.rejects(
    service.request(principal('company-a', 'inspector'), 'snapshot-a'),
    (error) =>
      error instanceof ReportGenerationFailure &&
      error.code === 'ROLE_FORBIDDEN',
  );
});

test('report generation list is limited to office reviewers and administrators', async () => {
  const service = new ReportGenerationService({
    snapshots: {
      async get() {
        return approvedSnapshot();
      },
    },
    store: {
      async listGenerations() {
        throw new Error('must not list generations');
      },
    },
    objects: new MemoryObjectStore(),
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });

  await assert.rejects(
    service.listGenerations(principal('company-a', 'inspector')),
    (error) =>
      error instanceof ReportGenerationFailure &&
      error.code === 'ROLE_FORBIDDEN',
  );
});

test('report generation list validates the optional job filter', async () => {
  const listCalls = [];
  const service = new ReportGenerationService({
    snapshots: {
      async get() {
        return approvedSnapshot();
      },
    },
    store: {
      async listGenerations(companyId, filter) {
        listCalls.push({ companyId, filter });
        return [];
      },
    },
    objects: new MemoryObjectStore(),
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });

  await assert.rejects(
    service.listGenerations(principal(), '   '),
    (error) =>
      error instanceof ReportGenerationFailure &&
      error.code === 'INVALID_INPUT',
  );
  await assert.rejects(
    service.listGenerations(principal(), 'j'.repeat(129)),
    (error) =>
      error instanceof ReportGenerationFailure &&
      error.code === 'INVALID_INPUT',
  );
  assert.equal(listCalls.length, 0);

  await service.listGenerations(principal(), undefined);
  await service.listGenerations(principal(), null);
  await service.listGenerations(principal(), 'job-a');

  assert.deepEqual(
    listCalls.map(({ companyId, filter }) => ({ companyId, filter })),
    [
      { companyId: 'company-a', filter: { jobId: null } },
      { companyId: 'company-a', filter: { jobId: null } },
      { companyId: 'company-a', filter: { jobId: 'job-a' } },
    ],
  );
});

test('report generation list is company-scoped and copied before returning', async () => {
  const stored = [
    generationRecord(),
    generationRecord({
      generationId: 'generation-other-company',
      companyId: 'company-b',
      status: 'completed',
      revisionNumber: 1,
      completedAt: new Date(NOW.getTime()),
    }),
    generationRecord({
      generationId: 'generation-completed',
      status: 'superseded',
      revisionNumber: 1,
      completedAt: new Date(NOW.getTime()),
    }),
  ];
  const service = new ReportGenerationService({
    snapshots: {
      async get() {
        return approvedSnapshot();
      },
    },
    store: {
      async listGenerations() {
        return stored;
      },
    },
    objects: new MemoryObjectStore(),
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });

  const generations = await service.listGenerations(principal(), 'job-a');

  assert.deepEqual(
    generations.map((generation) => generation.generationId),
    ['generation-a', 'generation-completed'],
  );
  assert.notEqual(generations[0], stored[0]);
  assert.notEqual(generations[0].requestedAt, stored[0].requestedAt);
  assert.equal(
    generations[0].requestedAt.getTime(),
    stored[0].requestedAt.getTime(),
  );
});

test('report controller authenticates and serializes the generation list', async () => {
  const authenticated = [];
  const controller = new ReportGenerationController(
    {
      authenticateSession(companyId, token) {
        authenticated.push({ companyId, token });
        return principal(companyId);
      },
    },
    {
      async listGenerations(tenantPrincipal, jobId) {
        assert.equal(tenantPrincipal.companyId, 'company-a');
        return [generationRecord({ jobId })];
      },
    },
  );

  const filtered = await controller.listGenerations(
    'Bearer opaque-session',
    'company-a',
    'job-a',
  );
  const unfiltered = await controller.listGenerations(
    'Bearer opaque-session',
    'company-a',
    undefined,
  );

  assert.deepEqual(authenticated, [
    { companyId: 'company-a', token: 'opaque-session' },
    { companyId: 'company-a', token: 'opaque-session' },
  ]);
  assert.deepEqual(
    filtered.map((generation) => ({
      generationId: generation.generationId,
      jobId: generation.jobId,
      status: generation.status,
    })),
    [{ generationId: 'generation-a', jobId: 'job-a', status: 'queued' }],
  );
  assert.equal(unfiltered.length, 1);
  assert.equal(unfiltered[0].jobId, undefined);
  assert.equal(unfiltered[0].requestedAt, NOW.toISOString());
});

test('report controller authenticates and serializes the queued generation', async () => {
  const authenticated = [];
  const record = generationRecord();
  const controller = new ReportGenerationController(
    {
      authenticateSession(companyId, token) {
        authenticated.push({ companyId, token });
        return principal(companyId);
      },
    },
    {
      async request(tenantPrincipal, snapshotId) {
        assert.equal(tenantPrincipal.companyId, 'company-a');
        assert.equal(snapshotId, 'snapshot-a');
        return record;
      },
    },
  );

  const response = await controller.requestGeneration(
    'Bearer opaque-session',
    'company-a',
    { snapshotId: 'snapshot-a' },
  );

  assert.deepEqual(authenticated, [
    { companyId: 'company-a', token: 'opaque-session' },
  ]);
  assert.equal(response.generationId, record.generationId);
  assert.equal(response.status, 'queued');
  assert.equal(response.requestedAt, NOW.toISOString());
});

test('PostgreSQL enqueue writes one append-only request audit event and skips it on replay', async () => {
  const input = enqueueInput();
  const database = new EnqueueDatabase({ input, insertRowCount: 1 });
  const store = new PostgresReportGenerationStore(database);

  const created = await store.enqueue(input);

  const auditInsert = database.queries.find(({ text }) =>
    text.includes('INSERT INTO audit_events'),
  );
  assert.ok(auditInsert);
  assert.equal(auditInsert.values[0], 'company-a');
  assert.equal(auditInsert.values[2], 'reviewer-a');
  assert.match(auditInsert.text, /'report\.generation_requested'/);
  assert.match(auditInsert.text, /'report_generation'/);
  assert.equal(auditInsert.values[3], 'generation-new');
  assert.equal(JSON.parse(auditInsert.values[4]).snapshotId, 'snapshot-a');
  assert.equal(created.generationId, 'generation-new');
  assert.equal(database.committedTransactions, 1);

  const replayDatabase = new EnqueueDatabase({
    input: { ...input, generationId: 'generation-retry' },
    insertRowCount: 0,
    generationRow: databaseGenerationRow(input, {
      generation_id: 'generation-original',
      report_revision_id: 'revision-original',
    }),
  });
  const replay = await new PostgresReportGenerationStore(
    replayDatabase,
  ).enqueue({
    ...input,
    generationId: 'generation-retry',
    reportRevisionId: 'revision-retry',
  });

  assert.equal(replay.generationId, 'generation-original');
  assert.equal(
    replayDatabase.queries.some(({ text }) =>
      text.includes('INSERT INTO audit_events'),
    ),
    false,
  );
});

test('claim serializes report revision reservation and counts queued retry reservations', async () => {
  const input = enqueueInput();
  const generationRow = databaseGenerationRow(input, {
    status: 'queued',
    attempt_count: 1,
  });
  const database = new ClaimDatabase(generationRow);
  const claim = await new PostgresReportGenerationStore(database).claimNext(
    'company-a',
    NOW,
    'lease-next',
    180_000,
  );

  assert.equal(claim.revisionNumber, 4);
  assert.equal(claim.leaseToken, 'lease-next');
  const reservationLock = database.queries.find(({ text }) =>
    text.includes('report_revision'),
  );
  assert.ok(reservationLock);
  const reservationQuery = database.queries.find(({ text }) =>
    text.includes('SELECT GREATEST('),
  );
  assert.match(reservationQuery.text, /status IN \('queued', 'processing'\)/);
  assert.match(reservationQuery.text, /revision_number IS NOT NULL/);
});

test('late lower report revisions are retained as superseded', async () => {
  const claim = {
    ...generationRecord({
      status: 'processing',
      revisionNumber: 1,
      attemptCount: 2,
    }),
    leaseToken: 'lease-current',
  };
  const bytes = Buffer.from('%PDF-1.7\nfictional report\n');
  const artifact = {
    objectId: 'report-object-late',
    objectKey: 'company-a/reports/report-revision-a.pdf',
    sha256: createHash('sha256').update(bytes).digest('hex'),
    byteSize: bytes.byteLength,
  };
  const database = new CompletionDatabase({
    claim,
    artifact,
    latestRevision: 2,
  });
  database.returnedRevision = {
    company_id: claim.companyId,
    report_revision_id: claim.reportRevisionId,
    report_id: claim.reportId,
    job_id: claim.jobId,
    source_inspection_id: claim.sourceInspectionId,
    source_inspection_revision: claim.sourceInspectionRevision,
    source_snapshot_id: claim.snapshotId,
    jurisdiction: claim.jurisdiction,
    revision_number: claim.revisionNumber,
    template_version: claim.templateVersion,
    generation_idempotency_key: claim.idempotencyKey,
    object_id: artifact.objectId,
    object_key: artifact.objectKey,
    sha256: artifact.sha256,
    byte_size: artifact.byteSize,
    created_by_user_id: claim.createdByUserId,
    reviewed_by_user_id: claim.reviewedByUserId,
    created_at: NOW,
    superseded_at: NOW,
  };

  const revision = await new PostgresReportGenerationStore(database).complete(
    claim,
    artifact,
    NOW,
  );

  assert.equal(revision.supersededAt.toISOString(), NOW.toISOString());
  const completionSelect = database.queries.find(({ text }) =>
    text.includes('FOR UPDATE OF generation'),
  );
  // The adapter reads lease_expires_at to validate the lease, so the query
  // must actually select it; the fake database cannot hide the omission.
  assert.match(completionSelect.text, /lease_expires_at/);
  assert.match(database.insertedRevision.text, /created_at, superseded_at/);
  assert.equal(
    database.insertedRevision.values[15].toISOString(),
    NOW.toISOString(),
  );
  const auditInsert = database.queries.find(({ text }) =>
    text.includes('report.revision_generated'),
  );
  assert.equal(
    JSON.parse(auditInsert.values[4]).supersededAt,
    NOW.toISOString(),
  );
});

test('retry scheduling casts the retry timestamp so the failure update can run', async () => {
  const claim = {
    ...generationRecord({
      status: 'processing',
      revisionNumber: 1,
      attemptCount: 1,
    }),
    leaseToken: 'lease-fail',
  };
  const queries = [];
  const database = {
    async transaction(work) {
      return work({
        query: async (text, values) => {
          queries.push({ text, values });
          return { rows: [], rowCount: 1 };
        },
      });
    },
  };
  await new PostgresReportGenerationStore(database).fail(
    claim,
    'RENDERER_UNAVAILABLE',
    true,
    NOW,
  );
  const failureUpdate = queries.find(({ text }) =>
    text.includes('UPDATE report_generation_jobs'),
  );
  // An untyped $3 in `$3 + interval` makes Postgres infer an interval and
  // reject the CASE, which previously wedged the job in `processing`.
  assert.match(failureUpdate.text, /\$3::timestamptz/);
});

test('PostgreSQL generation list is tenant-scoped, job-filterable and newest first', async () => {
  const queries = [];
  const listRow = databaseGenerationRow(enqueueInput(), {
    status: 'completed',
    revision_number: 2,
    completed_at: NOW,
  });
  const database = {
    async transaction(work) {
      return work({
        query: async (text, values) => {
          queries.push({ text, values });
          if (text.includes("set_config('app.company_id'")) {
            return { rows: [], rowCount: 1 };
          }
          if (text.includes('FROM report_generation_jobs generation')) {
            return { rows: [listRow], rowCount: 1 };
          }
          throw new Error(`unexpected SQL in list test: ${text}`);
        },
      });
    },
  };
  const store = new PostgresReportGenerationStore(database);

  const filtered = await store.listGenerations('company-a', {
    jobId: 'job-a',
  });
  const unfiltered = await store.listGenerations('company-a', { jobId: null });

  const listQueries = queries.filter(({ text }) =>
    text.includes('FROM report_generation_jobs generation'),
  );
  assert.equal(listQueries.length, 2);
  for (const query of listQueries) {
    assert.match(query.text, /generation\.company_id = \$1/);
    assert.match(
      query.text,
      /\(\$2::text IS NULL OR generation\.job_id = \$2\)/,
    );
    assert.match(
      query.text,
      /ORDER BY generation\.requested_at DESC, generation\.generation_id DESC/,
    );
  }
  assert.deepEqual(listQueries[0].values, ['company-a', 'job-a']);
  assert.deepEqual(listQueries[1].values, ['company-a', null]);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].generationId, 'generation-new');
  assert.equal(filtered[0].status, 'completed');
  assert.equal(filtered[0].revisionNumber, 2);
  assert.deepEqual(unfiltered, filtered);
});

test('PostgreSQL generation list rejects rows that cross company scope', async () => {
  const database = {
    async transaction(work) {
      return work({
        query: async (text, values) => {
          if (text.includes("set_config('app.company_id'")) {
            return { rows: [], rowCount: 1 };
          }
          if (text.includes('FROM report_generation_jobs generation')) {
            return {
              rows: [
                databaseGenerationRow(enqueueInput(), {
                  company_id: 'company-b',
                }),
              ],
              rowCount: 1,
            };
          }
          throw new Error(`unexpected SQL in list test: ${text}`);
        },
      });
    },
  };

  await assert.rejects(
    new PostgresReportGenerationStore(database).listGenerations('company-a', {
      jobId: null,
    }),
    (error) =>
      error instanceof ReportGenerationFailure &&
      error.code === 'PERSISTENCE_UNAVAILABLE' &&
      /crossed company scope/.test(error.message),
  );
});

test('unconfigured report persistence rejects the generation list', async () => {
  // The fail-closed adapter surfaces unavailability on the first call; the
  // assertion accepts either a synchronous throw or a rejected promise.
  let unavailable;
  try {
    await new UnconfiguredReportGenerationStore().listGenerations('company-a', {
      jobId: null,
    });
  } catch (error) {
    unavailable = error;
  }

  assert.ok(
    unavailable instanceof ReportGenerationFailure &&
      unavailable.code === 'PERSISTENCE_UNAVAILABLE',
  );
});

test('report request audit failure rolls back enqueue', async () => {
  const database = new EnqueueDatabase({
    input: enqueueInput(),
    auditError: new Error('audit database unavailable'),
  });

  await assert.rejects(
    new PostgresReportGenerationStore(database).enqueue(enqueueInput()),
    (error) =>
      error instanceof ReportGenerationFailure &&
      error.code === 'PERSISTENCE_UNAVAILABLE',
  );
  assert.equal(database.rolledBackTransactions, 1);
  assert.equal(database.committedTransactions, 0);
});

test('worker retries the same immutable artifact after completion persistence fails', async () => {
  const snapshot = approvedSnapshot();
  const generation = generationRecord({
    status: 'processing',
    revisionNumber: 1,
    attemptCount: 1,
  });
  const claims = [];
  const failures = [];
  let completionAttempts = 0;
  const store = {
    async claimNext(companyId, _now, leaseToken, leaseDurationMs) {
      assert.equal(companyId, 'company-a');
      assert.ok(leaseDurationMs >= 60_000);
      const claim = { ...generation, leaseToken };
      claims.push(claim);
      return claim;
    },
    async complete(_claim, _artifact, _completedAt) {
      completionAttempts += 1;
      if (completionAttempts === 1) {
        throw new ReportGenerationFailure(
          'PERSISTENCE_UNAVAILABLE',
          'temporary transaction failure',
        );
      }
      return { reportRevisionId: generation.reportRevisionId };
    },
    async fail(claim, failureCode, retryable, at) {
      failures.push({ claim, failureCode, retryable, at });
    },
  };
  const objects = new MemoryObjectStore();
  const renderedInputs = [];
  const renderer = {
    async render(input) {
      renderedInputs.push(input);
      return Buffer.from('%PDF-1.7\nfixed deterministic bytes\n');
    },
  };
  const worker = new ReportGenerationWorker({
    store,
    snapshots: {
      async findById(companyId, snapshotId) {
        assert.equal(companyId, 'company-a');
        assert.equal(snapshotId, 'snapshot-a');
        return snapshot;
      },
    },
    photoReader: {
      async read() {
        return undefined;
      },
    },
    objects,
    renderer,
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });

  assert.equal(await worker.runOnce('company-a'), 'retry_scheduled');
  assert.equal(await worker.runOnce('company-a'), 'completed');
  assert.equal(failures.length, 1);
  assert.equal(failures[0].failureCode, 'PERSISTENCE_UNAVAILABLE');
  assert.equal(failures[0].retryable, true);
  assert.equal(renderedInputs.length, 2);
  assert.ok(
    Number.isFinite(renderedInputs[0].renderDeadline.deadlineAtMonotonicMs),
  );
  assert.equal(renderedInputs[0].generationAt, renderedInputs[1].generationAt);
  assert.deepEqual(renderedInputs[0].document, renderedInputs[1].document);
  assert.equal(objects.puts.length, 2);
  assert.equal(objects.puts[0].sha256, objects.puts[1].sha256);
});

test('worker shares one render deadline across snapshot and photo preparation', async () => {
  const snapshot = approvedSnapshot();
  const photoBytes = Buffer.from('fictional photograph');
  const photoChecksum = createHash('sha256').update(photoBytes).digest('hex');
  const photo = (localId) => ({
    localId,
    storageReference: `company-a/photos/${localId}.jpg`,
    capturedAtEpochMillis: 1_759_680_000_000,
    checksum: photoChecksum,
    contentType: 'image/jpeg',
    byteSize: photoBytes.byteLength,
  });
  snapshot.document.inspectionSubmission.anchorInspections = [
    { photos: [photo('photo-a'), photo('photo-b')] },
  ];
  const generation = generationRecord({
    status: 'processing',
    revisionNumber: 1,
    attemptCount: 1,
  });
  const failures = [];
  const reads = [];
  let rendererCalled = false;
  const worker = new ReportGenerationWorker({
    store: {
      async claimNext(_companyId, _now, leaseToken) {
        return { ...generation, leaseToken };
      },
      async fail(claim, failureCode, retryable, at) {
        failures.push({ claim, failureCode, retryable, at });
      },
    },
    snapshots: {
      async findById() {
        return snapshot;
      },
    },
    photoReader: {
      async read(objectKey) {
        reads.push(objectKey);
        await new Promise((resolve) => setTimeout(resolve, 55));
        return photoBytes;
      },
    },
    objects: new MemoryObjectStore(),
    renderer: {
      async render() {
        rendererCalled = true;
        return Buffer.from('%PDF-1.7\nfictional report\n');
      },
    },
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
    renderTimeoutMs: 80,
  });

  assert.equal(await worker.runOnce('company-a'), 'retry_scheduled');
  assert.equal(rendererCalled, false);
  assert.ok(reads.length >= 1);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].failureCode, 'RENDERER_UNAVAILABLE');
  assert.equal(failures[0].retryable, true);
  assert.equal(REPORT_RENDER_TIMEOUT_MS, 60_000);
});

test('render deadline aborts an in-flight operation and begins cancellation', async () => {
  const deadline = createReportRenderDeadline(20);
  let observedSignal;
  let cancellationStarted = false;

  await assert.rejects(
    withReportRenderDeadline(
      deadline,
      'stalled photo preparation',
      (signal) => {
        observedSignal = signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          });
        });
      },
      () => {
        cancellationStarted = true;
      },
    ),
    ReportRenderDeadlineExceededError,
  );

  assert.equal(observedSignal.aborted, true);
  assert.equal(cancellationStarted, true);
});

test('local private object storage is create-only and accepts identical retry bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'height-safety-report-'));
  try {
    const store = new LocalPrivateReportObjectStore(root);
    const objectKey = 'company-a/reports/revision-a.pdf';
    const bytes = Buffer.from('%PDF-1.7\nfictional report\n');
    const digest = createHash('sha256').update(bytes).digest('hex');

    await store.putIfAbsent(objectKey, bytes, digest);
    await store.putIfAbsent(objectKey, bytes, digest);

    const stored = await store.read(objectKey);
    assert.deepEqual(stored, bytes);
    assert.equal((await stat(join(root, objectKey))).mode & 0o777, 0o600);
    await assert.rejects(
      store.putIfAbsent(
        objectKey,
        Buffer.from('%PDF-1.7\ndifferent bytes\n'),
        createHash('sha256')
          .update('%PDF-1.7\ndifferent bytes\n')
          .digest('hex'),
      ),
      /already contains different bytes/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('local report object storage is limited to development and test environments', async () => {
  for (const environment of [{}, { NODE_ENV: 'staging' }]) {
    const store = reportArtifactObjectStoreFromEnvironment(environment);
    assert.ok(store instanceof UnconfiguredReportArtifactObjectStore);
    assert.ok(!(store instanceof LocalPrivateReportObjectStore));
    await assert.rejects(
      store.read('company-a/reports/report.pdf'),
      (error) =>
        error instanceof ReportGenerationFailure &&
        error.code === 'PERSISTENCE_UNAVAILABLE',
    );
  }

  assert.ok(
    reportArtifactObjectStoreFromEnvironment({
      NODE_ENV: 'development',
    }) instanceof LocalPrivateReportObjectStore,
  );
  assert.ok(
    reportArtifactObjectStoreFromEnvironment({ NODE_ENV: 'test' }) instanceof
      LocalPrivateReportObjectStore,
  );
  assert.throws(
    () =>
      reportArtifactObjectStoreFromEnvironment({
        NODE_ENV: 'production',
        HEIGHT_SAFETY_OBJECT_ROOT: '/tmp/report-objects',
      }),
    /durable private adapter/,
  );
});

test('report HTML is deterministic and retains draft-only wording', () => {
  const input = {
    document: approvedSnapshot().document,
    revisionNumber: 1,
    templateVersion: REPORT_TEMPLATE_VERSION,
    generationAt: NOW.toISOString(),
    photos: new Map(),
  };

  const first = buildReportHtml(input);
  const retry = buildReportHtml(input);

  assert.equal(first, retry);
  assert.match(first, /Prototype Draft Inspection Report/);
  assert.match(first, />DRAFT</);
  assert.match(first, /Jurisdiction is shown as recorded site context only/);
  assert.doesNotMatch(first, /\bcertified\b|\bcompliant\b|standards-approved/i);
});

test('report does not present an acknowledgement timestamp as inspection start', () => {
  const document = structuredClone(approvedSnapshot().document);
  document.reportContext.inspectionStartedAt =
    document.reportContext.inspectionSubmittedAt;

  const html = buildReportHtml({
    document,
    revisionNumber: 1,
    templateVersion: REPORT_TEMPLATE_VERSION,
    generationAt: NOW.toISOString(),
    photos: new Map(),
  });

  assert.match(html, /<strong>Inspection started:<\/strong> Not recorded/);
});

test('report object download is served as a private PDF attachment', async () => {
  const revision = {
    companyId: 'company-a',
    reportRevisionId: 'report-revision-a',
    reportId: 'report-a',
    jobId: 'job-a',
    sourceInspectionId: 'inspection-a',
    sourceInspectionRevision: 3,
    sourceSnapshotId: 'snapshot-a',
    jurisdiction: 'NSW',
    revisionNumber: 1,
    templateVersion: REPORT_TEMPLATE_VERSION,
    idempotencyKey: 'c'.repeat(64),
    objectId: 'report-object-a',
    objectKey: 'company-a/reports/report-revision-a.pdf',
    sha256: SNAPSHOT_SHA256,
    byteSize: 8,
    createdByUserId: 'reviewer-a',
    reviewedByUserId: 'reviewer-a',
    createdAt: new Date(NOW.getTime()),
    supersededAt: null,
  };
  const controller = new ReportGenerationController(
    {
      authenticateSession() {
        return principal();
      },
    },
    {
      async getFile() {
        return {
          bytes: Buffer.from('%PDF-1.7'),
          filename: 'draft-inspection-report-revision-a.pdf',
          revision,
        };
      },
    },
  );

  const file = await controller.downloadReport(
    'Bearer opaque-session',
    'company-a',
    'generation-a',
  );

  assert.ok(file instanceof StreamableFile);
  assert.equal(file.getHeaders().type, 'application/pdf');
  assert.match(file.getHeaders().disposition, /attachment/);
});

test('generated report download contract describes binary PDF bytes', async () => {
  const contract = JSON.parse(
    await readFile(
      new URL('../../../contracts/openapi/v1/openapi.json', import.meta.url),
      'utf8',
    ),
  );
  const response =
    contract.paths['/reports/generations/{generationId}/file'].get.responses[
      '200'
    ];

  assert.deepEqual(response.content['application/pdf'].schema, {
    format: 'binary',
    type: 'string',
  });

  const typescriptClient = await readFile(
    new URL(
      '../../../clients/typescript/src/apis/ReportsApi.ts',
      import.meta.url,
    ),
    'utf8',
  );
  const kotlinClient = await readFile(
    new URL(
      '../../../clients/kotlin/src/main/kotlin/au/com/heightsafety/api/apis/ReportsApi.kt',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(typescriptClient, /downloadDraftReport\([^\n]+Promise<Blob>/);
  assert.match(
    kotlinClient,
    /downloadDraftReport\([^\n]+Response<ResponseBody>/,
  );
  assert.doesNotMatch(
    typescriptClient,
    /downloadDraftReport\([^\n]+Promise<void>/,
  );
  assert.doesNotMatch(
    kotlinClient,
    /downloadDraftReport\([^\n]+Response<Unit>/,
  );
});

test('generated contract exposes the company-scoped generation list with an optional job filter', async () => {
  const contract = JSON.parse(
    await readFile(
      new URL('../../../contracts/openapi/v1/openapi.json', import.meta.url),
      'utf8',
    ),
  );
  const operation = contract.paths['/reports/generations'].get;

  assert.equal(operation.operationId, 'listDraftReportGenerations');
  const jobParameter = operation.parameters.find(
    (parameter) => parameter.in === 'query',
  );
  assert.deepEqual(jobParameter, {
    description: 'Limit the list to generations for one job',
    in: 'query',
    name: 'jobId',
    required: false,
    schema: { type: 'string' },
  });
  assert.deepEqual(operation.responses['200'].content, {
    'application/json': {
      schema: {
        items: { $ref: '#/components/schemas/ReportGenerationResponseDto' },
        type: 'array',
      },
    },
  });

  const typescriptClient = await readFile(
    new URL(
      '../../../clients/typescript/src/apis/ReportsApi.ts',
      import.meta.url,
    ),
    'utf8',
  );
  const kotlinClient = await readFile(
    new URL(
      '../../../clients/kotlin/src/main/kotlin/au/com/heightsafety/api/apis/ReportsApi.kt',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(
    typescriptClient,
    /listDraftReportGenerations\([^\n]+Promise<Array<ReportGenerationResponseDto>>/,
  );
  assert.match(
    kotlinClient,
    /listDraftReportGenerations\(@Header\("x-company-id"\) xCompanyId: kotlin\.String, @Query\("jobId"\) jobId: kotlin\.String\? = null\): Response<kotlin\.collections\.List<ReportGenerationResponseDto>>/,
  );
});
