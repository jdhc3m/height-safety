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
const AUTH_SCHEMA_MIGRATION = new URL(
  '../migrations/002_identity_auth_schema.sql',
  import.meta.url,
);
const JOB_PACK_SCHEMA_MIGRATION = new URL(
  '../migrations/003_job_pack_snapshots.sql',
  import.meta.url,
);
const SYNC_RUNTIME_MIGRATION = new URL(
  '../migrations/004_sync_payload_runtime.sql',
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
  'user_invitations',
  'user_sessions',
  'job_pack_snapshots',
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

test('3A-02 and 3A-03 migrations define one tenant-scoped product schema', async () => {
  const [
    runtimeRoleMigration,
    tenantSchemaMigration,
    authSchemaMigration,
    jobPackSchemaMigration,
    syncRuntimeMigration,
  ] = await Promise.all([
    readMigration(RUNTIME_ROLE_MIGRATION),
    readMigration(TENANT_SCHEMA_MIGRATION),
    readMigration(AUTH_SCHEMA_MIGRATION),
    readMigration(JOB_PACK_SCHEMA_MIGRATION),
    readMigration(SYNC_RUNTIME_MIGRATION),
  ]);
  const productSchema = `${tenantSchemaMigration}\n${authSchemaMigration}\n${jobPackSchemaMigration}`;

  assert.match(runtimeRoleMigration, /height_safety_runtime/);
  assert.match(runtimeRoleMigration, /NOBYPASSRLS/);
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
  assert.match(
    tenantSchemaMigration,
    /left\(object_key, length\(company_id\) \+ 1\) = company_id \|\| '\/'/,
  );
  assert.match(tenantSchemaMigration, /anchor_inspections_anchor_site_fk/);
  assert.match(
    tenantSchemaMigration,
    /review_issues_anchor_inspection_inspection_fk/,
  );
  assert.match(tenantSchemaMigration, /report_revisions_snapshot_fk/);
  assert.match(tenantSchemaMigration, /inspection_snapshots_immutable/);
  assert.match(tenantSchemaMigration, /UNIQUE \(company_id, approval_id\)/);
  assert.match(tenantSchemaMigration, /disposition = 'removed_from_service'/);
  assert.match(authSchemaMigration, /user_invitations_token_hash_ck/);
  assert.match(authSchemaMigration, /user_sessions_token_hash_ck/);
  assert.match(jobPackSchemaMigration, /job_pack_snapshots_tenant_policy/);
  assert.match(syncRuntimeMigration, /location_confirmed/);
  assert.match(syncRuntimeMigration, /request_body/);

  for (const table of TENANT_TABLES) {
    assert.match(
      productSchema,
      new RegExp(`CREATE TABLE ${table} \\(`),
      `missing tenant table ${table}`,
    );
    assert.match(
      productSchema,
      new RegExp(`${table}_tenant_policy`),
      `missing tenant policy ${table}`,
    );
  }

  const migrationFiles = [
    new URL('000_runtime_role.sql', MIGRATION_DIRECTORY),
    new URL('001_initial_tenant_schema.sql', MIGRATION_DIRECTORY),
    new URL('002_identity_auth_schema.sql', MIGRATION_DIRECTORY),
    new URL('003_job_pack_snapshots.sql', MIGRATION_DIRECTORY),
    new URL('004_sync_payload_runtime.sql', MIGRATION_DIRECTORY),
  ];
  assert.deepEqual(
    migrationFiles.map((url) => url.pathname.split('/').at(-1)),
    [
      '000_runtime_role.sql',
      '001_initial_tenant_schema.sql',
      '002_identity_auth_schema.sql',
      '003_job_pack_snapshots.sql',
      '004_sync_payload_runtime.sql',
    ],
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
        new URL('../migrations/002_identity_auth_schema.sql', import.meta.url),
        JOB_PACK_SCHEMA_MIGRATION,
        SYNC_RUNTIME_MIGRATION,
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
            ('company-a', 'site-a-other', 'client-a', 'Fictional Site A Other', 'NSW'),
            ('company-b', 'site-b', 'client-b', 'Fictional Site B', 'QLD');
          INSERT INTO users
            (company_id, user_id, identity_subject, email, role)
          VALUES
            ('company-a', 'administrator-a', 'subject-admin-a', 'admin-a@example.test', 'administrator'),
            ('company-a', 'inspector-a', 'subject-a', 'a@example.test', 'inspector'),
            ('company-b', 'administrator-b', 'subject-admin-b', 'admin-b@example.test', 'administrator'),
            ('company-b', 'inspector-b', 'subject-b', 'b@example.test', 'inspector');
          INSERT INTO user_invitations
            (company_id, invitation_id, email, role, token_hash, invited_by_user_id, expires_at)
          VALUES
            ('company-a', 'invitation-a', 'new-a@example.test', 'inspector', repeat('a', 64), 'administrator-a', '2099-01-01T00:00:00Z'),
            ('company-b', 'invitation-b', 'new-b@example.test', 'office_reviewer', repeat('b', 64), 'administrator-b', '2099-01-01T00:00:00Z');
          INSERT INTO user_sessions
            (company_id, session_id, user_id, identity_subject, token_hash, mfa_satisfied, issued_at, expires_at, last_seen_at)
          VALUES
            ('company-a', 'session-a', 'inspector-a', 'subject-a', repeat('c', 64), FALSE, '2026-08-25T00:00:00Z', '2026-08-25T01:00:00Z', '2026-08-25T00:00:00Z'),
            ('company-b', 'session-b', 'inspector-b', 'subject-b', repeat('d', 64), FALSE, '2026-08-25T00:00:00Z', '2026-08-25T01:00:00Z', '2026-08-25T00:00:00Z');
          INSERT INTO anchors (company_id, anchor_id, site_id) VALUES
            ('company-a', 'anchor-a', 'site-a'),
            ('company-a', 'anchor-a-other', 'site-a-other'),
            ('company-b', 'anchor-b', 'site-b');
          INSERT INTO jobs
            (company_id, job_id, site_id, jurisdiction, reference)
          VALUES
            ('company-a', 'job-a', 'site-a', 'NSW', 'job-a-reference'),
            ('company-a', 'job-a-other', 'site-a-other', 'NSW', 'job-a-other-reference'),
            ('company-b', 'job-b', 'site-b', 'QLD', 'job-b-reference');
          INSERT INTO inspections
            (company_id, inspection_id, job_id, site_id, jurisdiction, revision_number, inspector_user_id)
          VALUES
            ('company-a', 'inspection-a', 'job-a', 'site-a', 'NSW', 1, 'inspector-a'),
            ('company-a', 'inspection-a-other', 'job-a-other', 'site-a-other', 'NSW', 1, 'inspector-a'),
            ('company-b', 'inspection-b', 'job-b', 'site-b', 'QLD', 1, 'inspector-b');
          INSERT INTO inspection_snapshots
            (company_id, snapshot_id, approval_id, inspection_id, jurisdiction, snapshot_document, sha256)
          VALUES
            ('company-a', 'snapshot-a', 'approval-a', 'inspection-a', 'NSW', '{}', 'snapshot-a-sha'),
            ('company-a', 'snapshot-a-other', 'approval-a-other', 'inspection-a-other', 'NSW', '{}', 'snapshot-a-other-sha');
          INSERT INTO anchor_inspections
            (company_id, anchor_inspection_id, inspection_id, site_id, anchor_id)
          VALUES
            ('company-a', 'anchor-inspection-a', 'inspection-a', 'site-a', 'anchor-a'),
            ('company-a', 'anchor-inspection-a-other', 'inspection-a-other', 'site-a-other', 'anchor-a-other');
          INSERT INTO reports (company_id, report_id, job_id) VALUES
            ('company-a', 'report-a', 'job-a'),
            ('company-b', 'report-b', 'job-b');
          INSERT INTO object_references
            (company_id, object_id, object_key, content_type, byte_size, sha256)
          VALUES
            ('company-a', 'report-object-a', 'company-a/reports/report-a.pdf', 'application/pdf', 1, 'report-object-a-sha');
          INSERT INTO report_revisions
            (company_id, report_revision_id, report_id, job_id, source_inspection_id, source_snapshot_id,
             jurisdiction, revision_number, template_version, generation_idempotency_key, object_id,
             sha256, created_by_user_id)
          VALUES
            ('company-a', 'revision-a', 'report-a', 'job-a', 'inspection-a', 'snapshot-a',
             'NSW', 1, 'template-1', 'generation-a', 'report-object-a', 'revision-a-sha', 'inspector-a');
        `,
        { schema },
      );

      const objectPrefixOutput = runPsql(
        `
          INSERT INTO companies (company_id, name)
          VALUES ('company_%', 'Wildcard Company');
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              INSERT INTO object_references
                (company_id, object_id, object_key, content_type, byte_size, sha256)
              VALUES
                ('company_%', 'wildcard-rejected', 'companyX/evidence/photo.jpg', 'image/jpeg', 1, 'wildcard-rejected-sha');
            EXCEPTION WHEN check_violation THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'wildcard object prefix unexpectedly succeeded';
            END IF;
          END
          $$;
          INSERT INTO object_references
            (company_id, object_id, object_key, content_type, byte_size, sha256)
          VALUES
            ('company_%', 'wildcard-accepted', 'company_%/evidence/photo.jpg', 'image/jpeg', 1, 'wildcard-accepted-sha');
          SELECT CASE
            WHEN (SELECT count(*) FROM object_references WHERE company_id = 'company_%') = 1
            THEN 'literal-object-prefix-passed'
            ELSE 'literal-object-prefix-failed'
          END;
        `,
        { schema },
      );
      assert.match(objectPrefixOutput, /literal-object-prefix-passed/);

      const roleAttributesOutput = runPsql(
        `
          SELECT CASE
            WHEN rolcanlogin = FALSE
              AND rolsuper = FALSE
              AND rolcreatedb = FALSE
              AND rolcreaterole = FALSE
              AND rolinherit = FALSE
              AND rolreplication = FALSE
              AND rolbypassrls = FALSE
              AND has_table_privilege('height_safety_runtime', current_schema() || '.audit_events', 'UPDATE') = FALSE
              AND has_table_privilege('height_safety_runtime', current_schema() || '.audit_events', 'DELETE') = FALSE
              AND has_table_privilege('height_safety_runtime', current_schema() || '.report_revisions', 'UPDATE') = FALSE
              AND has_table_privilege('height_safety_runtime', current_schema() || '.report_revisions', 'DELETE') = FALSE
              AND has_column_privilege('height_safety_runtime', current_schema() || '.report_revisions', 'superseded_at', 'UPDATE') = TRUE
              AND has_table_privilege('height_safety_runtime', current_schema() || '.inspection_snapshots', 'UPDATE') = FALSE
              AND has_table_privilege('height_safety_runtime', current_schema() || '.inspection_snapshots', 'DELETE') = FALSE
            THEN 'runtime-role-attributes-passed'
            ELSE 'runtime-role-attributes-failed'
          END
          FROM pg_roles
          WHERE rolname = 'height_safety_runtime';
        `,
        { schema },
      );
      assert.match(roleAttributesOutput, /runtime-role-attributes-passed/);

      const tenantReadOutput = runPsql(
        `
          BEGIN;
          SELECT set_config('app.company_id', 'company-a', true);
          SELECT CASE
            WHEN (SELECT count(*) FROM sites) = 2
              AND (SELECT count(*) FROM sites WHERE site_id = 'site-b') = 0
              AND (SELECT count(*) FROM clients WHERE client_id = 'client-b') = 0
              AND (SELECT count(*) FROM user_invitations) = 1
              AND (SELECT count(*) FROM user_sessions) = 1
              AND (SELECT count(*) FROM user_sessions WHERE session_id = 'session-b') = 0
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
          DO $$
          BEGIN
            BEGIN
              INSERT INTO user_sessions
                (company_id, session_id, user_id, identity_subject, token_hash, mfa_satisfied, issued_at, expires_at, last_seen_at)
              VALUES
                ('company-b', 'session-cross-tenant', 'inspector-b', 'subject-b', repeat('e', 64), FALSE, '2026-08-25T00:00:00Z', '2026-08-25T01:00:00Z', '2026-08-25T00:00:00Z');
              RAISE EXCEPTION 'cross-tenant session insert unexpectedly succeeded';
            EXCEPTION WHEN insufficient_privilege THEN
              NULL;
            END;
          END
          $$;
          UPDATE sites SET name = 'must not change' WHERE site_id = 'site-b';
          UPDATE user_sessions
          SET revoked_at = '2026-08-25T00:30:00Z'
          WHERE session_id = 'session-b';
          DELETE FROM clients WHERE client_id = 'client-b';
          SELECT CASE
            WHEN (SELECT count(*) FROM sites WHERE site_id = 'site-b') = 0
              AND (SELECT count(*) FROM clients WHERE client_id = 'client-b') = 0
              AND (SELECT count(*) FROM user_sessions WHERE session_id = 'session-b') = 0
            THEN 'tenant-write-isolation-passed'
            ELSE 'tenant-write-isolation-failed'
          END;
          ROLLBACK;
        `,
        { schema, asRuntimeRole: true },
      );
      assert.match(tenantWriteOutput, /tenant-write-isolation-passed/);

      const relationshipOutput = runPsql(
        `
          BEGIN;
          SELECT set_config('app.company_id', 'company-a', true);
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              INSERT INTO anchor_inspections
                (company_id, anchor_inspection_id, inspection_id, site_id, anchor_id)
              VALUES
                ('company-a', 'anchor-inspection-wrong-site', 'inspection-a', 'site-a', 'anchor-a-other');
            EXCEPTION WHEN foreign_key_violation THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'cross-site anchor inspection unexpectedly succeeded';
            END IF;
          END
          $$;
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              INSERT INTO review_issues
                (company_id, review_issue_id, inspection_id, anchor_inspection_id, issue_type, reason)
              VALUES
                ('company-a', 'review-issue-cross-job', 'inspection-a', 'anchor-inspection-a-other', 'conflict', 'cross-job fixture');
            EXCEPTION WHEN foreign_key_violation THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'cross-job review issue unexpectedly succeeded';
            END IF;
          END
          $$;
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              INSERT INTO anchor_inspections
                (company_id, anchor_inspection_id, inspection_id, site_id, anchor_id, recorded_outcome, exception_reason)
              VALUES
                ('company-a', 'anchor-inspection-inaccessible', 'inspection-a', 'site-a', 'anchor-a', 'serviceable', 'inaccessible');
            EXCEPTION WHEN check_violation THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'inaccessible serviceable record unexpectedly succeeded';
            END IF;
          END
          $$;
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              INSERT INTO anchor_inspections
                (company_id, anchor_inspection_id, inspection_id, site_id, anchor_id, recorded_outcome)
              VALUES
                ('company-a', 'anchor-inspection-no-exception', 'inspection-a', 'site-a', 'anchor-a', 'not_inspected');
            EXCEPTION WHEN check_violation THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'not-inspected record without exception unexpectedly succeeded';
            END IF;
          END
          $$;
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              INSERT INTO anchor_inspections
                (company_id, anchor_inspection_id, inspection_id, site_id, anchor_id, recorded_outcome, disposition)
              VALUES
                ('company-a', 'anchor-inspection-replaced', 'inspection-a', 'site-a', 'anchor-a', 'serviceable', 'replaced');
            EXCEPTION WHEN check_violation THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'replacement disposition unexpectedly succeeded';
            END IF;
          END
          $$;
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              INSERT INTO report_revisions
                (company_id, report_revision_id, report_id, job_id, source_inspection_id, source_snapshot_id,
                 jurisdiction, revision_number, template_version, generation_idempotency_key, object_id,
                 sha256, created_by_user_id)
              VALUES
                ('company-a', 'revision-cross-job', 'report-a', 'job-a', 'inspection-a-other', 'snapshot-a',
                 'NSW', 2, 'template-1', 'generation-cross-job', 'report-object-a', 'revision-sha', 'inspector-a');
            EXCEPTION WHEN foreign_key_violation THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'cross-job report revision unexpectedly succeeded';
            END IF;
          END
          $$;
          UPDATE report_revisions
          SET superseded_at = '2026-08-25T00:00:00Z'
          WHERE report_revision_id = 'revision-a';
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              UPDATE report_revisions SET sha256 = 'changed'
              WHERE report_revision_id = 'revision-a';
            EXCEPTION WHEN OTHERS THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'report revision content update unexpectedly succeeded';
            END IF;
          END
          $$;
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              DELETE FROM report_revisions WHERE report_revision_id = 'revision-a';
            EXCEPTION WHEN OTHERS THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'report revision delete unexpectedly succeeded';
            END IF;
          END
          $$;
          INSERT INTO audit_events
            (company_id, audit_event_id, action, target_type, target_id)
          VALUES
            ('company-a', 'audit-event-a', 'created', 'fixture', 'fixture-a');
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              UPDATE audit_events SET action = 'changed'
              WHERE audit_event_id = 'audit-event-a';
            EXCEPTION WHEN OTHERS THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'audit update unexpectedly succeeded';
            END IF;
          END
          $$;
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              DELETE FROM audit_events WHERE audit_event_id = 'audit-event-a';
            EXCEPTION WHEN OTHERS THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'audit delete unexpectedly succeeded';
            END IF;
          END
          $$;
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              UPDATE inspection_snapshots SET sha256 = 'changed'
              WHERE snapshot_id = 'snapshot-a';
            EXCEPTION WHEN OTHERS THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'snapshot update unexpectedly succeeded';
            END IF;
          END
          $$;
          DO $$
          DECLARE rejected boolean := FALSE;
          BEGIN
            BEGIN
              DELETE FROM inspection_snapshots WHERE snapshot_id = 'snapshot-a';
            EXCEPTION WHEN OTHERS THEN
              rejected := TRUE;
            END;
            IF NOT rejected THEN
              RAISE EXCEPTION 'snapshot delete unexpectedly succeeded';
            END IF;
          END
          $$;
          SELECT CASE
            WHEN (SELECT count(*) FROM audit_events WHERE audit_event_id = 'audit-event-a' AND action = 'created') = 1
              AND (SELECT sha256 FROM inspection_snapshots WHERE snapshot_id = 'snapshot-a') = 'snapshot-a-sha'
              AND (SELECT sha256 FROM report_revisions WHERE report_revision_id = 'revision-a') = 'revision-a-sha'
              AND (SELECT superseded_at FROM report_revisions WHERE report_revision_id = 'revision-a') = '2026-08-25 00:00:00+00'
            THEN 'relationship-and-immutability-passed'
            ELSE 'relationship-and-immutability-failed'
          END;
          ROLLBACK;
        `,
        { schema, asRuntimeRole: true },
      );
      assert.match(relationshipOutput, /relationship-and-immutability-passed/);

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
