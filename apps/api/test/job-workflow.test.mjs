import assert from 'node:assert/strict';
import test from 'node:test';

import { SiteRegisterService } from '../dist/site-register/site-register-service.js';
import { InMemorySiteRegisterStore } from '../dist/site-register/site-register-store.js';
import { JobWorkflowService } from '../dist/job-workflow/job-workflow-service.js';
import { InMemoryJobWorkflowStore } from '../dist/job-workflow/job-workflow-store.js';
import { JobWorkflowFailure } from '../dist/job-workflow/job-workflow.types.js';

class FixedClock {
  constructor(nowMs = Date.parse('2026-08-31T00:00:00.000Z')) {
    this.nowMs = nowMs;
  }

  now() {
    return new Date(this.nowMs);
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

function principal(companyId, role, userId) {
  return {
    companyId,
    sessionId: `session-${userId}`,
    userId,
    identitySubject: `subject-${userId}`,
    email: `${userId}@example.test`,
    role,
    mfaSatisfied: role === 'administrator',
    authenticatedAt: new Date('2026-08-31T00:00:00.000Z'),
    sessionExpiresAt: new Date('2026-09-01T00:00:00.000Z'),
  };
}

function expectFailure(action, code) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof JobWorkflowFailure);
    assert.equal(error.code, code);
    return true;
  });
}

function makeHarness() {
  const clock = new FixedClock();
  const siteRegisterService = new SiteRegisterService({
    store: new InMemorySiteRegisterStore(),
    auditSink: { record() {} },
    clock,
    idGenerator: new FixedIdGenerator('site'),
  });
  const jobAudit = {
    events: [],
    record(event) {
      this.events.push(event);
    },
  };
  const members = new Map([
    [
      'company-a:inspector-a',
      {
        companyId: 'company-a',
        userId: 'inspector-a',
        role: 'inspector',
        active: true,
      },
    ],
    [
      'company-a:inspector-b',
      {
        companyId: 'company-a',
        userId: 'inspector-b',
        role: 'inspector',
        active: true,
      },
    ],
    [
      'company-a:inactive-inspector',
      {
        companyId: 'company-a',
        userId: 'inactive-inspector',
        role: 'inspector',
        active: false,
      },
    ],
    [
      'company-a:office-a',
      {
        companyId: 'company-a',
        userId: 'office-a',
        role: 'office_reviewer',
        active: true,
      },
    ],
  ]);
  const service = new JobWorkflowService({
    store: new InMemoryJobWorkflowStore(),
    memberDirectory: {
      getMember(companyId, userId) {
        return members.get(`${companyId}:${userId}`);
      },
    },
    siteDirectory: siteRegisterService,
    auditSink: jobAudit,
    clock,
    idGenerator: new FixedIdGenerator('job'),
  });

  return { clock, jobAudit, members, service, siteRegisterService };
}

function prepareJob(harness, companyId = 'company-a') {
  const office = principal(companyId, 'office_reviewer', 'office-a');
  const client = harness.siteRegisterService.createClient(office, {
    name: 'Client A',
  });
  const site = harness.siteRegisterService.createSite(office, {
    clientId: client.clientId,
    name: 'Site A',
    jurisdiction: 'NSW',
  });
  const job = harness.service.createJob(office, {
    siteId: site.siteId,
    reference: `job-reference-${companyId}`,
    plannedDate: '2026-09-15',
  });
  return { client, job, office, site };
}

test('creates, releases and claims tenant-scoped jobs with explicit site jurisdiction', () => {
  const harness = makeHarness();
  const { job, office, site } = prepareJob(harness);
  const inspector = principal('company-a', 'inspector', 'inspector-a');

  assert.equal(job.workflowStatus, 'draft');
  assert.equal(job.jurisdiction, 'NSW');
  assert.equal(job.jobPackVersion, 1);
  assert.equal(job.plannedDate, '2026-09-15');

  harness.siteRegisterService.updateSite(office, site.siteId, {
    jurisdiction: 'QLD',
  });
  assert.equal(
    harness.service.getJob(office, job.jobId).job.jurisdiction,
    'NSW',
  );

  const released = harness.service.releaseJob(office, job.jobId);
  assert.equal(released.job.workflowStatus, 'released');
  assert.equal(released.assignment, null);
  assert.deepEqual(
    harness.service.listJobs(inspector).map((item) => item.job.jobId),
    [job.jobId],
  );

  const claimed = harness.service.claimJob(inspector, job.jobId);
  assert.equal(claimed.job.workflowStatus, 'assigned');
  assert.equal(claimed.assignment.inspectorUserId, 'inspector-a');
  assert.equal(claimed.assignment.assignmentType, 'claimed');
  assert.equal(claimed.assignment.assignedByUserId, null);
  assert.equal(
    claimed.assignment.claimedAt.toISOString(),
    '2026-08-31T00:00:00.000Z',
  );

  const replay = harness.service.claimJob(inspector, job.jobId);
  assert.equal(replay.assignment.assignmentId, claimed.assignment.assignmentId);
  assert.deepEqual(
    harness.jobAudit.events.map((event) => event.action),
    ['job.created', 'job.released', 'job.claimed'],
  );
});

test('office assignment validates active inspectors and keeps one primary assignment', () => {
  const harness = makeHarness();
  const { job, office } = prepareJob(harness);

  expectFailure(
    () =>
      harness.service.assignJob(office, job.jobId, {
        inspectorUserId: 'inactive-inspector',
      }),
    'NOT_FOUND',
  );
  harness.service.releaseJob(office, job.jobId);

  const assigned = harness.service.assignJob(office, job.jobId, {
    inspectorUserId: 'inspector-a',
  });
  assert.equal(assigned.job.workflowStatus, 'assigned');
  assert.equal(assigned.assignment.assignmentType, 'assigned');
  assert.equal(assigned.assignment.assignedByUserId, 'office-a');
  assert.equal(assigned.assignment.claimedAt, null);

  assert.throws(
    () =>
      harness.service.assignJob(office, job.jobId, {
        inspectorUserId: 'inspector-b',
      }),
    (error) => {
      assert.ok(error instanceof JobWorkflowFailure);
      assert.equal(error.code, 'CONFLICT');
      assert.equal(error.currentAssignment.inspectorUserId, 'inspector-a');
      return true;
    },
  );
});

test('concurrent claim attempts leave one primary assignment and expose current state', () => {
  const harness = makeHarness();
  const { job, office } = prepareJob(harness);
  harness.service.releaseJob(office, job.jobId);
  const inspectorA = principal('company-a', 'inspector', 'inspector-a');
  const inspectorB = principal('company-a', 'inspector', 'inspector-b');

  const first = harness.service.claimJob(inspectorA, job.jobId);
  assert.throws(
    () => harness.service.claimJob(inspectorB, job.jobId),
    (error) => {
      assert.ok(error instanceof JobWorkflowFailure);
      assert.equal(error.code, 'CONFLICT');
      assert.equal(
        error.currentAssignment.assignmentId,
        first.assignment.assignmentId,
      );
      return true;
    },
  );
  assert.equal(
    harness.service.getJob(inspectorA, job.jobId).assignment.inspectorUserId,
    'inspector-a',
  );
  expectFailure(
    () => harness.service.getJob(inspectorB, job.jobId),
    'NOT_FOUND',
  );
  assert.equal(
    harness.service
      .listJobs(inspectorB)
      .some((item) => item.job.jobId === job.jobId),
    false,
  );
});

test('enforces roles, tenant isolation and valid planned dates', () => {
  const harness = makeHarness();
  const { job, office } = prepareJob(harness);
  const inspector = principal('company-a', 'inspector', 'inspector-a');
  const unknownInspector = principal(
    'company-a',
    'inspector',
    'unknown-inspector',
  );
  const officeB = principal('company-b', 'office_reviewer', 'office-b');

  expectFailure(
    () => harness.service.releaseJob(inspector, job.jobId),
    'ROLE_FORBIDDEN',
  );
  expectFailure(
    () => harness.service.claimJob(unknownInspector, job.jobId),
    'NOT_FOUND',
  );
  expectFailure(() => harness.service.getJob(officeB, job.jobId), 'NOT_FOUND');
  expectFailure(
    () =>
      harness.service.createJob(office, {
        siteId: 'missing-site',
        reference: 'job-invalid-site',
      }),
    'NOT_FOUND',
  );
  expectFailure(
    () =>
      harness.service.createJob(office, {
        siteId: job.siteId,
        reference: 'job-invalid-date',
        plannedDate: '2026-02-30',
      }),
    'INVALID_INPUT',
  );
});
