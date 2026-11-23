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

async function expectFailure(action, code) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof SiteRegisterFailure);
    assert.equal(error.code, code);
    return true;
  });
}

test('creates tenant-scoped client, site and single-point anchor register', async () => {
  const { service, audit } = makeHarness();
  const office = principal('company-a');

  const client = await service.createClient(office, {
    name: ' Client A ',
    externalReference: ' client-ref ',
  });
  const site = await service.createSite(office, {
    clientId: client.clientId,
    name: ' Site A ',
    jurisdiction: 'NSW',
    siteReference: 'site-ref',
  });
  const anchor = await service.createAnchor(office, site.siteId, {
    registerId: 'A-001',
    location: 'North roof',
    notes: 'Recorded register note',
  });

  assert.equal(client.name, 'Client A');
  assert.equal(site.jurisdiction, 'NSW');
  assert.equal(anchor.anchorType, 'single_point');
  assert.equal(anchor.registerStatus, 'active');
  assert.deepEqual(
    (await service.listSites(office)).map((item) => item.siteId),
    [site.siteId],
  );
  assert.deepEqual(
    (await service.listAnchors(office, site.siteId)).map(
      (item) => item.registerId,
    ),
    ['A-001'],
  );
  assert.deepEqual(
    audit.events.map((event) => event.action),
    ['client.created', 'site.created', 'anchor.created'],
  );
});

test('preserves tenant isolation and rejects inspector register writes', async () => {
  const { service } = makeHarness();
  const officeA = principal('company-a');
  const officeB = principal('company-b');
  const clientA = await service.createClient(officeA, { name: 'Client A' });
  const siteA = await service.createSite(officeA, {
    clientId: clientA.clientId,
    name: 'Site A',
    jurisdiction: 'QLD',
  });

  assert.deepEqual(await service.listClients(officeB), []);
  await expectFailure(
    () => service.getSite(officeB, siteA.siteId),
    'NOT_FOUND',
  );
  await expectFailure(
    () =>
      service.createAnchor(principal('company-b'), siteA.siteId, {
        registerId: 'wrong-tenant',
      }),
    'NOT_FOUND',
  );
  await expectFailure(
    () =>
      service.createClient(principal('company-a', 'inspector'), {
        name: 'Nope',
      }),
    'ROLE_FORBIDDEN',
  );
});

test('validates jurisdiction, anchor type, status and duplicate register IDs', async () => {
  const { service } = makeHarness();
  const office = principal('company-a');
  const client = await service.createClient(office, { name: 'Client A' });
  const site = await service.createSite(office, {
    clientId: client.clientId,
    name: 'Site A',
    jurisdiction: 'NSW',
  });

  await expectFailure(
    () =>
      service.createSite(office, {
        clientId: client.clientId,
        name: 'Invalid Site',
        jurisdiction: 'VIC',
      }),
    'INVALID_INPUT',
  );
  await service.createAnchor(office, site.siteId, { registerId: 'A-001' });
  await expectFailure(
    () => service.createAnchor(office, site.siteId, { registerId: 'A-001' }),
    'CONFLICT',
  );
  await expectFailure(
    () =>
      service.createAnchor(office, site.siteId, {
        anchorType: 'horizontal_line',
      }),
    'INVALID_INPUT',
  );
  await expectFailure(
    () =>
      service.createAnchor(office, site.siteId, {
        registerStatus: 'removed',
      }),
    'INVALID_INPUT',
  );
});

test('updates site context and anchor register status without changing IDs', async () => {
  const { service } = makeHarness();
  const office = principal('company-a', 'administrator', 'admin-a');
  const client = await service.createClient(office, { name: 'Client A' });
  const site = await service.createSite(office, {
    clientId: client.clientId,
    name: 'Site A',
    jurisdiction: 'NSW',
  });
  const anchor = await service.createAnchor(office, site.siteId, {
    registerId: 'A-001',
  });

  const updatedSite = await service.updateSite(office, site.siteId, {
    jurisdiction: 'QLD',
    accessNotes: 'Use east access',
  });
  const updatedAnchor = await service.updateAnchor(
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

test('rejects malformed mutation bodies and records changed fields in audit metadata', async () => {
  const { service, audit } = makeHarness();
  const office = principal('company-a');

  await expectFailure(
    () => service.createClient(office, null),
    'INVALID_INPUT',
  );

  const client = await service.createClient(office, { name: 'Client A' });
  const site = await service.createSite(office, {
    clientId: client.clientId,
    name: 'Site A',
    jurisdiction: 'NSW',
  });
  const anchor = await service.createAnchor(office, site.siteId, {});
  await expectFailure(
    () => service.updateSite(office, site.siteId, null),
    'INVALID_INPUT',
  );
  await expectFailure(
    () => service.updateAnchor(office, site.siteId, anchor.anchorId, null),
    'INVALID_INPUT',
  );

  await service.updateClient(office, client.clientId, {
    name: 'Updated Client A',
    contactDetails: 'office@example.test',
  });

  const updateEvent = audit.events.find(
    (event) => event.action === 'client.updated',
  );
  assert.ok(updateEvent);
  assert.equal(updateEvent.metadata.changedFields, 'name,contactDetails');
});
