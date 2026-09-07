import assert from 'node:assert/strict';
import test from 'node:test';

import { ApprovedSnapshotService } from '../dist/approved-snapshot/approved-snapshot-service.js';
import { ApprovedSnapshotFailure } from '../dist/approved-snapshot/approved-snapshot.types.js';
import { InMemoryApprovedSnapshotStore } from '../dist/approved-snapshot/approved-snapshot-store.js';

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

function expectFailure(action, code) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof ApprovedSnapshotFailure);
    assert.equal(error.code, code);
    return true;
  });
}

test('freezes a tenant-scoped approved inspection revision with evidence references', () => {
  const { audit, service } = makeHarness();
  const result = service.create(principal('company-a'), source());

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

test('replaying one review approval returns the same immutable snapshot', () => {
  const { audit, service } = makeHarness();
  const first = service.create(principal('company-a'), source());
  const replay = service.create(principal('company-a'), source());

  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.snapshot, first.snapshot);
  assert.equal(audit.events.length, 1);

  expectFailure(
    () =>
      service.create(principal('company-a'), source({ inspectionRevision: 4 })),
    'CONFLICT',
  );
});

test('approval gates reject unsynchronised evidence, blockers and open changes', () => {
  const { service } = makeHarness();

  expectFailure(
    () =>
      service.create(
        principal('company-a'),
        source({ requiredEvidenceSynchronised: false }),
      ),
    'CONFLICT',
  );
  expectFailure(
    () =>
      service.create(
        principal('company-a'),
        source({ openHardBlockerCount: 1 }),
      ),
    'CONFLICT',
  );
  expectFailure(
    () =>
      service.create(
        principal('company-a'),
        source({ openChangeRequestCount: 1 }),
      ),
    'CONFLICT',
  );
  expectFailure(
    () =>
      service.create(
        principal('company-a'),
        source({ reviewStatus: 'under_review' }),
      ),
    'INVALID_INPUT',
  );
});

test('only office reviewers and administrators can approve or read snapshots', () => {
  const { service } = makeHarness();

  expectFailure(
    () => service.create(principal('company-a', 'inspector'), source()),
    'ROLE_FORBIDDEN',
  );
  const created = service.create(
    principal('company-a', 'administrator', 'admin-a'),
    source(),
  );
  assert.equal(
    service.get(
      principal('company-a', 'administrator', 'admin-a'),
      created.snapshot.snapshotId,
    ).approvedByUserId,
    'admin-a',
  );
  expectFailure(
    () =>
      service.get(
        principal('company-a', 'inspector'),
        created.snapshot.snapshotId,
      ),
    'ROLE_FORBIDDEN',
  );
});

test('tenant scope and source identity cannot be crossed or rewritten', () => {
  const { service } = makeHarness();
  const created = service.create(principal('company-a'), source());

  expectFailure(
    () => service.get(principal('company-b'), created.snapshot.snapshotId),
    'NOT_FOUND',
  );
  expectFailure(
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

test('stored evidence stays unchanged when source or returned values are mutated', () => {
  const { service } = makeHarness();
  const input = source();
  const created = service.create(principal('company-a'), input);
  input.submission.anchorInspections[0].photos[0].checksum = 'changed';
  created.snapshot.document.inspectionSubmission.anchorInspections[0].photos[0].checksum =
    'changed-again';

  const stored = service.get(
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

test('preserves Queensland as recorded site context without deriving a rule', () => {
  const { service } = makeHarness();
  const result = service.create(
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
