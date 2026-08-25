import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const MIGRATION_DIRECTORY = new URL('../migrations/', import.meta.url);
const RUNTIME_ROLE_MIGRATION = new URL(
  '../migrations/000_runtime_role.sql',
  import.meta.url,
);
const TENANT_SCHEMA_MIGRATION = new URL(
  '../migrations/001_initial_tenant_schema.sql',
  import.meta.url,
);
const TENANT_TABLES = [
  'companies',
  'users',
  'clients',
  'sites',
  'anchors',
  'jobs',
  'job_assignments',
  'inspections',
  'anchor_inspections',
  'observations',
  'defects',
  'recommendations',
  'object_references',
  'photos',
  'inspection_snapshots',
  'reports',
  'report_revisions',
  'review_issues',
  'review_actions',
  'sync_mutations',
  'outbox_items',
  'audit_events',
];

const databaseUrl = process.env.TEST_POSTGRES_URL;
const migrationPermission = process.env.TEST_POSTGRES_ALLOW_MIGRATION;
const psqlBinary = process.env.PSQL_BIN || 'psql';

function quoteIdentifier(identifier) {
  assert.match(identifier, /^[a-z0-9_]+$/);
  return `"${identifier}"`;
}

function runPsql(sql, { schema, asRuntimeRole = false } = {}) {
  const prelude = schema
    ? `SET search_path TO ${quoteIdentifier(schema)};`
    : '';
  const role = asRuntimeRole ? 'SET ROLE height_safety_runtime;' : '';
  const result = spawnSync(
    psqlBinary,
    [databaseUrl, '-X', '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-q'],
    {
      encoding: 'utf8',
      input: `${prelude}\n${role}\n${sql}\n`,
    },
  );

  if (result.error) {
    throw result.error;
  }
  assert.equal(
    result.status,
    0,
    `psql failed:\n${result.stdout}\n${result.stderr}`,
  );
  return result.stdout.trim();
}

async function readMigration(url) {
  return readFile(url, 'utf8');
}

test('3A-02 migrations define one tenant-scoped product schema', async () => {
  const [runtimeRoleMigration, tenantSchemaMigration] = await Promise.all([
    readMigration(RUNTIME_ROLE_MIGRATION),
    readMigration(TENANT_SCHEMA_MIGRATION),
  ]);

  assert.match(runtimeRoleMigration, /height_safety_runtime/);
  assert.match(
    tenantSchemaMigration,
    /CREATE FUNCTION height_safety_current_company_id/,
  );
  assert.match(tenantSchemaMigration, /FORCE ROW LEVEL SECURITY/);
  assert.match(
    tenantSchemaMigration,
    /WITH CHECK \(company_id = height_safety_current_company_id\(\)\)/,
  );
  assert.match(tenantSchemaMigration, /FOREIGN KEY \(company_id, client_id\)/);
  assert.match(
    tenantSchemaMigration,
    /FOREIGN KEY \(company_id, site_id, jurisdiction\)/,
  );
  assert.match(tenantSchemaMigration, /UNIQUE \(company_id, idempotency_key\)/);
  assert.match(tenantSchemaMigration, /object_key LIKE company_id \|\| '\/%'/);

  for (const table of TENANT_TABLES) {
    assert.match(
      tenantSchemaMigration,
      new RegExp(`CREATE TABLE ${table} \\(`),
      `missing tenant table ${table}`,
    );
    assert.match(
      tenantSchemaMigration,
      new RegExp(`${table}_tenant_policy`),
      `missing tenant policy ${table}`,
    );
  }

  const migrationFiles = [
    new URL('000_runtime_role.sql', MIGRATION_DIRECTORY),
    new URL('001_initial_tenant_schema.sql', MIGRATION_DIRECTORY),
  ];
  assert.deepEqual(
    migrationFiles.map((url) => url.pathname.split('/').at(-1)),
    ['000_runtime_role.sql', '001_initial_tenant_schema.sql'],
  );
});

test(
  'PostgreSQL tenant isolation rejects cross-company reads and writes',
  {
    skip: databaseUrl
      ? false
      : 'set TEST_POSTGRES_URL to run PostgreSQL integration checks',
  },
  async () => {
    assert.equal(
      migrationPermission,
      '1',
      'TEST_POSTGRES_ALLOW_MIGRATION=1 is required when TEST_POSTGRES_URL is set',
    );

    const schema = `hs_3a02_${randomBytes(6).toString('hex')}`;
    try {
      runPsql(`CREATE SCHEMA ${quoteIdentifier(schema)};`);

      for (const migrationUrl of [
        RUNTIME_ROLE_MIGRATION,
        TENANT_SCHEMA_MIGRATION,
      ]) {
        const migration = await readMigration(migrationUrl);
        runPsql(migration, { schema });
      }

      runPsql(
        `
          INSERT INTO companies (company_id, name) VALUES
            ('company-a', 'Fictional Company A'),
            ('company-b', 'Fictional Company B');
          INSERT INTO clients (company_id, client_id, name) VALUES
            ('company-a', 'client-a', 'Fictional Client A'),
            ('company-b', 'client-b', 'Fictional Client B');
          INSERT INTO sites
            (company_id, site_id, client_id, name, jurisdiction)
          VALUES
            ('company-a', 'site-a', 'client-a', 'Fictional Site A', 'NSW'),
            ('company-b', 'site-b', 'client-b', 'Fictional Site B', 'QLD');
        `,
        { schema },
      );

      const tenantReadOutput = runPsql(
        `
          BEGIN;
          SELECT set_config('app.company_id', 'company-a', true);
          SELECT CASE
            WHEN (SELECT count(*) FROM sites) = 1
              AND (SELECT count(*) FROM sites WHERE site_id = 'site-b') = 0
              AND (SELECT count(*) FROM clients WHERE client_id = 'client-b') = 0
            THEN 'tenant-read-isolation-passed'
            ELSE 'tenant-read-isolation-failed'
          END;
          COMMIT;
        `,
        { schema, asRuntimeRole: true },
      );
      assert.match(tenantReadOutput, /tenant-read-isolation-passed/);

      const tenantWriteOutput = runPsql(
        `
          BEGIN;
          SELECT set_config('app.company_id', 'company-a', true);
          DO $$
          BEGIN
            BEGIN
              INSERT INTO clients (company_id, client_id, name)
              VALUES ('company-b', 'client-forbidden', 'forbidden');
              RAISE EXCEPTION 'cross-tenant insert unexpectedly succeeded';
            EXCEPTION WHEN insufficient_privilege THEN
              NULL;
            END;
          END
          $$;
          DO $$
          BEGIN
            BEGIN
              INSERT INTO sites
                (company_id, site_id, client_id, name, jurisdiction)
              VALUES
                ('company-a', 'site-cross-tenant', 'client-b', 'forbidden', 'NSW');
              RAISE EXCEPTION 'cross-tenant foreign-key write unexpectedly succeeded';
            EXCEPTION WHEN foreign_key_violation THEN
              NULL;
            END;
          END
          $$;
          UPDATE sites SET name = 'must not change' WHERE site_id = 'site-b';
          DELETE FROM clients WHERE client_id = 'client-b';
          SELECT CASE
            WHEN (SELECT count(*) FROM sites WHERE site_id = 'site-b') = 0
              AND (SELECT count(*) FROM clients WHERE client_id = 'client-b') = 0
            THEN 'tenant-write-isolation-passed'
            ELSE 'tenant-write-isolation-failed'
          END;
          ROLLBACK;
        `,
        { schema, asRuntimeRole: true },
      );
      assert.match(tenantWriteOutput, /tenant-write-isolation-passed/);

      const ownerVerificationOutput = runPsql(
        `
          SELECT CASE
            WHEN (SELECT count(*) FROM sites WHERE site_id = 'site-b' AND name = 'Fictional Site B') = 1
              AND (SELECT count(*) FROM clients WHERE client_id = 'client-b') = 1
            THEN 'cross-tenant-write-preservation-passed'
            ELSE 'cross-tenant-write-preservation-failed'
          END;
        `,
        { schema },
      );
      assert.match(
        ownerVerificationOutput,
        /cross-tenant-write-preservation-passed/,
      );

      const noContextOutput = runPsql(
        `
          BEGIN;
          SELECT set_config('app.company_id', '', true);
          SELECT CASE
            WHEN (SELECT count(*) FROM companies) = 0
            THEN 'missing-context-read-passed'
            ELSE 'missing-context-read-failed'
          END;
          DO $$
          BEGIN
            BEGIN
              INSERT INTO companies (company_id, name)
              VALUES ('company-c', 'must not be visible');
              RAISE EXCEPTION 'write without tenant context unexpectedly succeeded';
            EXCEPTION WHEN insufficient_privilege THEN
              NULL;
            END;
          END
          $$;
          COMMIT;
        `,
        { schema, asRuntimeRole: true },
      );
      assert.match(noContextOutput, /missing-context-read-passed/);
    } finally {
      runPsql(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE;`);
    }
  },
);
