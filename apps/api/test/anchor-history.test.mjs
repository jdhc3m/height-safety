import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { ReviewController } from '../dist/review/review.controller.js';
import { PostgresAnchorHistoryReader } from '../dist/review/postgres-anchor-history-reader.js';
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

function recordedOutcomeFixture(overrides = {}) {
  const base = {
    companyId: 'company-a',
    anchorInspectionId: 'anchor-inspection-b',
    inspectionId: 'inspection-b',
    revisionNumber: 1,
    jobId: 'job-001',
    jobReference: 'JOB-2026-004',
    submittedAt: new Date('2026-08-15T00:00:00.000Z'),
    recordedOutcome: 'serviceable',
    exceptionReason: null,
    disposition: null,
    photos: [
      {
        photoId: 'photo-002',
        localId: 'photo-002',
        checksum: 'sha256-photo-002',
        capturedAt: '2026-08-14T23:00:00.000Z',
        uploadState: 'uploaded',
      },
    ],
    ...overrides,
  };
  return {
    record: base,
    reader: {
      listRecordedOutcomes(companyId, anchorId) {
        if (companyId !== 'company-a' || anchorId !== 'anchor-001') {
          return undefined;
        }
        return [base];
      },
      findPreviousRevision(companyId, anchorInspectionId) {
        if (
          companyId !== 'company-a' ||
          anchorInspectionId !== 'anchor-inspection-a'
        ) {
          return undefined;
        }
        return base;
      },
    },
  };
}

function makeService(reader) {
  return new ReviewService({
    store: new InMemoryReviewStore(),
    evidenceReader: { find: () => undefined },
    anchorHistoryReader: reader,
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });
}

async function expectFailure(action, code) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof ReviewFailure);
    assert.equal(error.code, code);
    return true;
  });
}

const AUTHORIZATION = 'Bearer access-token';

test('anchor recorded-outcome history is office-reviewer and administrator read-only', async () => {
  const { reader, record } = recordedOutcomeFixture();
  const service = makeService(reader);

  const officeOutcomes = await service.listAnchorRecordedOutcomes(
    principal('company-a'),
    'anchor-001',
  );
  assert.equal(officeOutcomes.length, 1);
  assert.equal(officeOutcomes[0].recordedOutcome, 'serviceable');
  assert.equal(officeOutcomes[0].jobReference, 'JOB-2026-004');
  assert.equal(officeOutcomes[0].photos[0].uploadState, 'uploaded');

  const administrator = await service.listAnchorRecordedOutcomes(
    principal('company-a', 'administrator', 'admin-a'),
    'anchor-001',
  );
  assert.equal(administrator[0].anchorInspectionId, 'anchor-inspection-b');

  const previous = await service.getPreviousAnchorRevision(
    principal('company-a'),
    'anchor-inspection-a',
  );
  assert.equal(previous.inspectionId, 'inspection-b');
  assert.equal(previous.revisionNumber, 1);

  await expectFailure(
    () =>
      service.listAnchorRecordedOutcomes(
        principal('company-a', 'inspector', 'inspector-a'),
        'anchor-001',
      ),
    'ROLE_FORBIDDEN',
  );
  await expectFailure(
    () =>
      service.getPreviousAnchorRevision(
        principal('company-a', 'inspector', 'inspector-a'),
        'anchor-inspection-a',
      ),
    'ROLE_FORBIDDEN',
  );

  // The returned entries are defensive copies; mutating them never rewrites
  // recorded submissions.
  officeOutcomes[0].recordedOutcome = 'defective';
  officeOutcomes[0].photos.pop();
  officeOutcomes[0].submittedAt.setTime(0);
  assert.equal(record.recordedOutcome, 'serviceable');
  assert.equal(record.photos.length, 1);
  assert.equal(record.submittedAt.toISOString(), '2026-08-15T00:00:00.000Z');
});

test('anchor history reads are tenant-scoped and reject invalid input', async () => {
  const { reader } = recordedOutcomeFixture();
  const service = makeService(reader);

  await expectFailure(
    () =>
      service.listAnchorRecordedOutcomes(principal('company-b'), 'anchor-001'),
    'NOT_FOUND',
  );
  await expectFailure(
    () =>
      service.getPreviousAnchorRevision(
        principal('company-b'),
        'anchor-inspection-a',
      ),
    'NOT_FOUND',
  );
  await expectFailure(
    () => service.listAnchorRecordedOutcomes(principal('company-a'), 'missing'),
    'NOT_FOUND',
  );
  await expectFailure(
    () =>
      service.getPreviousAnchorRevision(
        principal('company-a'),
        'anchor-inspection-missing',
      ),
    'NOT_FOUND',
  );
  await expectFailure(
    () => service.listAnchorRecordedOutcomes(principal('company-a'), '   '),
    'INVALID_INPUT',
  );
  await expectFailure(
    () => service.getPreviousAnchorRevision(principal('company-a'), '   '),
    'INVALID_INPUT',
  );

  const crossCompanyRecord = recordedOutcomeFixture({
    companyId: 'company-b',
  }).record;
  const crossCompanyService = makeService({
    listRecordedOutcomes: (companyId) =>
      companyId === 'company-a' ? [crossCompanyRecord] : undefined,
    findPreviousRevision: (companyId) =>
      companyId === 'company-a' ? crossCompanyRecord : undefined,
  });
  await expectFailure(
    () =>
      crossCompanyService.listAnchorRecordedOutcomes(
        principal('company-a'),
        'anchor-001',
      ),
    'NOT_FOUND',
  );
  await expectFailure(
    () =>
      crossCompanyService.getPreviousAnchorRevision(
        principal('company-a'),
        'anchor-inspection-a',
      ),
    'NOT_FOUND',
  );
});

function anchorRow() {
  return { anchor_id: 'anchor-001' };
}

function outcomeRow(overrides = {}) {
  return {
    anchor_inspection_id: 'anchor-inspection-a',
    inspection_id: 'inspection-a',
    revision_number: 2,
    job_id: 'job-001',
    job_reference: 'JOB-2026-004',
    submitted_at: new Date('2026-09-15T00:00:00.000Z'),
    recorded_outcome: 'defective',
    exception_reason: null,
    disposition: null,
    ...overrides,
  };
}

function photoRow(overrides = {}) {
  return {
    anchor_inspection_id: 'anchor-inspection-a',
    photo_id: 'photo-001',
    local_id: 'photo-001',
    sha256: 'sha256-photo-001',
    capture_time: new Date('2026-09-14T23:00:00.000Z'),
    upload_state: 'uploaded',
    ...overrides,
  };
}

function currentRow(overrides = {}) {
  return {
    anchor_id: 'anchor-001',
    inspection_workflow_status: 'submitted',
    submitted_at: new Date('2026-09-15T00:00:00.000Z'),
    revision_number: 2,
    inspection_id: 'inspection-a',
    ...overrides,
  };
}

class HistorySqlDatabase {
  constructor(handlers = []) {
    this.handlers = handlers;
    this.queries = [];
  }

  async transaction(work) {
    return work({
      query: async (text, values) => {
        this.queries.push({ text, values });
        for (const handler of this.handlers) {
          if (handler.match.test(text)) {
            return { rows: handler.rows, rowCount: handler.rows.length };
          }
        }
        return { rows: [], rowCount: 0 };
      },
    });
  }
}

function historyHandlers({ anchors, outcomes, photos, current, previous }) {
  return [
    { match: /FROM anchors/, rows: anchors ?? [anchorRow()] },
    {
      match: /anchor_inspection_id = \$2/,
      rows: current ?? [currentRow()],
    },
    {
      match: /< \(\$3, \$4, \$5, \$6\)/,
      rows: previous ?? [outcomeRow()],
    },
    {
      match: /FROM anchor_inspections ai/,
      rows: outcomes ?? [outcomeRow()],
    },
    { match: /FROM photos p/, rows: photos ?? [photoRow()] },
  ];
}

test('PostgreSQL anchor history reader is tenant-bound and read-only', async () => {
  const database = new HistorySqlDatabase(
    historyHandlers({
      outcomes: [
        outcomeRow(),
        outcomeRow({
          anchor_inspection_id: 'anchor-inspection-b',
          inspection_id: 'inspection-b',
          revision_number: 1,
          job_reference: 'JOB-2025-011',
          submitted_at: new Date('2026-08-15T00:00:00.000Z'),
          recorded_outcome: 'serviceable',
        }),
      ],
      photos: [
        photoRow({ anchor_inspection_id: 'anchor-inspection-b' }),
        photoRow(),
      ],
    }),
  );
  const reader = new PostgresAnchorHistoryReader(database);

  const outcomes = await reader.listRecordedOutcomes('company-a', 'anchor-001');

  assert.match(
    database.queries[0].text,
    /set_config\('app\.company_id', \$1, true\)/,
  );
  assert.deepEqual(database.queries[0].values, ['company-a']);
  for (const query of database.queries) {
    assert.doesNotMatch(
      query.text,
      /\b(INSERT|UPDATE|DELETE)\b/i,
      'anchor history reader must stay read-only',
    );
  }
  assert.match(database.queries[1].text, /FROM anchors/);
  assert.match(database.queries[2].text, /FROM anchor_inspections ai/);
  assert.match(database.queries[2].text, /workflow_status = 'submitted'/);
  assert.match(database.queries[3].text, /FROM photos p/);

  assert.equal(outcomes.length, 2);
  assert.deepEqual(outcomes[0], {
    companyId: 'company-a',
    anchorInspectionId: 'anchor-inspection-a',
    inspectionId: 'inspection-a',
    revisionNumber: 2,
    jobId: 'job-001',
    jobReference: 'JOB-2026-004',
    submittedAt: new Date('2026-09-15T00:00:00.000Z'),
    recordedOutcome: 'defective',
    exceptionReason: null,
    disposition: null,
    photos: [
      {
        photoId: 'photo-001',
        localId: 'photo-001',
        checksum: 'sha256-photo-001',
        capturedAt: '2026-09-14T23:00:00.000Z',
        uploadState: 'uploaded',
      },
    ],
  });
  assert.equal(outcomes[1].anchorInspectionId, 'anchor-inspection-b');
  assert.equal(outcomes[1].jobReference, 'JOB-2025-011');
  assert.equal(outcomes[1].recordedOutcome, 'serviceable');
});

test('PostgreSQL anchor history reader maps exception, disposition and multi-photo states', async () => {
  const database = new HistorySqlDatabase(
    historyHandlers({
      outcomes: [
        outcomeRow({
          recorded_outcome: 'not_inspected',
          exception_reason: 'inaccessible',
        }),
      ],
      photos: [
        photoRow(),
        photoRow({ photo_id: 'photo-002', local_id: 'photo-002' }),
      ],
    }),
  );
  const reader = new PostgresAnchorHistoryReader(database);

  const outcomes = await reader.listRecordedOutcomes('company-a', 'anchor-001');
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].recordedOutcome, 'not_inspected');
  assert.equal(outcomes[0].exceptionReason, 'inaccessible');
  assert.equal(outcomes[0].photos.length, 2);
  assert.equal(outcomes[0].photos[1].photoId, 'photo-002');
});

test('PostgreSQL anchor history reader reports unknown anchors and empty history', async () => {
  const unknownAnchor = new HistorySqlDatabase(
    historyHandlers({ anchors: [] }),
  );
  assert.equal(
    await new PostgresAnchorHistoryReader(unknownAnchor).listRecordedOutcomes(
      'company-a',
      'anchor-001',
    ),
    undefined,
  );

  const noOutcomes = new HistorySqlDatabase(
    historyHandlers({ outcomes: [], photos: [] }),
  );
  assert.deepEqual(
    await new PostgresAnchorHistoryReader(noOutcomes).listRecordedOutcomes(
      'company-a',
      'anchor-001',
    ),
    [],
  );

  await expectFailure(
    () =>
      new PostgresAnchorHistoryReader(
        new HistorySqlDatabase(),
      ).listRecordedOutcomes('bad company', 'anchor-001'),
    'INVALID_INPUT',
  );
});

test('PostgreSQL previous-revision read compares submitted revisions element-wise', async () => {
  const database = new HistorySqlDatabase(
    historyHandlers({
      current: [currentRow()],
      previous: [
        outcomeRow({
          anchor_inspection_id: 'anchor-inspection-b',
          inspection_id: 'inspection-b',
          revision_number: 1,
          submitted_at: new Date('2026-08-15T00:00:00.000Z'),
          recorded_outcome: 'serviceable',
        }),
      ],
      photos: [],
    }),
  );
  const reader = new PostgresAnchorHistoryReader(database);

  const previous = await reader.findPreviousRevision(
    'company-a',
    'anchor-inspection-a',
  );

  assert.match(
    database.queries[0].text,
    /set_config\('app\.company_id', \$1, true\)/,
  );
  for (const query of database.queries) {
    assert.doesNotMatch(
      query.text,
      /\b(INSERT|UPDATE|DELETE)\b/i,
      'anchor history reader must stay read-only',
    );
  }
  assert.match(database.queries[1].text, /anchor_inspection_id = \$2/);
  assert.match(database.queries[2].text, /< \(\$3, \$4, \$5, \$6\)/);
  assert.match(database.queries[2].text, /LIMIT 1/);
  assert.deepEqual(database.queries[2].values, [
    'company-a',
    'anchor-001',
    new Date('2026-09-15T00:00:00.000Z'),
    2,
    'inspection-a',
    'anchor-inspection-a',
  ]);

  assert.equal(previous.anchorInspectionId, 'anchor-inspection-b');
  assert.equal(previous.recordedOutcome, 'serviceable');
  assert.deepEqual(previous.photos, []);
});

test('PostgreSQL previous-revision read fails closed without a prior submitted revision', async () => {
  const noPrevious = new HistorySqlDatabase(
    historyHandlers({ previous: [], photos: [] }),
  );
  assert.equal(
    await new PostgresAnchorHistoryReader(noPrevious).findPreviousRevision(
      'company-a',
      'anchor-inspection-a',
    ),
    undefined,
  );

  const provisional = new HistorySqlDatabase(
    historyHandlers({ current: [currentRow({ anchor_id: null })] }),
  );
  assert.equal(
    await new PostgresAnchorHistoryReader(provisional).findPreviousRevision(
      'company-a',
      'anchor-inspection-a',
    ),
    undefined,
  );

  const unknownInspection = new HistorySqlDatabase(
    historyHandlers({ current: [] }),
  );
  assert.equal(
    await new PostgresAnchorHistoryReader(
      unknownInspection,
    ).findPreviousRevision('company-a', 'anchor-inspection-a'),
    undefined,
  );

  const notSubmitted = new HistorySqlDatabase(
    historyHandlers({
      current: [
        currentRow({
          inspection_workflow_status: 'working',
          submitted_at: null,
        }),
      ],
    }),
  );
  await expectFailure(
    () =>
      new PostgresAnchorHistoryReader(notSubmitted).findPreviousRevision(
        'company-a',
        'anchor-inspection-a',
      ),
    'PERSISTENCE_UNAVAILABLE',
  );

  await expectFailure(
    () =>
      new PostgresAnchorHistoryReader(
        new HistorySqlDatabase(),
      ).findPreviousRevision('bad company', 'anchor-inspection-a'),
    'INVALID_INPUT',
  );
});

test('PostgreSQL anchor history reader rejects stored values it cannot reconcile', async () => {
  const badOutcome = new HistorySqlDatabase(
    historyHandlers({
      outcomes: [outcomeRow({ recorded_outcome: 'approved' })],
      photos: [],
    }),
  );
  await expectFailure(
    () =>
      new PostgresAnchorHistoryReader(badOutcome).listRecordedOutcomes(
        'company-a',
        'anchor-001',
      ),
    'PERSISTENCE_UNAVAILABLE',
  );

  const badException = new HistorySqlDatabase(
    historyHandlers({
      outcomes: [outcomeRow({ exception_reason: 'weather' })],
      photos: [],
    }),
  );
  await expectFailure(
    () =>
      new PostgresAnchorHistoryReader(badException).listRecordedOutcomes(
        'company-a',
        'anchor-001',
      ),
    'PERSISTENCE_UNAVAILABLE',
  );

  const badDisposition = new HistorySqlDatabase(
    historyHandlers({
      outcomes: [outcomeRow({ disposition: 'discarded' })],
      photos: [],
    }),
  );
  await expectFailure(
    () =>
      new PostgresAnchorHistoryReader(badDisposition).listRecordedOutcomes(
        'company-a',
        'anchor-001',
      ),
    'PERSISTENCE_UNAVAILABLE',
  );

  const badPhotoState = new HistorySqlDatabase(
    historyHandlers({
      outcomes: [outcomeRow()],
      photos: [photoRow({ upload_state: 'unknown' })],
    }),
  );
  await expectFailure(
    () =>
      new PostgresAnchorHistoryReader(badPhotoState).listRecordedOutcomes(
        'company-a',
        'anchor-001',
      ),
    'PERSISTENCE_UNAVAILABLE',
  );
});

function controllerFixture(reader) {
  const service = makeService(reader);
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
  return { controller, authenticated };
}

test('controller serialises the anchor history reads and maps failures', async () => {
  const { reader } = recordedOutcomeFixture();
  const { controller, authenticated } = controllerFixture(reader);

  const listed = await controller.listAnchorRecordedOutcomes(
    AUTHORIZATION,
    'company-a',
    'anchor-001',
  );
  assert.deepEqual(authenticated, [
    { companyId: 'company-a', token: 'access-token' },
  ]);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].jobReference, 'JOB-2026-004');
  assert.equal(listed[0].submittedAt, '2026-08-15T00:00:00.000Z');
  assert.equal(listed[0].photos[0].photoId, 'photo-002');

  const previous = await controller.getPreviousAnchorRevision(
    AUTHORIZATION,
    'company-a',
    'anchor-inspection-a',
  );
  assert.equal(previous.inspectionId, 'inspection-b');
  assert.equal(previous.recordedOutcome, 'serviceable');

  const inspectorController = new ReviewController(
    {
      authenticateSession() {
        return principal('company-a', 'inspector', 'inspector-a');
      },
    },
    makeService(reader),
  );
  await assert.rejects(
    () =>
      inspectorController.listAnchorRecordedOutcomes(
        AUTHORIZATION,
        'company-a',
        'anchor-001',
      ),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  await assert.rejects(
    () =>
      controller.listAnchorRecordedOutcomes(
        AUTHORIZATION,
        'company-a',
        'missing',
      ),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  await assert.rejects(
    () =>
      controller.getPreviousAnchorRevision(
        AUTHORIZATION,
        'company-a',
        'anchor-inspection-missing',
      ),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  await assert.rejects(
    () =>
      controller.listAnchorRecordedOutcomes(
        undefined,
        'company-a',
        'anchor-001',
      ),
    (error) => error instanceof UnauthorizedException,
  );

  const unavailable = new ReviewController(
    {
      authenticateSession() {
        return principal('company-a');
      },
    },
    makeService({
      listRecordedOutcomes() {
        throw new ReviewFailure('PERSISTENCE_UNAVAILABLE', 'down');
      },
      findPreviousRevision() {
        throw new ReviewFailure('PERSISTENCE_UNAVAILABLE', 'down');
      },
    }),
  );
  await assert.rejects(
    () =>
      unavailable.listAnchorRecordedOutcomes(
        AUTHORIZATION,
        'company-a',
        'anchor-001',
      ),
    (error) =>
      error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );
  await assert.rejects(
    () =>
      unavailable.getPreviousAnchorRevision(
        AUTHORIZATION,
        'company-a',
        'anchor-inspection-a',
      ),
    (error) =>
      error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );
});
