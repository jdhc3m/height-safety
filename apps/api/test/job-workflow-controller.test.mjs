import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { SiteRegisterService } from '../dist/site-register/site-register-service.js';
import { InMemorySiteRegisterStore } from '../dist/site-register/site-register-store.js';
import { JobWorkflowController } from '../dist/job-workflow/job-workflow.controller.js';
import { JobWorkflowService } from '../dist/job-workflow/job-workflow-service.js';
import {
  InMemoryJobWorkflowStore,
  UnconfiguredJobWorkflowStore,
} from '../dist/job-workflow/job-workflow-store.js';

class FixedClock {
  now() {
    return new Date('2026-08-31T00:00:00.000Z');
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

function makeFixture(store = new InMemoryJobWorkflowStore()) {
  const clock = new FixedClock();
  const siteRegisterService = new SiteRegisterService({
    store: new InMemorySiteRegisterStore(),
    auditSink: { record() {} },
    clock,
    idGenerator: new FixedIdGenerator('site'),
  });
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
  ]);
  const service = new JobWorkflowService({
    store,
    memberDirectory: {
      getMember(companyId, userId) {
        return members.get(`${companyId}:${userId}`);
      },
    },
    siteDirectory: siteRegisterService,
    auditSink: { record() {} },
    clock,
    idGenerator: new FixedIdGenerator('job'),
  });
  return { members, service, siteRegisterService };
}

function makeController(
  fixture,
  role = 'office_reviewer',
  userId = 'office-a',
) {
  const authService = {
    authenticateSession(companyId, accessToken) {
      assert.equal(accessToken, 'access-token');
      return principal(companyId, role, userId);
    },
  };
  return new JobWorkflowController(authService, fixture.service);
}

function prepareSite(fixture) {
  const office = principal('company-a', 'office_reviewer', 'office-a');
  const client = fixture.siteRegisterService.createClient(office, {
    name: 'Client A',
  });
  const site = fixture.siteRegisterService.createSite(office, {
    clientId: client.clientId,
    name: 'Site A',
    jurisdiction: 'QLD',
  });
  fixture.siteRegisterService.createAnchor(office, site.siteId, {
    registerId: 'A-001',
    location: 'North roof',
  });
  return site;
}

const AUTHORIZATION = 'Bearer access-token';

test('controller authenticates and serializes create, release and assignment routes', async () => {
  const fixture = makeFixture();
  const controller = makeController(fixture);
  const site = prepareSite(fixture);

  const draft = await controller.createJob(AUTHORIZATION, 'company-a', {
    siteId: site.siteId,
    reference: 'JOB-001',
    plannedDate: '2026-09-15',
  });
  assert.equal(draft.workflowStatus, 'draft');
  assert.equal(draft.jurisdiction, 'QLD');
  assert.equal(draft.assignment, null);

  const released = await controller.releaseJob(
    AUTHORIZATION,
    'company-a',
    draft.jobId,
  );
  assert.equal(released.workflowStatus, 'released');

  const assigned = await controller.assignJob(
    AUTHORIZATION,
    'company-a',
    draft.jobId,
    { inspectorUserId: 'inspector-a' },
  );
  assert.equal(assigned.workflowStatus, 'assigned');
  assert.equal(assigned.assignment.inspectorUserId, 'inspector-a');
  const inspectorController = makeController(
    fixture,
    'inspector',
    'inspector-a',
  );
  const pack = await inspectorController.downloadJobPack(
    AUTHORIZATION,
    'company-a',
    draft.jobId,
  );
  assert.equal(pack.job.jobPackVersion, 1);
  assert.equal(pack.site.jurisdiction, 'QLD');
  assert.equal(pack.anchors.length, 1);
  assert.equal(pack.anchors[0].registerId, 'A-001');
  fixture.siteRegisterService.updateSite(
    principal('company-a', 'office_reviewer', 'office-a'),
    site.siteId,
    { name: 'Changed after release' },
  );
  const anchor = fixture.siteRegisterService.listAnchors(
    principal('company-a', 'office_reviewer', 'office-a'),
    site.siteId,
  )[0];
  fixture.siteRegisterService.updateAnchor(
    principal('company-a', 'office_reviewer', 'office-a'),
    site.siteId,
    anchor.anchorId,
    { location: 'Changed after release' },
  );
  const unchangedPack = await inspectorController.downloadJobPack(
    AUTHORIZATION,
    'company-a',
    draft.jobId,
  );
  assert.equal(unchangedPack.site.name, 'Site A');
  assert.equal(unchangedPack.anchors[0].location, 'North roof');
  assert.equal(
    (await controller.getJob(AUTHORIZATION, 'company-a', draft.jobId)).jobId,
    draft.jobId,
  );
});

test('controller maps auth, role, conflict and persistence failures', async () => {
  const fixture = makeFixture();
  const controller = makeController(fixture);
  const site = prepareSite(fixture);
  const draft = await controller.createJob(AUTHORIZATION, 'company-a', {
    siteId: site.siteId,
    reference: 'JOB-002',
  });
  await controller.releaseJob(AUTHORIZATION, 'company-a', draft.jobId);

  await assert.rejects(
    () => controller.listJobs(undefined, 'company-a'),
    (error) =>
      error instanceof UnauthorizedException && error.getStatus() === 401,
  );

  const inspectorController = makeController(
    fixture,
    'inspector',
    'inspector-a',
  );
  await assert.rejects(
    () =>
      inspectorController.downloadJobPack(
        AUTHORIZATION,
        'company-a',
        draft.jobId,
      ),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );
  await assert.rejects(
    () =>
      inspectorController.createJob(AUTHORIZATION, 'company-a', {
        siteId: site.siteId,
        reference: 'JOB-003',
      }),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  await assert.rejects(
    () => controller.downloadJobPack(AUTHORIZATION, 'company-a', draft.jobId),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );
  const otherCompanyInspector = makeController(
    fixture,
    'inspector',
    'inspector-a',
  );
  await assert.rejects(
    () =>
      otherCompanyInspector.downloadJobPack(
        AUTHORIZATION,
        'company-b',
        draft.jobId,
      ),
    (error) => error instanceof NotFoundException && error.getStatus() === 404,
  );

  await controller.assignJob(AUTHORIZATION, 'company-a', draft.jobId, {
    inspectorUserId: 'inspector-a',
  });
  await assert.rejects(
    () => inspectorController.claimJob(AUTHORIZATION, 'company-a', draft.jobId),
    (error) => {
      assert.ok(error instanceof ConflictException);
      assert.equal(
        error.getResponse().currentAssignment.inspectorUserId,
        'inspector-a',
      );
      return true;
    },
  );

  const unavailable = makeController(
    makeFixture(new UnconfiguredJobWorkflowStore()),
  );
  await assert.rejects(
    () => unavailable.listJobs(AUTHORIZATION, 'company-a'),
    (error) =>
      error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );

  await assert.rejects(
    () =>
      controller.createJob(AUTHORIZATION, 'company-a', {
        siteId: site.siteId,
        reference: 'JOB-004',
        plannedDate: 'not-a-date',
      }),
    (error) =>
      error instanceof BadRequestException && error.getStatus() === 400,
  );
});
