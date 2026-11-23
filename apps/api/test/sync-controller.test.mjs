import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { SyncController } from '../dist/sync/sync.controller.js';
import { PostgresSyncMutationStore } from '../dist/sync/postgres-sync-store.js';
import { SyncService } from '../dist/sync/sync-service.js';
import {
  InMemorySyncMutationStore,
  InMemorySyncMutationPayloadApplier,
  UnconfiguredSyncMutationStore,
} from '../dist/sync/sync-store.js';

class FixedClock {
  now() {
    return new Date('2026-09-04T00:00:00.000Z');
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

function principal(companyId, role = 'inspector', userId = 'inspector-a') {
  return {
    companyId,
    sessionId: `session-${userId}`,
    userId,
    identitySubject: `subject-${userId}`,
    email: `${userId}@example.test`,
    role,
    mfaSatisfied: role === 'administrator',
    authenticatedAt: new Date('2026-09-04T00:00:00.000Z'),
    sessionExpiresAt: new Date('2026-09-05T00:00:00.000Z'),
  };
}

function request(overrides = {}) {
  return {
    mutationId: 'mutation-001',
    idempotencyKey: 'mutation-001',
    operation: 'submit_inspection',
    entityType: 'inspection_submission',
    entityId: 'submission-001',
    expectedEntityVersion: 0,
    entityVersion: 1,
    ...overrides,
  };
}

function payload(overrides = {}) {
  return {
    companyId: 'company-a',
    jobId: 'job-001',
    siteId: 'site-001',
    jurisdiction: 'NSW',
    submissionId: 'submission-001',
    jobPackVersion: 1,
    anchorInspections: [],
    ...overrides,
  };
}

function makeFixture(store = new InMemorySyncMutationStore(), payloadApplier) {
  const service = new SyncService({
    store,
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator('conflict'),
    payloadApplier,
  });
  const authService = {
    authenticateSession(companyId, accessToken) {
      assert.equal(accessToken, 'access-token');
      return principal(companyId);
    },
  };
  return {
    store,
    service,
    controller: new SyncController(authService, service),
  };
}

const AUTHORIZATION = 'Bearer access-token';

test('acknowledgement is replayable by stable mutation identity', async () => {
  const fixture = makeFixture();

  const first = await fixture.controller.submitMutation(
    AUTHORIZATION,
    'company-a',
    request(),
  );
  const replay = await fixture.controller.submitMutation(
    AUTHORIZATION,
    'company-a',
    request(),
  );

  assert.equal(first.state, 'synchronised');
  assert.equal(first.replayed, false);
  assert.equal(first.serverEntityVersion, 1);
  assert.equal(first.conflict, null);
  assert.equal(replay.state, 'synchronised');
  assert.equal(replay.replayed, true);
  assert.equal(replay.acknowledgedAt, first.acknowledgedAt);
});

test('inspection payload is applied only on the first acknowledged revision', async () => {
  const payloadApplier = new InMemorySyncMutationPayloadApplier();
  const fixture = makeFixture(new InMemorySyncMutationStore(), payloadApplier);
  const inspectionPayload = payload({
    anchorInspections: [
      {
        inspectionId: 'inspection-001',
        expectedAnchorId: 'anchor-001',
        provisionalAnchorId: null,
        identityConfirmed: true,
        locationConfirmed: true,
        location: 'North roof',
        observations: 'No visible damage.',
        recordedOutcome: 'serviceable',
        exceptionReason: null,
        reconciliationProposal: null,
        reconciliationReferenceId: null,
        disposition: null,
        notes: 'Recorded during bounded sync test.',
        defectDescription: null,
        recommendation: null,
        proofTestLoad: '5 kN',
        proofTestHold: '3 seconds',
        proofTestResult: 'Recorded outcome only',
        proofTestEquipmentReference: 'equipment-001',
        photos: [
          {
            localId: 'photo-001',
            storageReference: 'anchor-photos/photo-001.jpg',
            capturedAtEpochMillis: 1_725_000_000_000,
            checksum: 'sha256-photo-001',
            contentType: 'image/jpeg',
            byteSize: 2048,
          },
        ],
      },
    ],
  });
  const first = await fixture.controller.submitMutation(
    AUTHORIZATION,
    'company-a',
    request({ payload: inspectionPayload }),
  );
  const replay = await fixture.controller.submitMutation(
    AUTHORIZATION,
    'company-a',
    request({ payload: inspectionPayload }),
  );

  assert.equal(first.state, 'synchronised');
  assert.equal(first.payloadApplied, true);
  assert.equal(replay.payloadApplied, true);
  assert.equal(replay.replayed, true);
  assert.deepEqual(
    payloadApplier.getPayload('company-a', 'submission-001'),
    inspectionPayload,
  );
});

test('payload scope and revision stay bound to the mutation envelope', async () => {
  const fixture = makeFixture();

  await assert.rejects(
    () =>
      fixture.controller.submitMutation(
        AUTHORIZATION,
        'company-a',
        request({ payload: payload({ companyId: 'company-b' }) }),
      ),
    (error) =>
      error instanceof BadRequestException && error.getStatus() === 400,
  );
  await assert.rejects(
    () =>
      fixture.controller.submitMutation(
        AUTHORIZATION,
        'company-a',
        request({ payload: payload({ jobPackVersion: 2 }) }),
      ),
    (error) =>
      error instanceof BadRequestException && error.getStatus() === 400,
  );
});

test('unconfigured runtime payload application cannot acknowledge an envelope', async () => {
  const fixture = makeFixture();

  await assert.rejects(
    () =>
      fixture.controller.submitMutation(
        AUTHORIZATION,
        'company-a',
        request({ payload: payload() }),
      ),
    (error) =>
      error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );
});

test('expected-version conflict stays visible and replayable', async () => {
  const fixture = makeFixture();
  fixture.store.setCurrentEntityVersion(
    'company-a',
    'inspection_submission',
    'submission-001',
    1,
  );

  const conflict = await fixture.controller.submitMutation(
    AUTHORIZATION,
    'company-a',
    request(),
  );
  const replay = await fixture.controller.submitMutation(
    AUTHORIZATION,
    'company-a',
    request(),
  );

  assert.equal(conflict.state, 'conflict');
  assert.equal(conflict.serverEntityVersion, 1);
  assert.equal(conflict.conflict.reason, 'expected_version_mismatch');
  assert.equal(conflict.conflict.expectedEntityVersion, 0);
  assert.equal(conflict.conflict.currentEntityVersion, 1);
  assert.equal(replay.replayed, true);
  assert.equal(replay.conflict.conflictId, conflict.conflict.conflictId);
});

test('next entity revision is acknowledged only from the current revision', async () => {
  const fixture = makeFixture();
  fixture.store.setCurrentEntityVersion(
    'company-a',
    'inspection_submission',
    'submission-002',
    1,
  );

  const response = await fixture.controller.submitMutation(
    AUTHORIZATION,
    'company-a',
    request({
      mutationId: 'mutation-002',
      idempotencyKey: 'mutation-002',
      entityId: 'submission-002',
      expectedEntityVersion: 1,
      entityVersion: 2,
    }),
  );

  assert.equal(response.state, 'synchronised');
  assert.equal(response.serverEntityVersion, 2);
});

test('idempotency key reuse cannot receive a server acknowledgement', async () => {
  const fixture = makeFixture();
  await fixture.controller.submitMutation(
    AUTHORIZATION,
    'company-a',
    request(),
  );

  const conflict = await fixture.controller.submitMutation(
    AUTHORIZATION,
    'company-a',
    request({ mutationId: 'mutation-002', entityId: 'submission-002' }),
  );

  assert.equal(conflict.state, 'conflict');
  assert.equal(conflict.conflict.reason, 'idempotency_key_reuse');
  assert.equal(conflict.acknowledgedAt, null);
});

test('company scope and role are enforced before persistence', async () => {
  const fixture = makeFixture();
  const companyB = await fixture.controller.submitMutation(
    AUTHORIZATION,
    'company-b',
    request(),
  );
  assert.equal(companyB.state, 'synchronised');
  assert.equal(companyB.companyId, 'company-b');

  const officeController = new SyncController(
    {
      authenticateSession(companyId) {
        return principal(companyId, 'office_reviewer', 'office-a');
      },
    },
    fixture.service,
  );
  await assert.rejects(
    () =>
      officeController.submitMutation(AUTHORIZATION, 'company-a', request()),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
});

test('invalid requests and unconfigured persistence remain explicit', async () => {
  const fixture = makeFixture();
  await assert.rejects(
    () =>
      fixture.controller.submitMutation(
        AUTHORIZATION,
        'company-a',
        request({ entityVersion: 3 }),
      ),
    (error) =>
      error instanceof BadRequestException && error.getStatus() === 400,
  );

  const unavailable = makeFixture(new UnconfiguredSyncMutationStore());
  await assert.rejects(
    () =>
      unavailable.controller.submitMutation(
        AUTHORIZATION,
        'company-a',
        request(),
      ),
    (error) =>
      error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );
});

class RevisionSqlDatabase {
  constructor(revisions) {
    this.revisions = [...revisions];
    this.queries = [];
  }

  async transaction(work) {
    return work({
      query: async (text, values) => {
        this.queries.push({ text, values });
        if (text.includes('FROM jobs j')) {
          return {
            rows: [
              {
                job_id: 'job-001',
                site_id: 'site-001',
                jurisdiction: 'NSW',
                job_pack_version: 1,
                inspector_user_id: 'inspector-a',
              },
            ],
          };
        }
        if (text.includes('COALESCE(MAX(revision_number)')) {
          return { rows: [{ revision_number: this.revisions.shift() }] };
        }
        return { rows: [], rowCount: 1 };
      },
    });
  }
}

test('PostgreSQL sync assigns a new inspection revision for a resubmission of the same pack', async () => {
  const database = new RevisionSqlDatabase([1, 2]);
  const store = new PostgresSyncMutationStore(database);
  const firstRequest = {
    mutationId: 'mutation-001',
    idempotencyKey: 'mutation-001',
    operation: 'submit_inspection',
    entityType: 'inspection_submission',
    entityId: 'submission-001',
    expectedEntityVersion: 0,
    entityVersion: 1,
    payload: payload(),
  };
  const secondRequest = {
    ...firstRequest,
    mutationId: 'mutation-002',
    idempotencyKey: 'mutation-002',
    entityId: 'submission-002',
    payload: payload({ submissionId: 'submission-002' }),
  };
  const actor = principal('company-a');

  await store.submitAtomically(
    actor,
    firstRequest,
    'sha-1',
    new Date('2026-09-15T00:00:00.000Z'),
    () => 'conflict-1',
  );
  await store.submitAtomically(
    actor,
    secondRequest,
    'sha-2',
    new Date('2026-09-15T00:01:00.000Z'),
    () => 'conflict-2',
  );

  const inspectionInserts = database.queries.filter((query) =>
    query.text.includes('INSERT INTO inspections'),
  );
  assert.equal(inspectionInserts.length, 2);
  assert.equal(inspectionInserts[0].values[5], 1);
  assert.equal(inspectionInserts[1].values[5], 2);
  assert.match(
    inspectionInserts[0].text,
    /submission_intent, started_at, submitted_at, created_at, updated_at/,
  );
  assert.match(inspectionInserts[0].text, /TRUE, NULL, \$8, \$8, \$8/);
  assert.equal(
    inspectionInserts[0].values[7].toISOString(),
    '2026-09-15T00:00:00.000Z',
  );
  const locks = database.queries.filter((query) =>
    query.text.includes('pg_advisory_xact_lock'),
  );
  assert.deepEqual(
    locks.map((query) => query.values[2]),
    ['job-001', 'job-001'],
  );
});
