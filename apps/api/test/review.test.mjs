import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { ReviewController } from '../dist/review/review.controller.js';
import { PostgresReviewStore } from '../dist/review/postgres-review-store.js';
import { PostgresSubmittedEvidenceReader } from '../dist/review/postgres-submitted-evidence-reader.js';
import { ReviewService } from '../dist/review/review-service.js';
import { InMemoryReviewStore } from '../dist/review/review-store.js';
import { ReviewFailure } from '../dist/review/review.types.js';

class FixedClock {
  now() {
    return new Date('2026-09-15T00:00:00.000Z');
  }
}

class FixedIdGenerator {
  constructor() {
    this.next = 1;
  }

  createId() {
    return `review-${this.next++}`;
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
    authenticatedAt: new Date('2026-09-15T00:00:00.000Z'),
    sessionExpiresAt: new Date('2026-09-16T00:00:00.000Z'),
  };
}

function makeService(
  store = new InMemoryReviewStore(),
  evidenceReader = { find: () => undefined },
  anchorHistoryReader = {
    listRecordedOutcomes: () => undefined,
    findPreviousRevision: () => undefined,
  },
) {
  return {
    store,
    service: new ReviewService({
      store,
      evidenceReader,
      anchorHistoryReader,
      clock: new FixedClock(),
      idGenerator: new FixedIdGenerator(),
    }),
  };
}

async function expectFailure(action, code) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof ReviewFailure);
    assert.equal(error.code, code);
    return true;
  });
}

const AUTHORIZATION = 'Bearer access-token';

test('creates review issues and records append-only actions without rewriting evidence', async () => {
  const { service, store } = makeService();
  const reviewer = principal('company-a');

  const issue = await service.createIssue(reviewer, {
    inspectionId: 'inspection-a',
    anchorInspectionId: 'anchor-inspection-a',
    issueType: 'change',
    reason: 'Add the missing location evidence before approval.',
  });

  assert.equal(issue.status, 'open');
  assert.equal(issue.reviewerUserId, 'reviewer-a');
  assert.equal(issue.anchorInspectionId, 'anchor-inspection-a');
  assert.equal(
    issue.reason,
    'Add the missing location evidence before approval.',
  );

  const actions = await service.listActions(reviewer, issue.reviewIssueId);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].action, 'changes_requested');
  assert.equal(actions[0].reason, issue.reason);
  assert.deepEqual(
    store.auditEvents.map((event) => event.action),
    ['review.changes_requested'],
  );

  const resolved = await service.resolveIssue(
    reviewer,
    issue.reviewIssueId,
    'The next inspection revision includes the recorded location.',
  );
  assert.equal(resolved.replayed, false);
  assert.equal(resolved.issue.status, 'resolved');
  assert.equal(resolved.issue.reason, issue.reason);
  assert.equal(
    resolved.issue.resolvedAt.toISOString(),
    '2026-09-15T00:00:00.000Z',
  );

  const replay = await service.resolveIssue(
    principal('company-a', 'administrator', 'admin-a'),
    issue.reviewIssueId,
    'Retry of the resolution request.',
  );
  assert.equal(replay.replayed, true);
  assert.equal(
    replay.issue.resolvedAt.toISOString(),
    '2026-09-15T00:00:00.000Z',
  );
  assert.equal(
    (await service.listActions(reviewer, issue.reviewIssueId)).length,
    2,
  );
  assert.deepEqual(
    store.auditEvents.map((event) => event.action),
    ['review.changes_requested', 'review.issue_resolved'],
  );
});

test('review access is role- and tenant-scoped', async () => {
  const { service } = makeService();
  await expectFailure(
    () =>
      service.createIssue(principal('company-a', 'inspector'), {
        inspectionId: 'inspection-a',
        issueType: 'warning',
        reason: 'Photo context is incomplete.',
      }),
    'ROLE_FORBIDDEN',
  );

  const issue = await service.createIssue(principal('company-a'), {
    inspectionId: 'inspection-a',
    issueType: 'warning',
    reason: 'Manufacturer is not recorded.',
  });
  assert.equal(
    (await service.listIssues(principal('company-b'), 'inspection-a')).length,
    0,
  );
  await expectFailure(
    () => service.listActions(principal('company-b'), issue.reviewIssueId),
    'NOT_FOUND',
  );
  await expectFailure(
    () => service.listActions(principal('company-a'), 'missing-issue'),
    'NOT_FOUND',
  );
});

test('invalid review input is rejected before persistence', async () => {
  const { service } = makeService();
  await expectFailure(
    () =>
      service.createIssue(principal('company-a'), {
        inspectionId: 'inspection-a',
        issueType: 'unsupported',
        reason: 'A reason',
      }),
    'INVALID_INPUT',
  );
  await expectFailure(
    () =>
      service.createIssue(principal('company-a'), {
        inspectionId: 'inspection-a',
        issueType: 'blocker',
        reason: '   ',
      }),
    'INVALID_INPUT',
  );
});

function controllerFixture() {
  const { service, store } = makeService();
  const authService = {
    authenticateSession(companyId, accessToken) {
      assert.equal(accessToken, 'access-token');
      return principal(companyId);
    },
  };
  return {
    store,
    service,
    controller: new ReviewController(authService, service),
  };
}

test('controller authenticates, serialises and maps review routes', async () => {
  const { controller } = controllerFixture();
  const created = await controller.createIssue(AUTHORIZATION, 'company-a', {
    inspectionId: 'inspection-a',
    issueType: 'blocker',
    reason: 'Required evidence has not synchronised.',
  });
  assert.equal(created.status, 'open');
  assert.equal(created.companyId, 'company-a');

  const listed = await controller.listIssues(
    AUTHORIZATION,
    'company-a',
    'inspection-a',
  );
  assert.equal(listed.length, 1);
  const actions = await controller.listActions(
    AUTHORIZATION,
    'company-a',
    created.reviewIssueId,
  );
  assert.equal(actions[0].action, 'issue_created');

  const resolved = await controller.resolveIssue(
    AUTHORIZATION,
    'company-a',
    created.reviewIssueId,
    { reason: 'Evidence is now synchronised and visible.' },
  );
  assert.equal(resolved.issue.status, 'resolved');
  assert.equal(resolved.replayed, false);

  await assert.rejects(
    () =>
      controller.createIssue(undefined, 'company-a', {
        inspectionId: 'inspection-a',
        issueType: 'warning',
        reason: 'Missing photo.',
      }),
    (error) => error instanceof UnauthorizedException,
  );
});

class FakeSqlDatabase {
  constructor({
    queryError = null,
    updateRowCount = 1,
    rows = [],
    inspectionRows = [{ job_id: 'job-a' }],
  } = {}) {
    this.queryError = queryError;
    this.updateRowCount = updateRowCount;
    this.rows = rows;
    this.inspectionRows = inspectionRows;
    this.queries = [];
  }

  async transaction(work) {
    return work({
      query: async (text, values) => {
        this.queries.push({ text, values });
        if (this.queryError && text.includes(this.queryError.when)) {
          throw this.queryError.error;
        }
        if (text.includes('UPDATE review_issues')) {
          return { rows: [], rowCount: this.updateRowCount };
        }
        if (
          text.includes('FROM inspections') ||
          text.includes('FROM review_issues issue')
        ) {
          return {
            rows: this.inspectionRows,
            rowCount: this.inspectionRows.length,
          };
        }
        return { rows: this.rows, rowCount: this.rows.length };
      },
    });
  }
}

function reviewIssueForSql(overrides = {}) {
  return {
    companyId: 'company-a',
    reviewIssueId: 'issue-a',
    inspectionId: 'inspection-a',
    anchorInspectionId: null,
    issueType: 'warning',
    status: 'open',
    reviewerUserId: 'reviewer-a',
    reason: 'Manufacturer is not recorded.',
    createdAt: new Date('2026-09-15T00:00:00.000Z'),
    resolvedAt: null,
    ...overrides,
  };
}

function reviewActionForSql(overrides = {}) {
  return {
    companyId: 'company-a',
    reviewActionId: 'action-a',
    reviewIssueId: 'issue-a',
    reviewerUserId: 'reviewer-a',
    action: 'issue_created',
    reason: 'Manufacturer is not recorded.',
    createdAt: new Date('2026-09-15T00:00:00.000Z'),
    ...overrides,
  };
}

function auditForSql(overrides = {}) {
  return {
    companyId: 'company-a',
    actorUserId: 'reviewer-a',
    action: 'review.issue_created',
    targetType: 'review_issue',
    targetId: 'issue-a',
    occurredAt: new Date('2026-09-15T00:00:00.000Z'),
    ...overrides,
  };
}

test('PostgreSQL review adapter binds tenant context and writes issue/action/audit together', async () => {
  const database = new FakeSqlDatabase();
  const store = new PostgresReviewStore(database);
  const issue = reviewIssueForSql();
  await store.createIssue(issue, reviewActionForSql(), auditForSql());

  assert.match(database.queries[0].text, /set_config\('app\.company_id'/);
  assert.equal(database.queries[0].values[0], 'company-a');
  assert.match(
    database.queries[1].text,
    /SELECT job_id[\s\S]*FROM inspections/,
  );
  assert.match(database.queries[2].text, /pg_advisory_xact_lock/);
  assert.deepEqual(database.queries[2].values, [
    'company-a',
    'inspection_submission',
    'job-a',
  ]);
  assert.match(database.queries[3].text, /INSERT INTO review_issues/);
  assert.match(database.queries[4].text, /INSERT INTO review_actions/);
  assert.match(database.queries[5].text, /INSERT INTO audit_events/);

  const resolved = await store.resolveIssue(
    reviewIssueForSql({ resolvedAt: new Date('2026-09-15T01:00:00.000Z') }),
    reviewActionForSql({
      reviewActionId: 'action-b',
      action: 'resolved',
      reason: 'Disposition recorded.',
      createdAt: new Date('2026-09-15T01:00:00.000Z'),
    }),
    auditForSql({
      action: 'review.issue_resolved',
      occurredAt: new Date('2026-09-15T01:00:00.000Z'),
    }),
  );
  assert.equal(resolved, true);
  assert.match(database.queries[6].text, /set_config\('app\.company_id'/);
  assert.match(database.queries[7].text, /FROM review_issues issue/);
  assert.match(database.queries[8].text, /pg_advisory_xact_lock/);
  assert.deepEqual(database.queries[8].values, [
    'company-a',
    'inspection_submission',
    'job-a',
  ]);
  assert.match(database.queries[9].text, /UPDATE review_issues/);
  assert.match(database.queries[10].text, /INSERT INTO review_actions/);
  assert.match(database.queries[11].text, /INSERT INTO audit_events/);
});

test('PostgreSQL change requests move the job workflow pointer without mutating the submitted inspection', async () => {
  const database = new FakeSqlDatabase();
  const store = new PostgresReviewStore(database);
  await store.createIssue(
    reviewIssueForSql({ issueType: 'change' }),
    reviewActionForSql({ action: 'changes_requested' }),
    auditForSql({ action: 'review.changes_requested' }),
  );

  assert.match(database.queries[6].text, /UPDATE jobs/);
  assert.match(
    database.queries[6].text,
    /workflow_status = 'changes_requested'/,
  );
  assert.deepEqual(database.queries[6].values, [
    'company-a',
    'inspection-a',
    new Date('2026-09-15T00:00:00.000Z'),
  ]);
  assert.match(database.queries[6].text, /FROM inspections/);
  assert.doesNotMatch(database.queries[6].text, /UPDATE inspections/);
});

test('PostgreSQL review adapter exposes replay and persistence failure states', async () => {
  const replayDatabase = new FakeSqlDatabase({ updateRowCount: 0 });
  const replayStore = new PostgresReviewStore(replayDatabase);
  assert.equal(
    await replayStore.resolveIssue(
      reviewIssueForSql(),
      reviewActionForSql({ reviewActionId: 'action-b', action: 'resolved' }),
      auditForSql({ action: 'review.issue_resolved' }),
    ),
    false,
  );
  assert.equal(replayDatabase.queries.length, 4);

  const failureDatabase = new FakeSqlDatabase({
    queryError: {
      when: 'INSERT INTO review_actions',
      error: new Error('down'),
    },
  });
  await assert.rejects(
    () =>
      new PostgresReviewStore(failureDatabase).createIssue(
        reviewIssueForSql(),
        reviewActionForSql(),
        auditForSql(),
      ),
    (error) =>
      error instanceof ReviewFailure &&
      error.code === 'PERSISTENCE_UNAVAILABLE',
  );
});

test('controller maps review persistence and not-found failures', async () => {
  const unavailable = new ReviewController(
    {
      authenticateSession() {
        return principal('company-a');
      },
    },
    new ReviewService({
      store: {
        createIssue() {
          throw new ReviewFailure('PERSISTENCE_UNAVAILABLE', 'down');
        },
        getIssue() {
          return undefined;
        },
        listIssues() {
          return [];
        },
        listActions() {
          return [];
        },
        resolveIssue() {
          return false;
        },
      },
      evidenceReader: { find: () => undefined },
      anchorHistoryReader: {
        listRecordedOutcomes: () => undefined,
        findPreviousRevision: () => undefined,
      },
      clock: new FixedClock(),
      idGenerator: new FixedIdGenerator(),
    }),
  );
  await assert.rejects(
    () =>
      unavailable.createIssue(AUTHORIZATION, 'company-a', {
        inspectionId: 'inspection-a',
        issueType: 'warning',
        reason: 'Missing context.',
      }),
    (error) =>
      error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );

  const fixture = controllerFixture();
  await assert.rejects(
    () => fixture.controller.listActions(AUTHORIZATION, 'company-a', 'missing'),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  await assert.rejects(
    () =>
      fixture.controller.createIssue(AUTHORIZATION, 'company-a', {
        inspectionId: 'inspection-a',
        issueType: 'not-supported',
        reason: 'Invalid issue.',
      }),
    (error) =>
      error instanceof BadRequestException && error.getStatus() === 400,
  );
  const inspectorController = new ReviewController(
    {
      authenticateSession() {
        return principal('company-a', 'inspector', 'inspector-a');
      },
    },
    fixture.service,
  );
  await assert.rejects(
    () =>
      inspectorController.createIssue(AUTHORIZATION, 'company-a', {
        inspectionId: 'inspection-a',
        issueType: 'warning',
        reason: 'Valid reason.',
      }),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
});

function submittedEvidenceFixture(overrides = {}) {
  const base = {
    companyId: 'company-a',
    inspectionId: 'inspection-a',
    revisionNumber: 2,
    latestRevisionNumber: 2,
    workflowStatus: 'submitted',
    jobId: 'job-001',
    siteId: 'site-001',
    jurisdiction: 'NSW',
    jobPackVersion: 3,
    inspectorUserId: 'inspector-a',
    submittedAt: new Date('2026-09-15T00:00:00.000Z'),
    evidenceVersion: 4,
    evidenceSynchronised: false,
    pendingPhotoCount: 1,
    failedPhotoCount: 0,
    expectedAnchorCount: 3,
    accountedAnchorCount: 2,
    openBlockerCount: 1,
    openWarningCount: 1,
    openConflictCount: 0,
    openChangeRequestCount: 0,
    anchors: [
      {
        anchorInspectionId: 'anchor-inspection-a',
        expectedAnchorId: 'anchor-001',
        provisionalAnchorId: null,
        identityConfirmed: true,
        locationConfirmed: true,
        location: 'North roof',
        recordedOutcome: 'defective',
        exceptionReason: null,
        reconciliationProposal: null,
        reconciliationReferenceId: null,
        disposition: null,
        notes: 'Anchor plate is loose.',
        observations: 'Visible corrosion.',
        defectDescription: 'Base plate corrosion.',
        recommendation: 'Replace the base plate.',
        proofTestLoad: '10',
        proofTestHold: '180',
        proofTestResult: 'pass',
        proofTestEquipmentReference: 'rig-7',
        photos: [
          {
            photoId: 'photo-001',
            localId: 'photo-001',
            checksum: 'sha256-photo-001',
            capturedAt: '2026-09-14T23:00:00.000Z',
            uploadState: 'pending_upload',
          },
        ],
      },
    ],
    ...overrides,
  };
  return {
    record: base,
    reader: {
      find(companyId, inspectionId) {
        if (companyId !== 'company-a' || inspectionId !== 'inspection-a') {
          return undefined;
        }
        return base;
      },
    },
  };
}

test('office evidence read is role- and tenant-scoped and exposes derived counts', async () => {
  const { reader, record } = submittedEvidenceFixture();
  const { service } = makeService(new InMemoryReviewStore(), reader);

  const evidence = await service.getSubmittedEvidence(
    principal('company-a'),
    'inspection-a',
  );
  assert.equal(evidence.revisionNumber, 2);
  assert.equal(evidence.evidenceSynchronised, false);
  assert.equal(evidence.pendingPhotoCount, 1);
  assert.equal(evidence.accountedAnchorCount, 2);
  assert.equal(evidence.expectedAnchorCount, 3);
  assert.equal(evidence.openBlockerCount, 1);
  assert.equal(evidence.anchors[0].recordedOutcome, 'defective');
  assert.equal(evidence.anchors[0].photos[0].uploadState, 'pending_upload');

  const administrator = await service.getSubmittedEvidence(
    principal('company-a', 'administrator', 'admin-a'),
    'inspection-a',
  );
  assert.equal(administrator.inspectionId, 'inspection-a');

  await expectFailure(
    () =>
      service.getSubmittedEvidence(
        principal('company-a', 'inspector', 'inspector-a'),
        'inspection-a',
      ),
    'ROLE_FORBIDDEN',
  );
  await expectFailure(
    () => service.getSubmittedEvidence(principal('company-b'), 'inspection-a'),
    'NOT_FOUND',
  );
  await expectFailure(
    () => service.getSubmittedEvidence(principal('company-a'), 'missing'),
    'NOT_FOUND',
  );
  await expectFailure(
    () => service.getSubmittedEvidence(principal('company-a'), '   '),
    'INVALID_INPUT',
  );

  // The returned evidence is a defensive copy; mutating it never rewrites
  // recorded submissions.
  evidence.anchors[0].recordedOutcome = 'serviceable';
  evidence.anchors[0].photos.pop();
  evidence.submittedAt.setTime(0);
  assert.equal(record.anchors[0].recordedOutcome, 'defective');
  assert.equal(record.anchors[0].photos.length, 1);
  assert.equal(record.submittedAt.toISOString(), '2026-09-15T00:00:00.000Z');
});

test('controller serialises the submitted evidence read and maps failures', async () => {
  const { reader } = submittedEvidenceFixture();
  const { service } = makeService(new InMemoryReviewStore(), reader);
  const authenticated = [];
  const controller = new ReviewController(
    {
      authenticateSession(companyId, token) {
        authenticated.push({ companyId, token });
        return principal(companyId);
      },
    },
    service,
  );

  const response = await controller.getEvidence(
    AUTHORIZATION,
    'company-a',
    'inspection-a',
  );
  assert.deepEqual(authenticated, [
    { companyId: 'company-a', token: 'access-token' },
  ]);
  assert.equal(response.inspectionId, 'inspection-a');
  assert.equal(response.submittedAt, '2026-09-15T00:00:00.000Z');
  assert.equal(response.workflowStatus, 'submitted');
  assert.equal(response.anchors.length, 1);
  assert.equal(response.anchors[0].photos[0].photoId, 'photo-001');

  const inspectorController = new ReviewController(
    {
      authenticateSession() {
        return principal('company-a', 'inspector', 'inspector-a');
      },
    },
    service,
  );
  await assert.rejects(
    () =>
      inspectorController.getEvidence(
        AUTHORIZATION,
        'company-a',
        'inspection-a',
      ),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  await assert.rejects(
    () => controller.getEvidence(AUTHORIZATION, 'company-a', 'missing'),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  await assert.rejects(
    () => controller.getEvidence(undefined, 'company-a', 'inspection-a'),
    (error) => error instanceof UnauthorizedException,
  );

  const unavailable = new ReviewController(
    {
      authenticateSession() {
        return principal('company-a');
      },
    },
    new ReviewService({
      store: new InMemoryReviewStore(),
      evidenceReader: {
        find() {
          throw new ReviewFailure('PERSISTENCE_UNAVAILABLE', 'down');
        },
      },
      anchorHistoryReader: {
        listRecordedOutcomes: () => undefined,
        findPreviousRevision: () => undefined,
      },
      clock: new FixedClock(),
      idGenerator: new FixedIdGenerator(),
    }),
  );
  await assert.rejects(
    () => unavailable.getEvidence(AUTHORIZATION, 'company-a', 'inspection-a'),
    (error) =>
      error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );
});

function submittedRow(overrides = {}) {
  return {
    inspection_id: 'inspection-a',
    job_id: 'job-001',
    site_id: 'site-001',
    jurisdiction: 'NSW',
    revision_number: 2,
    inspector_user_id: 'inspector-a',
    inspection_workflow_status: 'submitted',
    submitted_at: new Date('2026-09-15T00:00:00.000Z'),
    job_pack_version: 3,
    ...overrides,
  };
}

function submittedPayload(overrides = {}) {
  return {
    companyId: 'company-a',
    jobId: 'job-001',
    siteId: 'site-001',
    jurisdiction: 'NSW',
    submissionId: 'inspection-a',
    jobPackVersion: 3,
    anchorInspections: [
      {
        inspectionId: 'anchor-inspection-a',
        expectedAnchorId: 'anchor-001',
        provisionalAnchorId: null,
        identityConfirmed: true,
        locationConfirmed: true,
        location: 'North roof',
        recordedOutcome: 'defective',
        exceptionReason: null,
        reconciliationProposal: null,
        reconciliationReferenceId: null,
        disposition: null,
        notes: 'Anchor plate is loose.',
        observations: 'Visible corrosion.',
        defectDescription: 'Base plate corrosion.',
        recommendation: 'Replace the base plate.',
        proofTestLoad: '10',
        proofTestHold: '180',
        proofTestResult: 'pass',
        proofTestEquipmentReference: 'rig-7',
        photos: [
          {
            localId: 'photo-001',
            storageReference: 'anchor-photos/photo-001.jpg',
            capturedAtEpochMillis: 1_757_875_200_000,
            checksum: 'sha256-photo-001',
            contentType: 'image/jpeg',
            byteSize: 2048,
          },
        ],
      },
      {
        inspectionId: 'anchor-inspection-b',
        expectedAnchorId: 'anchor-002',
        provisionalAnchorId: null,
        identityConfirmed: true,
        locationConfirmed: false,
        location: null,
        recordedOutcome: 'not_inspected',
        exceptionReason: 'inaccessible',
        reconciliationProposal: null,
        reconciliationReferenceId: null,
        disposition: null,
        notes: null,
        observations: null,
        defectDescription: null,
        recommendation: null,
        proofTestLoad: null,
        proofTestHold: null,
        proofTestResult: null,
        proofTestEquipmentReference: null,
        photos: [],
      },
    ],
    ...overrides,
  };
}

class EvidenceSqlDatabase {
  constructor({ rows = {}, payload = submittedPayload() } = {}) {
    this.queries = [];
    this.payload = payload;
    this.rows = rows;
  }

  async transaction(work) {
    return work({
      query: async (text, values) => {
        this.queries.push({ text, values });
        if (text.includes('FROM inspections i')) {
          return { rows: this.rows.inspection ?? [], rowCount: 1 };
        }
        if (text.includes('MAX(revision_number)')) {
          return { rows: this.rows.revision ?? [], rowCount: 1 };
        }
        if (text.includes('FROM review_issues')) {
          return { rows: this.rows.counts ?? [], rowCount: 1 };
        }
        if (text.includes('FROM sync_mutations')) {
          return { rows: this.rows.payload ?? [], rowCount: 1 };
        }
        if (text.includes('COUNT(*) FILTER')) {
          return { rows: this.rows.photoCounts ?? [], rowCount: 1 };
        }
        if (text.includes('FROM photos p')) {
          return { rows: this.rows.photos ?? [], rowCount: 1 };
        }
        if (text.includes('FROM job_pack_snapshots')) {
          return { rows: this.rows.pack ?? [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      },
    });
  }
}

function evidenceRows(overrides = {}) {
  return {
    inspection: [submittedRow(overrides.inspection ?? {})],
    revision: [{ latest_revision: 2 }],
    counts: [
      {
        open_blockers: 1,
        open_warnings: 2,
        open_conflicts: 1,
        open_changes: 0,
      },
    ],
    payload: [
      {
        entity_version: 4,
        request_body: JSON.stringify({
          payload: overrides.payload ?? submittedPayload(),
        }),
      },
    ],
    photoCounts: [
      {
        pending_photos: overrides.pendingPhotos ?? 1,
        failed_photos: overrides.failedPhotos ?? 0,
      },
    ],
    photos: [
      {
        photo_id: 'photo-001',
        local_id: 'photo-001',
        upload_state: 'pending_upload',
      },
    ],
    pack: [
      {
        job_id: 'job-001',
        job_pack_version: 3,
        site_id: 'site-001',
        jurisdiction: 'NSW',
        anchors_document: JSON.stringify([
          { anchorId: 'anchor-001' },
          { anchorId: 'anchor-002' },
          { anchorId: 'anchor-003' },
        ]),
      },
    ],
    ...overrides,
  };
}

test('PostgreSQL evidence reader is tenant-bound, read-only and derives recorded counts', async () => {
  const database = new EvidenceSqlDatabase({ rows: evidenceRows() });
  const reader = new PostgresSubmittedEvidenceReader(database);

  const evidence = await reader.find('company-a', 'inspection-a');

  assert.match(
    database.queries[0].text,
    /set_config\('app\.company_id', \$1, true\)/,
  );
  assert.deepEqual(database.queries[0].values, ['company-a']);
  for (const query of database.queries) {
    assert.doesNotMatch(
      query.text,
      /\b(INSERT|UPDATE|DELETE)\b/i,
      'evidence reader must stay read-only',
    );
  }
  assert.match(database.queries[1].text, /FROM inspections i/);
  assert.match(database.queries[1].text, /JOIN jobs j/);
  assert.match(database.queries[2].text, /MAX\(revision_number\)/);
  assert.match(database.queries[3].text, /FROM review_issues/);
  assert.match(database.queries[4].text, /FROM sync_mutations/);
  assert.match(database.queries[5].text, /FROM photos p/);

  assert.equal(evidence.inspectionId, 'inspection-a');
  assert.equal(evidence.revisionNumber, 2);
  assert.equal(evidence.latestRevisionNumber, 2);
  assert.equal(evidence.workflowStatus, 'submitted');
  assert.equal(evidence.jurisdiction, 'NSW');
  assert.equal(evidence.evidenceVersion, 4);
  assert.equal(evidence.evidenceSynchronised, false);
  assert.equal(evidence.pendingPhotoCount, 1);
  assert.equal(evidence.failedPhotoCount, 0);
  assert.equal(evidence.expectedAnchorCount, 3);
  assert.equal(evidence.accountedAnchorCount, 2);
  assert.equal(evidence.openBlockerCount, 1);
  assert.equal(evidence.openWarningCount, 2);
  assert.equal(evidence.openConflictCount, 1);
  assert.equal(evidence.openChangeRequestCount, 0);
  assert.equal(evidence.submittedAt.toISOString(), '2026-09-15T00:00:00.000Z');
  assert.equal(evidence.anchors.length, 2);
  assert.equal(evidence.anchors[0].recordedOutcome, 'defective');
  assert.equal(evidence.anchors[0].defectDescription, 'Base plate corrosion.');
  assert.equal(evidence.anchors[0].recommendation, 'Replace the base plate.');
  assert.equal(evidence.anchors[0].proofTestLoad, '10');
  assert.equal(evidence.anchors[0].photos[0].photoId, 'photo-001');
  assert.equal(evidence.anchors[0].photos[0].uploadState, 'pending_upload');
  assert.equal(evidence.anchors[0].photos[0].checksum, 'sha256-photo-001');
  assert.equal(
    evidence.anchors[0].photos[0].capturedAt,
    new Date(1_757_875_200_000).toISOString(),
  );
  assert.equal(evidence.anchors[1].recordedOutcome, 'not_inspected');
  assert.equal(evidence.anchors[1].exceptionReason, 'inaccessible');
});

test('PostgreSQL evidence reader fails closed on state it cannot reconcile', async () => {
  const missingPayload = new EvidenceSqlDatabase({
    rows: evidenceRows({ payload: [] }),
  });
  await expectFailure(
    () =>
      new PostgresSubmittedEvidenceReader(missingPayload).find(
        'company-a',
        'inspection-a',
      ),
    'PERSISTENCE_UNAVAILABLE',
  );

  const crossCompanyPayload = new EvidenceSqlDatabase({
    rows: evidenceRows({
      payload: submittedPayload({ companyId: 'company-b' }),
    }),
  });
  await expectFailure(
    () =>
      new PostgresSubmittedEvidenceReader(crossCompanyPayload).find(
        'company-a',
        'inspection-a',
      ),
    'PERSISTENCE_UNAVAILABLE',
  );

  const packMismatch = new EvidenceSqlDatabase({
    rows: evidenceRows({
      pack: [
        {
          job_id: 'job-001',
          job_pack_version: 9,
          site_id: 'site-001',
          jurisdiction: 'NSW',
          anchors_document: '[]',
        },
      ],
    }),
  });
  await expectFailure(
    () =>
      new PostgresSubmittedEvidenceReader(packMismatch).find(
        'company-a',
        'inspection-a',
      ),
    'PERSISTENCE_UNAVAILABLE',
  );

  const photoWithoutState = new EvidenceSqlDatabase({
    rows: evidenceRows({ photos: [] }),
  });
  await expectFailure(
    () =>
      new PostgresSubmittedEvidenceReader(photoWithoutState).find(
        'company-a',
        'inspection-a',
      ),
    'PERSISTENCE_UNAVAILABLE',
  );

  const notSubmitted = new EvidenceSqlDatabase({
    rows: evidenceRows({
      inspection: [
        submittedRow({
          inspection_workflow_status: 'working',
          submitted_at: null,
        }),
      ],
    }),
  });
  await expectFailure(
    () =>
      new PostgresSubmittedEvidenceReader(notSubmitted).find(
        'company-a',
        'inspection-a',
      ),
    'PERSISTENCE_UNAVAILABLE',
  );

  const unknownInspection = new EvidenceSqlDatabase({
    rows: evidenceRows({ inspection: [] }),
  });
  assert.equal(
    await new PostgresSubmittedEvidenceReader(unknownInspection).find(
      'company-a',
      'inspection-a',
    ),
    undefined,
  );

  await expectFailure(
    () =>
      new PostgresSubmittedEvidenceReader(new EvidenceSqlDatabase()).find(
        'bad company',
        'inspection-a',
      ),
    'INVALID_INPUT',
  );
});
