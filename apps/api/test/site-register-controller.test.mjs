import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { SiteRegisterController } from '../dist/site-register/site-register.controller.js';
import {
  InMemorySiteRegisterStore,
  UnconfiguredSiteRegisterStore,
} from '../dist/site-register/site-register-store.js';
import { SiteRegisterService } from '../dist/site-register/site-register-service.js';

class FixedClock {
  now() {
    return new Date('2026-08-26T00:00:00.000Z');
  }
}

class FixedIdGenerator {
  constructor() {
    this.next = 1;
  }

  createId() {
    return `id-${this.next++}`;
  }
}

function principal(companyId, role = 'office_reviewer') {
  return {
    companyId,
    sessionId: `session-${companyId}`,
    userId: 'user-a',
    identitySubject: 'subject-user-a',
    email: 'user-a@example.test',
    role,
    mfaSatisfied: role === 'administrator',
    authenticatedAt: new Date('2026-08-26T00:00:00.000Z'),
    sessionExpiresAt: new Date('2026-08-26T01:00:00.000Z'),
  };
}

function makeController({ role = 'office_reviewer', store } = {}) {
  const authService = {
    authenticateSession(companyId, accessToken) {
      assert.equal(accessToken, 'access-token');
      return principal(companyId, role);
    },
  };
  const siteRegisterService = new SiteRegisterService({
    store: store ?? new InMemorySiteRegisterStore(),
    auditSink: { record() {} },
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });

  return new SiteRegisterController(authService, siteRegisterService);
}

const AUTHORIZATION = 'Bearer access-token';

test('controller authenticates and serializes client, site and anchor routes', async () => {
  const controller = makeController();

  const client = await controller.createClient(AUTHORIZATION, 'company-a', {
    name: ' Client A ',
    externalReference: 'client-a',
  });
  const site = await controller.createSite(AUTHORIZATION, 'company-a', {
    clientId: client.clientId,
    name: ' Site A ',
    jurisdiction: 'NSW',
  });
  const anchor = await controller.createAnchor(
    AUTHORIZATION,
    'company-a',
    site.siteId,
    { registerId: 'A-001' },
  );

  assert.deepEqual(client, {
    companyId: 'company-a',
    clientId: 'id-1',
    name: 'Client A',
    contactDetails: null,
    externalReference: 'client-a',
    createdAt: '2026-08-26T00:00:00.000Z',
    updatedAt: '2026-08-26T00:00:00.000Z',
  });
  assert.equal(site.jurisdiction, 'NSW');
  assert.equal(anchor.anchorType, 'single_point');
  assert.equal(
    (await controller.listAnchors(AUTHORIZATION, 'company-a', site.siteId))[0]
      .anchorId,
    anchor.anchorId,
  );
  assert.equal(
    (
      await controller.updateAnchor(
        AUTHORIZATION,
        'company-a',
        site.siteId,
        anchor.anchorId,
        { registerStatus: 'inactive' },
      )
    ).registerStatus,
    'inactive',
  );
});

test('controller maps authentication, role and persistence failures to HTTP errors', async () => {
  const controller = makeController();

  await assert.rejects(
    () => controller.listClients(undefined, 'company-a'),
    (error) =>
      error instanceof UnauthorizedException && error.getStatus() === 401,
  );
  await assert.rejects(
    () => controller.listClients(AUTHORIZATION, 'not a company id'),
    (error) =>
      error instanceof BadRequestException && error.getStatus() === 400,
  );

  const inspectorController = makeController({ role: 'inspector' });
  await assert.rejects(
    () =>
      inspectorController.createClient(AUTHORIZATION, 'company-a', {
        name: 'Not allowed',
      }),
    (error) => error instanceof ForbiddenException && error.getStatus() === 403,
  );

  const unconfiguredController = makeController({
    store: new UnconfiguredSiteRegisterStore(),
  });
  await assert.rejects(
    () => unconfiguredController.listClients(AUTHORIZATION, 'company-a'),
    (error) =>
      error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );
});
