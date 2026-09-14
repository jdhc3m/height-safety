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

function makeService(store = new InMemoryReviewStore()) {
  return {
    store,
    service: new ReviewService({
      store,
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
  constructor({ queryError = null, updateRowCount = 1, rows = [] } = {}) {
    this.queryError = queryError;
    this.updateRowCount = updateRowCount;
    this.rows = rows;
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
  assert.match(database.queries[1].text, /INSERT INTO review_issues/);
  assert.match(database.queries[2].text, /INSERT INTO review_actions/);
  assert.match(database.queries[3].text, /INSERT INTO audit_events/);

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
  assert.match(database.queries[4].text, /set_config\('app\.company_id'/);
  assert.match(database.queries[5].text, /UPDATE review_issues/);
  assert.match(database.queries[6].text, /INSERT INTO review_actions/);
  assert.match(database.queries[7].text, /INSERT INTO audit_events/);
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
  assert.equal(replayDatabase.queries.length, 2);

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
