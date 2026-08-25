import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AuthFailure,
  hashSecret,
  secureAuthTokenGenerator,
} from '../dist/identity/auth.types.js';
import { AuthService } from '../dist/identity/auth-service.js';
import { InMemoryAuthStore as Store } from '../dist/identity/auth-store.js';

class FixedClock {
  constructor(nowMs = Date.parse('2026-08-25T00:00:00.000Z')) {
    this.nowMs = nowMs;
  }

  now() {
    return new Date(this.nowMs);
  }

  advance(milliseconds) {
    this.nowMs += milliseconds;
  }
}

class FakeIdentityProvider {
  constructor() {
    this.identities = new Map();
    this.sentInvitations = [];
  }

  async verifyAccessToken(accessToken) {
    const identity = this.identities.get(accessToken);
    if (!identity) {
      throw new AuthFailureType('UNAUTHENTICATED', 'provider token invalid');
    }
    return identity;
  }

  async sendInvitation(invitation) {
    this.sentInvitations.push(invitation);
  }
}

function makeHarness() {
  const store = new Store();
  const provider = new FakeIdentityProvider();
  const clock = new FixedClock();
  const audit = {
    events: [],
    record(event) {
      this.events.push(event);
    },
  };
  const service = new AuthService({
    store,
    identityProvider: provider,
    auditSink: audit,
    clock,
    tokenGenerator: secureAuthTokenGenerator,
    config: { sessionTtlMs: 15 * 60 * 1000 },
  });

  const createdAt = clock.now();
  store.createUser({
    companyId: 'company-a',
    userId: 'administrator-a',
    identitySubject: 'subject-admin-a',
    email: 'admin-a@example.test',
    role: 'administrator',
    active: true,
    createdAt,
    updatedAt: createdAt,
  });
  store.createUser({
    companyId: 'company-a',
    userId: 'inspector-a',
    identitySubject: 'subject-inspector-a',
    email: 'inspector-a@example.test',
    role: 'inspector',
    active: true,
    createdAt,
    updatedAt: createdAt,
  });
  store.createUser({
    companyId: 'company-a',
    userId: 'reviewer-a',
    identitySubject: 'subject-reviewer-a',
    email: 'reviewer-a@example.test',
    role: 'office_reviewer',
    active: true,
    createdAt,
    updatedAt: createdAt,
  });
  store.createUser({
    companyId: 'company-b',
    userId: 'inspector-b',
    identitySubject: 'subject-inspector-b',
    email: 'inspector-b@example.test',
    role: 'inspector',
    active: true,
    createdAt,
    updatedAt: createdAt,
  });

  return { service, store, provider, clock, audit };
}

function identity(subject, email, mfaSatisfied = false, emailVerified = true) {
  return { subject, email, mfaSatisfied, emailVerified };
}

function expectAuthFailure(action, code) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof AuthFailure);
    assert.equal(error.code, code);
    return true;
  });
}

test('invitation acceptance is verified, one-time and Administrator-controlled', async () => {
  const { service, store, provider, audit, clock } = makeHarness();
  const adminSession = service.createSession(
    'company-a',
    identity('subject-admin-a', 'admin-a@example.test', true),
  );
  const admin = service.authenticateSession(
    'company-a',
    adminSession.accessToken,
  );

  const invitation = await service.createInvitation(admin, {
    email: 'New-Inspector@Example.Test',
    role: 'inspector',
    expiresAt: new Date(clock.now().getTime() + 60 * 60 * 1000),
  });
  const delivered = provider.sentInvitations.at(-1);
  assert.equal(invitation.email, 'new-inspector@example.test');
  assert.equal(delivered.email, invitation.email);
  assert.equal(delivered.role, 'inspector');
  assert.equal(delivered.invitationId, invitation.invitationId);
  assert.equal(delivered.invitationToken.length > 20, true);

  const stored = store.getInvitationByTokenHash(
    'company-a',
    hashSecret(delivered.invitationToken),
  );
  assert.equal(stored.tokenHash.length, 64);
  assert.notEqual(stored.tokenHash, delivered.invitationToken);
  assert.equal(
    audit.events.some((event) =>
      Object.values(event).some((value) => value === delivered.invitationToken),
    ),
    false,
  );

  const accepted = service.acceptInvitation(
    'company-a',
    delivered.invitationToken,
    identity('subject-new-inspector', 'NEW-INSPECTOR@example.test'),
  );
  assert.equal(accepted.user.role, 'inspector');
  assert.equal(
    service.authenticateSession('company-a', accepted.accessToken).role,
    'inspector',
  );
  expectAuthFailure(
    () =>
      service.acceptInvitation(
        'company-a',
        delivered.invitationToken,
        identity('subject-other', 'new-inspector@example.test'),
      ),
    'INVITATION_ALREADY_USED',
  );

  const reviewerSession = service.createSession(
    'company-a',
    identity('subject-reviewer-a', 'reviewer-a@example.test'),
  );
  const reviewer = service.authenticateSession(
    'company-a',
    reviewerSession.accessToken,
  );
  await assert.rejects(
    () =>
      service.createInvitation(reviewer, {
        email: 'not-allowed@example.test',
        role: 'inspector',
        expiresAt: new Date(clock.now().getTime() + 60 * 60 * 1000),
      }),
    (error) => {
      assert.ok(error instanceof AuthFailure);
      assert.equal(error.code, 'ROLE_FORBIDDEN');
      return true;
    },
  );
});

test('Administrator MFA is required while Inspector and reviewer MFA remains optional', () => {
  const { service } = makeHarness();

  expectAuthFailure(
    () =>
      service.createSession(
        'company-a',
        identity('subject-admin-a', 'admin-a@example.test', false),
      ),
    'MFA_REQUIRED',
  );

  assert.equal(
    service.createSession(
      'company-a',
      identity('subject-inspector-a', 'inspector-a@example.test', false),
    ).user.role,
    'inspector',
  );
  assert.equal(
    service.createSession(
      'company-a',
      identity('subject-reviewer-a', 'reviewer-a@example.test', false),
    ).user.role,
    'office_reviewer',
  );
});

test('session revocation and current membership claims are enforced', () => {
  const { service, store, clock } = makeHarness();
  const inspectorSession = service.createSession(
    'company-a',
    identity('subject-inspector-a', 'inspector-a@example.test'),
  );
  const inspector = service.authenticateSession(
    'company-a',
    inspectorSession.accessToken,
  );
  assert.equal(inspector.role, 'inspector');

  const inspectorUser = store.getUser('company-a', 'inspector-a');
  assert.ok(inspectorUser);
  store.updateUser({
    ...inspectorUser,
    role: 'administrator',
    updatedAt: clock.now(),
  });
  expectAuthFailure(
    () =>
      service.authenticateSession('company-a', inspectorSession.accessToken),
    'MFA_REQUIRED',
  );

  store.updateUser({
    ...inspectorUser,
    updatedAt: clock.now(),
  });
  const adminSession = service.createSession(
    'company-a',
    identity('subject-admin-a', 'admin-a@example.test', true),
  );
  const admin = service.authenticateSession(
    'company-a',
    adminSession.accessToken,
  );
  const inspectorSessionRecord = store.getSessionByTokenHash(
    'company-a',
    hashSecret(inspectorSession.accessToken),
  );
  assert.ok(inspectorSessionRecord);
  service.revokeSession(admin, inspectorSessionRecord.sessionId);
  expectAuthFailure(
    () =>
      service.authenticateSession('company-a', inspectorSession.accessToken),
    'SESSION_REVOKED',
  );

  const companyBSession = service.createSession(
    'company-b',
    identity('subject-inspector-b', 'inspector-b@example.test'),
  );
  expectAuthFailure(
    () => service.authenticateSession('company-a', companyBSession.accessToken),
    'SESSION_NOT_FOUND',
  );

  clock.advance(16 * 60 * 1000);
  expectAuthFailure(
    () => service.authenticateSession('company-b', companyBSession.accessToken),
    'SESSION_EXPIRED',
  );
});

test('provider access tokens are verified before application sessions are issued', async () => {
  const { service, provider } = makeHarness();
  provider.identities.set(
    'provider-token',
    identity('subject-inspector-a', 'inspector-a@example.test'),
  );

  const session = await service.createSessionFromProviderAccessToken(
    'company-a',
    'provider-token',
  );
  assert.equal(session.user.userId, 'inspector-a');
  assert.notEqual(session.accessToken, 'provider-token');
});
