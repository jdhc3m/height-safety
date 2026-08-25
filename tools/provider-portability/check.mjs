import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE_PATH = join(
  ROOT,
  'fixtures/provider-portability/fictional-tenant-fixture.json',
);
const POSTGRES_SCHEMA_PATH = join(
  ROOT,
  'infra/provider-portability/postgresql-schema.sql',
);
const EVIDENCE_PATH = join(
  ROOT,
  'docs/roadmap/G-03_PROVIDER_PORTABILITY_EVIDENCE.json',
);

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)]),
    );
  }

  return value;
}

function serialise(value) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function requireSafeKey(key) {
  assert.match(key, /^[a-z0-9-]+\/(evidence|reports)\/[a-z0-9-]+\.[a-z0-9]+$/);
  assert.ok(!key.includes('..'));
}

function requireTenantKey(companyId, key) {
  assert.match(companyId, /^[a-z0-9-]+$/);
  requireSafeKey(key);
  assert.equal(key.split('/')[0], companyId);
}

class InMemoryObjectStore {
  #objects = new Map();

  async put({ companyId, key, bytes, contentType, checksum }) {
    requireTenantKey(companyId, key);
    const actualChecksum = sha256(bytes);
    assert.equal(checksum, actualChecksum);
    const existing = this.#objects.get(key);

    if (existing) {
      if (existing.checksum === actualChecksum) {
        return { created: false, checksum: actualChecksum };
      }
      throw new Error('object key already contains different bytes');
    }

    this.#objects.set(key, {
      bytes: Buffer.from(bytes),
      checksum: actualChecksum,
      companyId,
      contentType,
    });
    return { created: true, checksum: actualChecksum };
  }

  async get({ companyId, key }) {
    assert.match(companyId, /^[a-z0-9-]+$/);
    requireSafeKey(key);
    const object = this.#objects.get(key);
    if (!object || object.companyId !== companyId) {
      throw new Error('object not found for company');
    }
    return { ...object, bytes: Buffer.from(object.bytes) };
  }

  async issueScopedAccess({ companyId, key, expiresAt }) {
    await this.get({ companyId, key });
    assert.match(expiresAt, /^2026-08-24T/);
    return `private://${companyId}/${encodeURIComponent(key)}?expires=${encodeURIComponent(expiresAt)}`;
  }
}

class FilesystemObjectStore {
  constructor(root) {
    this.root = root;
  }

  pathFor(key) {
    const path = resolve(this.root, key);
    assert.ok(path === this.root || path.startsWith(`${this.root}${sep}`));
    return path;
  }

  metadataPath(key) {
    return `${this.pathFor(key)}.metadata.json`;
  }

  async put({ companyId, key, bytes, contentType, checksum }) {
    requireTenantKey(companyId, key);
    const actualChecksum = sha256(bytes);
    assert.equal(checksum, actualChecksum);
    const dataPath = this.pathFor(key);
    const metadataPath = this.metadataPath(key);
    const metadataExists = await readFile(metadataPath, 'utf8').then(
      () => true,
      () => false,
    );
    const dataExists = await readFile(dataPath).then(
      () => true,
      () => false,
    );

    if (metadataExists || dataExists) {
      assert.ok(
        metadataExists && dataExists,
        'partial object must fail closed',
      );
      const existing = JSON.parse(await readFile(metadataPath, 'utf8'));
      if (existing.checksum === actualChecksum) {
        return { created: false, checksum: actualChecksum };
      }
      throw new Error('object key already contains different bytes');
    }

    await mkdir(dirname(dataPath), { recursive: true });
    const temporaryDataPath = `${dataPath}.tmp`;
    const temporaryMetadataPath = `${metadataPath}.tmp`;
    await writeFile(temporaryDataPath, bytes, { flag: 'wx' });
    await writeFile(
      temporaryMetadataPath,
      serialise({ companyId, contentType, checksum: actualChecksum }),
      { flag: 'wx' },
    );
    await rename(temporaryDataPath, dataPath);
    await rename(temporaryMetadataPath, metadataPath);
    return { created: true, checksum: actualChecksum };
  }

  async get({ companyId, key }) {
    assert.match(companyId, /^[a-z0-9-]+$/);
    requireSafeKey(key);
    const dataPath = this.pathFor(key);
    const metadataPath = this.metadataPath(key);
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    if (metadata.companyId !== companyId) {
      throw new Error('object not found for company');
    }
    const bytes = await readFile(dataPath);
    assert.equal(sha256(bytes), metadata.checksum);
    return { ...metadata, bytes };
  }

  async issueScopedAccess({ companyId, key, expiresAt }) {
    await this.get({ companyId, key });
    assert.match(expiresAt, /^2026-08-24T/);
    return `private://${companyId}/${encodeURIComponent(key)}?expires=${encodeURIComponent(expiresAt)}`;
  }
}

function recordsForCompany(fixture, companyId) {
  return fixture.records.filter((record) => record.companyId === companyId);
}

function objectsForCompany(fixture, companyId) {
  return fixture.objects.filter((object) => object.companyId === companyId);
}

async function putFixtureObjects(store, fixture) {
  for (const object of fixture.objects) {
    const bytes = Buffer.from(object.body, 'utf8');
    await store.put({
      bytes,
      checksum: sha256(bytes),
      companyId: object.companyId,
      contentType: object.contentType,
      key: object.key,
    });
  }
}

async function testObjectStoreContract(store, fixture) {
  await putFixtureObjects(store, fixture);
  const nswObject = fixture.objects.find(
    (object) => object.companyId === 'company-nsw-fictional',
  );
  assert.ok(nswObject);
  const nswBytes = Buffer.from(nswObject.body, 'utf8');
  const sameObject = await store.put({
    bytes: nswBytes,
    checksum: sha256(nswBytes),
    companyId: nswObject.companyId,
    contentType: nswObject.contentType,
    key: nswObject.key,
  });
  assert.equal(sameObject.created, false);
  await assert.rejects(
    store.get({ companyId: 'company-qld-fictional', key: nswObject.key }),
    /not found for company/,
  );
  await assert.rejects(
    store.put({
      bytes: Buffer.from('different fictional bytes', 'utf8'),
      checksum: sha256(Buffer.from('different fictional bytes', 'utf8')),
      companyId: nswObject.companyId,
      contentType: nswObject.contentType,
      key: nswObject.key,
    }),
    /different bytes/,
  );
  const access = await store.issueScopedAccess({
    companyId: nswObject.companyId,
    expiresAt: '2026-08-24T01:00:00Z',
    key: nswObject.key,
  });
  assert.match(access, /^private:\/\//);
  assert.doesNotMatch(access, /https?:\/\//);
}

async function makeTenantExport(fixture, companyId, store) {
  const records = recordsForCompany(fixture, companyId);
  const objects = [];

  for (const object of objectsForCompany(fixture, companyId)) {
    const stored = await store.get({ companyId, key: object.key });
    objects.push({
      bodyBase64: stored.bytes.toString('base64'),
      checksum: stored.checksum,
      contentType: stored.contentType,
      key: object.key,
      objectId: object.objectId,
    });
  }

  return {
    exportId: `export-${companyId}`,
    exportVersion: '1.0.0',
    companyId,
    records,
    objects,
    manifest: {
      objectCount: objects.length,
      recordCount: records.length,
      objectChecksums: objects.map(({ key, checksum }) => ({ key, checksum })),
    },
  };
}

function validateTenantExport(exportPackage) {
  assert.equal(exportPackage.exportVersion, '1.0.0');
  for (const record of exportPackage.records) {
    assert.equal(record.companyId, exportPackage.companyId);
  }
  for (const object of exportPackage.objects) {
    requireTenantKey(exportPackage.companyId, object.key);
    const bytes = Buffer.from(object.bodyBase64, 'base64');
    assert.equal(sha256(bytes), object.checksum);
  }
  assert.equal(
    exportPackage.manifest.recordCount,
    exportPackage.records.length,
  );
  assert.equal(
    exportPackage.manifest.objectCount,
    exportPackage.objects.length,
  );
}

async function restoreTenantExport(exportPackage, store) {
  validateTenantExport(exportPackage);
  for (const object of exportPackage.objects) {
    const bytes = Buffer.from(object.bodyBase64, 'base64');
    await store.put({
      bytes,
      checksum: object.checksum,
      companyId: exportPackage.companyId,
      contentType: object.contentType,
      key: object.key,
    });
  }
  return exportPackage.records;
}

async function writeAndVerifyBackup(fixture, store, directory) {
  const exports = [];
  for (const company of ['company-nsw-fictional', 'company-qld-fictional']) {
    exports.push(await makeTenantExport(fixture, company, store));
  }
  const backup = {
    backupId: 'backup-fictional-2026-08-24',
    backupVersion: '1.0.0',
    databaseEngine: 'postgresql-compatible',
    exports,
  };
  const backupBytes = Buffer.from(serialise(backup), 'utf8');
  const backupPath = join(directory, 'backup.json');
  const checksumPath = join(directory, 'backup.sha256');
  await writeFile(backupPath, backupBytes, { flag: 'wx' });
  await writeFile(checksumPath, `${sha256(backupBytes)}\n`, { flag: 'wx' });
  const restoredBytes = await readFile(backupPath);
  const recordedChecksum = (await readFile(checksumPath, 'utf8')).trim();
  assert.equal(sha256(restoredBytes), recordedChecksum);
  const restoredBackup = JSON.parse(restoredBytes);
  assert.equal(restoredBackup.exports.length, 2);
  const restoredStore = new InMemoryObjectStore();
  for (const exportPackage of restoredBackup.exports) {
    await restoreTenantExport(exportPackage, restoredStore);
  }
  const restoredObject = await restoredStore.get({
    companyId: 'company-qld-fictional',
    key: 'company-qld-fictional/evidence/photo-qld-fictional.jpg',
  });
  assert.equal(
    restoredObject.checksum,
    sha256(Buffer.from('fictional Queensland evidence photograph')),
  );
  return { backupChecksum: recordedChecksum, backupPath };
}

async function main() {
  const fixture = JSON.parse(await readFile(FIXTURE_PATH, 'utf8'));
  const postgresSchema = await readFile(POSTGRES_SCHEMA_PATH, 'utf8');
  const evidence = JSON.parse(await readFile(EVIDENCE_PATH, 'utf8'));
  assert.equal(fixture.schemaVersion, '1.0.0');
  assert.equal(evidence.gate, 'G-03');
  assert.equal(evidence.status, 'owner-approved');
  assert.equal(evidence.decision, 'D-027');
  assert.equal(evidence.scope.cloudMutationPerformed, false);
  assert.equal(evidence.scope.productionProviderSelected, false);
  assert.equal(evidence.postgresql.tenantKeyConstraintPassed, true);
  assert.equal(evidence.objectStorage.crossTenantReadRejected, true);
  assert.equal(evidence.backupExport.deterministicBackupAndRestore, true);
  assert.match(postgresSchema, /CREATE TABLE companies/);
  assert.doesNotMatch(
    postgresSchema,
    /CREATE EXTENSION|CREATE POLICY|USING\s*\(/i,
  );
  assert.match(postgresSchema, /FOREIGN KEY \(company_id, site_id\)/);
  assert.match(postgresSchema, /object_key LIKE company_id \|\| '\/%'/);

  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), 'height-safety-g03-'),
  );
  try {
    const memoryStore = new InMemoryObjectStore();
    await testObjectStoreContract(memoryStore, fixture);
    const filesystemStore = new FilesystemObjectStore(
      join(temporaryDirectory, 'objects'),
    );
    await testObjectStoreContract(filesystemStore, fixture);
    const backup = await writeAndVerifyBackup(
      fixture,
      memoryStore,
      temporaryDirectory,
    );
    const nswExport = await makeTenantExport(
      fixture,
      'company-nsw-fictional',
      memoryStore,
    );
    validateTenantExport(nswExport);
    assert.equal(nswExport.records.length, 3);
    assert.equal(nswExport.objects.length, 2);
    assert.doesNotMatch(JSON.stringify(nswExport), /company-qld-fictional/);
    console.log(
      JSON.stringify(
        {
          backupChecksum: backup.backupChecksum,
          export: {
            companyId: nswExport.companyId,
            objectCount: nswExport.objects.length,
            recordCount: nswExport.records.length,
          },
          objectStoreAdapters: ['memory-contract', 'filesystem-contract'],
          postgresSchema: 'portable-contract-static-check',
          status: 'passed',
        },
        null,
        2,
      ),
    );
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

await main();
