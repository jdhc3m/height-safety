import assert from 'node:assert/strict';
import test from 'node:test';

import { SiteRegisterService } from '../dist/site-register/site-register-service.js';
import { InMemorySiteRegisterStore } from '../dist/site-register/site-register-store.js';
import { SiteRegisterFailure } from '../dist/site-register/site-register.types.js';

class FixedClock {
  constructor(nowMs = Date.parse('2026-08-26T00:00:00.000Z')) {
    this.nowMs = nowMs;
  }

  now() {
    return new Date(this.nowMs);
  }

  advance(milliseconds) {
    this.nowMs += milliseconds;
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

function principal(companyId, role = 'office_reviewer', userId = 'user-a') {
  return {
    companyId,
    sessionId: `session-${companyId}`,
    userId,
    identitySubject: `subject-${userId}`,
    email: `${userId}@example.test`,
    role,
    mfaSatisfied: role === 'administrator',
    authenticatedAt: new Date('2026-08-26T00:00:00.000Z'),
    sessionExpiresAt: new Date('2026-08-26T01:00:00.000Z'),
  };
}

function makeHarness() {
  const audit = {
    events: [],
    record(event) {
      this.events.push(event);
    },
  };
  const service = new SiteRegisterService({
    store: new InMemorySiteRegisterStore(),
    auditSink: audit,
    clock: new FixedClock(),
    idGenerator: new FixedIdGenerator(),
  });
  return { service, audit };
}

function expectFailure(action, code) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof SiteRegisterFailure);
    assert.equal(error.code, code);
    return true;
  });
}

test('creates tenant-scoped client, site and single-point anchor register', () => {
  const { service, audit } = makeHarness();
  const office = principal('company-a');

  const client = service.createClient(office, {
    name: ' Client A ',
    externalReference: ' client-ref ',
  });
  const site = service.createSite(office, {
    clientId: client.clientId,
    name: ' Site A ',
    jurisdiction: 'NSW',
    siteReference: 'site-ref',
  });
  const anchor = service.createAnchor(office, site.siteId, {
    registerId: 'A-001',
    location: 'North roof',
    notes: 'Recorded register note',
  });

  assert.equal(client.name, 'Client A');
  assert.equal(site.jurisdiction, 'NSW');
  assert.equal(anchor.anchorType, 'single_point');
  assert.equal(anchor.registerStatus, 'active');
  assert.deepEqual(
    service.listSites(office).map((item) => item.siteId),
    [site.siteId],
  );
  assert.deepEqual(
    service.listAnchors(office, site.siteId).map((item) => item.registerId),
    ['A-001'],
  );
  assert.deepEqual(
    audit.events.map((event) => event.action),
    ['client.created', 'site.created', 'anchor.created'],
  );
});

test('preserves tenant isolation and rejects inspector register writes', () => {
  const { service } = makeHarness();
  const officeA = principal('company-a');
  const officeB = principal('company-b');
  const clientA = service.createClient(officeA, { name: 'Client A' });
  const siteA = service.createSite(officeA, {
    clientId: clientA.clientId,
    name: 'Site A',
    jurisdiction: 'QLD',
  });

  assert.deepEqual(service.listClients(officeB), []);
  expectFailure(() => service.getSite(officeB, siteA.siteId), 'NOT_FOUND');
  expectFailure(
    () =>
      service.createAnchor(principal('company-b'), siteA.siteId, {
        registerId: 'wrong-tenant',
      }),
    'NOT_FOUND',
  );
  expectFailure(
    () =>
      service.createClient(principal('company-a', 'inspector'), {
        name: 'Nope',
      }),
    'ROLE_FORBIDDEN',
  );
});

test('validates jurisdiction, anchor type, status and duplicate register IDs', () => {
  const { service } = makeHarness();
  const office = principal('company-a');
  const client = service.createClient(office, { name: 'Client A' });
  const site = service.createSite(office, {
    clientId: client.clientId,
    name: 'Site A',
    jurisdiction: 'NSW',
  });

  expectFailure(
    () =>
      service.createSite(office, {
        clientId: client.clientId,
        name: 'Invalid Site',
        jurisdiction: 'VIC',
      }),
    'INVALID_INPUT',
  );
  service.createAnchor(office, site.siteId, { registerId: 'A-001' });
  expectFailure(
    () => service.createAnchor(office, site.siteId, { registerId: 'A-001' }),
    'CONFLICT',
  );
  expectFailure(
    () =>
      service.createAnchor(office, site.siteId, {
        anchorType: 'horizontal_line',
      }),
    'INVALID_INPUT',
  );
  expectFailure(
    () =>
      service.createAnchor(office, site.siteId, {
        registerStatus: 'removed',
      }),
    'INVALID_INPUT',
  );
});

test('updates site context and anchor register status without changing IDs', () => {
  const { service } = makeHarness();
  const office = principal('company-a', 'administrator', 'admin-a');
  const client = service.createClient(office, { name: 'Client A' });
  const site = service.createSite(office, {
    clientId: client.clientId,
    name: 'Site A',
    jurisdiction: 'NSW',
  });
  const anchor = service.createAnchor(office, site.siteId, {
    registerId: 'A-001',
  });

  const updatedSite = service.updateSite(office, site.siteId, {
    jurisdiction: 'QLD',
    accessNotes: 'Use east access',
  });
  const updatedAnchor = service.updateAnchor(
    office,
    site.siteId,
    anchor.anchorId,
    {
      registerStatus: 'inactive',
      notes: 'Further assessment required',
    },
  );

  assert.equal(updatedSite.siteId, site.siteId);
  assert.equal(updatedSite.jurisdiction, 'QLD');
  assert.equal(updatedAnchor.anchorId, anchor.anchorId);
  assert.equal(updatedAnchor.registerStatus, 'inactive');
  assert.equal(updatedAnchor.notes, 'Further assessment required');
});
