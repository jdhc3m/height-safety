import { randomBytes } from 'node:crypto';

import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type {
  SqlDatabase,
  SqlResult,
  SqlTransaction,
} from '../database/postgres-database';
import { SYNC_MUTATION_ENTITY_TYPES } from '../sync/sync.types';
import { ReportGenerationFailure } from './report-generation.types';
import type {
  EnqueueReportGenerationInput,
  ReportArtifactMetadata,
  ReportGenerationClaim,
  ReportGenerationListFilter,
  ReportGenerationRecord,
  ReportGenerationStore,
  ReportRevisionRecord,
} from './report-generation.types';

interface GenerationRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly generation_id: unknown;
  readonly generation_idempotency_key: unknown;
  readonly report_id: unknown;
  readonly report_revision_id: unknown;
  readonly job_id: unknown;
  readonly source_inspection_id: unknown;
  readonly source_snapshot_id: unknown;
  readonly source_snapshot_sha256: unknown;
  readonly jurisdiction: unknown;
  readonly template_version: unknown;
  readonly created_by_user_id: unknown;
  readonly reviewed_by_user_id: unknown;
  readonly requested_at: unknown;
  readonly status: unknown;
  readonly revision_number: unknown;
  readonly attempt_count: unknown;
  readonly last_failure_code: unknown;
  readonly completed_at: unknown;
  readonly lease_token?: unknown;
  readonly lease_expires_at?: unknown;
  readonly source_inspection_revision?: unknown;
}

interface SnapshotIdentityRow extends Record<string, unknown> {
  readonly inspection_id: unknown;
  readonly jurisdiction: unknown;
  readonly sha256: unknown;
}

interface ReportIdRow extends Record<string, unknown> {
  readonly report_id: unknown;
}

interface NextRevisionRow extends Record<string, unknown> {
  readonly next_revision: unknown;
}

interface LatestRevisionRow extends Record<string, unknown> {
  readonly latest_revision: unknown;
}

interface JobStateRow extends Record<string, unknown> {
  readonly workflow_status: unknown;
  readonly latest_revision: unknown;
}

interface RevisionRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly report_revision_id: unknown;
  readonly report_id: unknown;
  readonly job_id: unknown;
  readonly source_inspection_id: unknown;
  readonly source_inspection_revision: unknown;
  readonly source_snapshot_id: unknown;
  readonly jurisdiction: unknown;
  readonly revision_number: unknown;
  readonly template_version: unknown;
  readonly generation_idempotency_key: unknown;
  readonly object_id: unknown;
  readonly object_key: unknown;
  readonly sha256: unknown;
  readonly byte_size: unknown;
  readonly created_by_user_id: unknown;
  readonly reviewed_by_user_id: unknown;
  readonly created_at: unknown;
  readonly superseded_at: unknown;
}

const GENERATION_COLUMNS = `
  company_id,
  generation_id,
  generation_idempotency_key,
  report_id,
  report_revision_id,
  job_id,
  source_inspection_id,
  source_snapshot_id,
  source_snapshot_sha256,
  jurisdiction,
  template_version,
  created_by_user_id,
  reviewed_by_user_id,
  requested_at,
  status,
  revision_number,
  attempt_count,
  last_failure_code,
  completed_at
`;

const GENERATION_SELECT_COLUMNS = `
  generation.company_id,
  generation.generation_id,
  generation.generation_idempotency_key,
  generation.report_id,
  generation.report_revision_id,
  generation.job_id,
  generation.source_inspection_id,
  generation.source_snapshot_id,
  generation.source_snapshot_sha256,
  generation.jurisdiction,
  generation.template_version,
  generation.created_by_user_id,
  generation.reviewed_by_user_id,
  generation.requested_at,
  generation.status,
  generation.revision_number,
  generation.attempt_count,
  generation.last_failure_code,
  generation.completed_at,
  generation.lease_expires_at
`;

const REVISION_COLUMNS = `
  revision.company_id,
  revision.report_revision_id,
  revision.report_id,
  revision.job_id,
  revision.source_inspection_id,
  inspection.revision_number AS source_inspection_revision,
  revision.source_snapshot_id,
  revision.jurisdiction,
  revision.revision_number,
  revision.template_version,
  revision.generation_idempotency_key,
  revision.object_id,
  object.object_key,
  revision.sha256,
  object.byte_size,
  revision.created_by_user_id,
  revision.reviewed_by_user_id,
  revision.created_at,
  revision.superseded_at
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function firstRow<Row extends Record<string, unknown>>(
  result: SqlResult<Row>,
): Row | undefined {
  return result.rows[0];
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      `report persistence returned invalid ${field}`,
    );
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  return value === null || value === undefined
    ? null
    : requiredString(value, field);
}

function requiredInteger(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      `report persistence returned invalid ${field}`,
    );
  }
  return number;
}

function nullableInteger(value: unknown, field: string): number | null {
  return value === null || value === undefined
    ? null
    : requiredInteger(value, field);
}

function requiredDate(value: unknown, field: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      `report persistence returned invalid ${field}`,
    );
  }
  return date;
}

function nullableDate(value: unknown, field: string): Date | null {
  return value === null || value === undefined
    ? null
    : requiredDate(value, field);
}

function requiredJurisdiction(value: unknown): 'NSW' | 'QLD' {
  if (value !== 'NSW' && value !== 'QLD') {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'report persistence returned an unsupported jurisdiction',
    );
  }
  return value;
}

function parseStatus(value: unknown): ReportGenerationRecord['status'] {
  if (
    value !== 'queued' &&
    value !== 'processing' &&
    value !== 'completed' &&
    value !== 'failed' &&
    value !== 'superseded'
  ) {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'report persistence returned an invalid generation status',
    );
  }
  return value;
}

function parseGeneration(
  row: GenerationRow,
  companyId: string,
): ReportGenerationRecord {
  const rowCompanyId = requiredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'report persistence crossed company scope',
    );
  }
  return {
    companyId: rowCompanyId,
    generationId: requiredString(row.generation_id, 'generation_id'),
    idempotencyKey: requiredString(
      row.generation_idempotency_key,
      'generation_idempotency_key',
    ),
    reportId: requiredString(row.report_id, 'report_id'),
    reportRevisionId: requiredString(
      row.report_revision_id,
      'report_revision_id',
    ),
    jobId: requiredString(row.job_id, 'job_id'),
    sourceInspectionId: requiredString(
      row.source_inspection_id,
      'source_inspection_id',
    ),
    snapshotId: requiredString(row.source_snapshot_id, 'source_snapshot_id'),
    snapshotSha256: requiredString(
      row.source_snapshot_sha256,
      'source_snapshot_sha256',
    ),
    jurisdiction: requiredJurisdiction(row.jurisdiction),
    sourceInspectionRevision: requiredInteger(
      row.source_inspection_revision,
      'source_inspection_revision',
    ),
    templateVersion: requiredString(row.template_version, 'template_version'),
    createdByUserId: requiredString(
      row.created_by_user_id,
      'created_by_user_id',
    ),
    reviewedByUserId: requiredString(
      row.reviewed_by_user_id,
      'reviewed_by_user_id',
    ),
    requestedAt: requiredDate(row.requested_at, 'requested_at'),
    status: parseStatus(row.status),
    revisionNumber: nullableInteger(row.revision_number, 'revision_number'),
    attemptCount: storedCount(row.attempt_count, 'attempt_count'),
    lastFailureCode: nullableString(row.last_failure_code, 'last_failure_code'),
    completedAt: nullableDate(row.completed_at, 'completed_at'),
  };
}

function parseRevision(
  row: RevisionRow,
  companyId: string,
): ReportRevisionRecord {
  const rowCompanyId = requiredString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'report revision persistence crossed company scope',
    );
  }
  const sha256 = requiredString(row.sha256, 'sha256');
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'report revision persistence returned an invalid checksum',
    );
  }
  const byteSize =
    typeof row.byte_size === 'number' ? row.byte_size : Number(row.byte_size);
  if (!Number.isSafeInteger(byteSize) || byteSize < 1) {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'report revision persistence returned an invalid byte size',
    );
  }
  return {
    companyId: rowCompanyId,
    reportRevisionId: requiredString(
      row.report_revision_id,
      'report_revision_id',
    ),
    reportId: requiredString(row.report_id, 'report_id'),
    jobId: requiredString(row.job_id, 'job_id'),
    sourceInspectionId: requiredString(
      row.source_inspection_id,
      'source_inspection_id',
    ),
    sourceInspectionRevision: requiredInteger(
      row.source_inspection_revision,
      'source_inspection_revision',
    ),
    sourceSnapshotId: requiredString(
      row.source_snapshot_id,
      'source_snapshot_id',
    ),
    jurisdiction: requiredJurisdiction(row.jurisdiction),
    revisionNumber: requiredInteger(row.revision_number, 'revision_number'),
    templateVersion: requiredString(row.template_version, 'template_version'),
    idempotencyKey: requiredString(
      row.generation_idempotency_key,
      'generation_idempotency_key',
    ),
    objectId: requiredString(row.object_id, 'object_id'),
    objectKey: requiredString(row.object_key, 'object_key'),
    sha256,
    byteSize,
    createdByUserId: requiredString(
      row.created_by_user_id,
      'created_by_user_id',
    ),
    reviewedByUserId: requiredString(
      row.reviewed_by_user_id,
      'reviewed_by_user_id',
    ),
    createdAt: requiredDate(row.created_at, 'created_at'),
    supersededAt: nullableDate(row.superseded_at, 'superseded_at'),
  };
}

function storedCount(value: unknown, field: string): number {
  const count = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      `report persistence returned invalid ${field}`,
    );
  }
  return count;
}

function affectedRows(result: SqlResult<Record<string, unknown>>): number {
  return result.rowCount ?? result.rows.length;
}

function errorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === 'string'
    ? error.code
    : undefined;
}

function mapPersistenceError(error: unknown, message: string): never {
  if (error instanceof ReportGenerationFailure) throw error;
  switch (errorCode(error)) {
    case '23503':
      throw new ReportGenerationFailure(
        'NOT_FOUND',
        'report source was not found',
      );
    case '23505':
      throw new ReportGenerationFailure(
        'CONFLICT',
        'report generation already exists',
      );
    case '23514':
      throw new ReportGenerationFailure(
        'INVALID_INPUT',
        'report record violates a supported constraint',
      );
    default:
      throw new ReportGenerationFailure('PERSISTENCE_UNAVAILABLE', message);
  }
}

export class PostgresReportGenerationStore implements ReportGenerationStore {
  constructor(private readonly database: SqlDatabase) {}

  async enqueue(
    input: EnqueueReportGenerationInput,
  ): Promise<ReportGenerationRecord> {
    try {
      return await this.withTenant(input.companyId, async (transaction) => {
        const snapshotRow = firstRow(
          await transaction.query<SnapshotIdentityRow>(
            `
              SELECT inspection_id, jurisdiction, sha256
              FROM inspection_snapshots
              WHERE company_id = $1 AND snapshot_id = $2
            `,
            [input.companyId, input.snapshot.snapshotId],
          ),
        );
        if (!snapshotRow) {
          throw new ReportGenerationFailure(
            'NOT_FOUND',
            'approved snapshot was not found',
          );
        }
        if (
          snapshotRow.inspection_id !== input.snapshot.sourceInspectionId ||
          snapshotRow.jurisdiction !== input.snapshot.jurisdiction ||
          snapshotRow.sha256 !== input.snapshot.sha256
        ) {
          throw new ReportGenerationFailure(
            'CONFLICT',
            'approved snapshot identity does not match durable persistence',
          );
        }

        await transaction.query(
          `
            INSERT INTO reports (company_id, report_id, job_id, created_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (company_id, job_id) DO NOTHING
          `,
          [
            input.companyId,
            input.reportId,
            input.snapshot.jobId,
            input.requestedAt,
          ],
        );
        const reportRow = firstRow(
          await transaction.query<ReportIdRow>(
            'SELECT report_id FROM reports WHERE company_id = $1 AND job_id = $2',
            [input.companyId, input.snapshot.jobId],
          ),
        );
        if (!reportRow) {
          throw new ReportGenerationFailure(
            'PERSISTENCE_UNAVAILABLE',
            'report identity was not returned by persistence',
          );
        }
        const reportId = requiredString(reportRow.report_id, 'report_id');

        const insertedGeneration = await transaction.query(
          `
            INSERT INTO report_generation_jobs (
              company_id, generation_id, generation_idempotency_key, report_id,
              report_revision_id, job_id, source_inspection_id,
              source_snapshot_id, source_snapshot_sha256, jurisdiction,
              template_version, created_by_user_id, reviewed_by_user_id,
              requested_at, available_at, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
              $14, $14, $14, $14
            )
            ON CONFLICT (company_id, generation_idempotency_key) DO NOTHING
          `,
          [
            input.companyId,
            input.generationId,
            input.idempotencyKey,
            reportId,
            input.reportRevisionId,
            input.snapshot.jobId,
            input.snapshot.sourceInspectionId,
            input.snapshot.snapshotId,
            input.snapshot.sha256,
            input.snapshot.jurisdiction,
            input.templateVersion,
            input.createdByUserId,
            input.reviewedByUserId,
            input.requestedAt,
          ],
        );
        const row = firstRow(
          await transaction.query<GenerationRow>(
            `
              SELECT ${GENERATION_SELECT_COLUMNS},
                     inspection.revision_number AS source_inspection_revision
              FROM report_generation_jobs generation
              JOIN inspections inspection
                ON inspection.company_id = generation.company_id
               AND inspection.inspection_id = generation.source_inspection_id
              WHERE generation.company_id = $1
                AND generation.generation_idempotency_key = $2
            `,
            [input.companyId, input.idempotencyKey],
          ),
        );
        if (!row) {
          throw new ReportGenerationFailure(
            'PERSISTENCE_UNAVAILABLE',
            'report generation was not returned by persistence',
          );
        }
        const generation = parseGeneration(row, input.companyId);
        if (
          generation.snapshotId !== input.snapshot.snapshotId ||
          generation.snapshotSha256 !== input.snapshot.sha256 ||
          generation.jobId !== input.snapshot.jobId ||
          generation.sourceInspectionId !== input.snapshot.sourceInspectionId ||
          generation.templateVersion !== input.templateVersion ||
          generation.jurisdiction !== input.snapshot.jurisdiction ||
          generation.reportId !== reportId
        ) {
          throw new ReportGenerationFailure(
            'CONFLICT',
            'generation idempotency key was reused for different report inputs',
          );
        }
        if (affectedRows(insertedGeneration) === 1) {
          await transaction.query(
            `
              INSERT INTO audit_events (
                company_id, audit_event_id, actor_user_id, action,
                target_type, target_id, transition_metadata, occurred_at
              ) VALUES ($1, $2, $3, 'report.generation_requested',
                       'report_generation', $4, $5, $6)
            `,
            [
              generation.companyId,
              randomBytes(16).toString('hex'),
              generation.createdByUserId,
              generation.generationId,
              JSON.stringify({
                snapshotId: generation.snapshotId,
                sourceInspectionRevision: generation.sourceInspectionRevision,
                jurisdiction: generation.jurisdiction,
                templateVersion: generation.templateVersion,
              }),
              generation.requestedAt,
            ],
          );
        }
        return generation;
      });
    } catch (error) {
      return mapPersistenceError(
        error,
        'report generation could not be queued',
      );
    }
  }

  async findGeneration(
    companyId: string,
    generationId: string,
  ): Promise<ReportGenerationRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const row = firstRow(
        await transaction.query<GenerationRow>(
          `
            SELECT ${GENERATION_SELECT_COLUMNS},
                   inspection.revision_number AS source_inspection_revision
            FROM report_generation_jobs generation
            JOIN inspections inspection
              ON inspection.company_id = generation.company_id
             AND inspection.inspection_id = generation.source_inspection_id
            WHERE generation.company_id = $1 AND generation.generation_id = $2
          `,
          [companyId, generationId],
        ),
      );
      return row ? parseGeneration(row, companyId) : undefined;
    });
  }

  async listGenerations(
    companyId: string,
    filter: ReportGenerationListFilter,
  ): Promise<readonly ReportGenerationRecord[]> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<GenerationRow>(
        `
          SELECT ${GENERATION_SELECT_COLUMNS},
                 inspection.revision_number AS source_inspection_revision
          FROM report_generation_jobs generation
          JOIN inspections inspection
            ON inspection.company_id = generation.company_id
           AND inspection.inspection_id = generation.source_inspection_id
          WHERE generation.company_id = $1
            AND ($2::text IS NULL OR generation.job_id = $2)
          ORDER BY generation.requested_at DESC, generation.generation_id DESC
        `,
        [companyId, filter.jobId],
      );
      return result.rows.map((row) => parseGeneration(row, companyId));
    });
  }

  async claimNext(
    companyId: string,
    now: Date,
    leaseToken: string,
    leaseDurationMs: number,
  ): Promise<ReportGenerationClaim | undefined> {
    if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs < 1_000) {
      throw new ReportGenerationFailure(
        'INVALID_INPUT',
        'report generation lease duration is invalid',
      );
    }
    return this.withTenant(companyId, async (transaction) => {
      const row = firstRow(
        await transaction.query<GenerationRow>(
          `
            SELECT ${GENERATION_SELECT_COLUMNS},
                   inspection.revision_number AS source_inspection_revision
            FROM report_generation_jobs generation
            JOIN inspections inspection
              ON inspection.company_id = generation.company_id
             AND inspection.inspection_id = generation.source_inspection_id
            WHERE generation.company_id = $1
              AND (
                (generation.status = 'queued' AND generation.available_at <= $2)
                OR
                (generation.status = 'processing' AND generation.lease_expires_at <= $2)
              )
            ORDER BY generation.requested_at ASC, generation.generation_id ASC
            LIMIT 1
            FOR UPDATE OF generation SKIP LOCKED
          `,
          [companyId, now],
        ),
      );
      if (!row) return undefined;
      const generation = parseGeneration(row, companyId);
      const jobState = await this.readCurrentJobState(
        transaction,
        companyId,
        generation.jobId,
      );
      if (
        !jobState ||
        jobState.latestRevision !== generation.sourceInspectionRevision ||
        (jobState.workflowStatus !== 'approved_for_report_generation' &&
          jobState.workflowStatus !== 'report_generated')
      ) {
        await transaction.query(
          `
            UPDATE report_generation_jobs
            SET status = 'superseded', revision_number = NULL,
                lease_token = NULL, lease_expires_at = NULL,
                last_failure_code = 'STALE_SOURCE_REVISION', updated_at = $3
            WHERE company_id = $1 AND generation_id = $2
          `,
          [companyId, generation.generationId, now],
        );
        return undefined;
      }

      let revisionNumber = generation.revisionNumber;
      if (revisionNumber === null) {
        await transaction.query(
          `
            SELECT pg_advisory_xact_lock(
              hashtextextended(concat_ws(':', $1::text, 'report_revision', $2::text), 0)
            )
          `,
          [companyId, generation.reportId],
        );
        const next = firstRow(
          await transaction.query<NextRevisionRow>(
            `
              SELECT GREATEST(
                COALESCE((
                  SELECT MAX(revision_number)
                  FROM report_revisions
                  WHERE company_id = $1 AND report_id = $2
                ), 0),
                COALESCE((
                  SELECT MAX(revision_number)
                  FROM report_generation_jobs
                  WHERE company_id = $1 AND report_id = $2
                    AND generation_id <> $3
                    AND status IN ('queued', 'processing')
                    AND revision_number IS NOT NULL
                ), 0)
              ) + 1 AS next_revision
            `,
            [companyId, generation.reportId, generation.generationId],
          ),
        );
        revisionNumber = requiredInteger(next?.next_revision, 'next_revision');
      }

      const updated = firstRow(
        await transaction.query<GenerationRow>(
          `
            UPDATE report_generation_jobs
            SET status = 'processing', revision_number = $3,
                attempt_count = attempt_count + 1, lease_token = $4,
                lease_expires_at = $5, updated_at = $2
            WHERE company_id = $1 AND generation_id = $6
            RETURNING ${GENERATION_COLUMNS}
          `,
          [
            companyId,
            now,
            revisionNumber,
            leaseToken,
            new Date(now.getTime() + leaseDurationMs),
            generation.generationId,
          ],
        ),
      );
      if (!updated) {
        throw new ReportGenerationFailure(
          'PERSISTENCE_UNAVAILABLE',
          'report generation claim was not returned by persistence',
        );
      }
      return {
        ...parseGeneration(
          {
            ...updated,
            source_inspection_revision: generation.sourceInspectionRevision,
          },
          companyId,
        ),
        leaseToken,
      };
    });
  }

  async complete(
    claim: ReportGenerationClaim,
    artifact: ReportArtifactMetadata,
    completedAt: Date,
  ): Promise<ReportRevisionRecord | undefined> {
    return this.withTenant(claim.companyId, async (transaction) => {
      await transaction.query(
        `
          SELECT pg_advisory_xact_lock(
            hashtextextended(concat_ws(':', $1::text, $2::text, $3::text), 0)
          )
        `,
        [claim.companyId, SYNC_MUTATION_ENTITY_TYPES[0], claim.jobId],
      );
      const generationRow = firstRow(
        await transaction.query<GenerationRow & Record<string, unknown>>(
          `
            SELECT ${GENERATION_SELECT_COLUMNS},
                   inspection.revision_number AS source_inspection_revision,
                   generation.lease_token
            FROM report_generation_jobs generation
            JOIN inspections inspection
              ON inspection.company_id = generation.company_id
             AND inspection.inspection_id = generation.source_inspection_id
            WHERE generation.company_id = $1 AND generation.generation_id = $2
            FOR UPDATE OF generation
          `,
          [claim.companyId, claim.generationId],
        ),
      );
      if (
        !generationRow ||
        generationRow.status !== 'processing' ||
        generationRow.lease_token !== claim.leaseToken ||
        !(
          requiredDate(generationRow.lease_expires_at, 'lease_expires_at') >
          completedAt
        )
      ) {
        throw new ReportGenerationFailure(
          'CONFLICT',
          'report generation lease is no longer current',
        );
      }

      const jobState = await this.readCurrentJobState(
        transaction,
        claim.companyId,
        claim.jobId,
      );
      if (
        !jobState ||
        jobState.latestRevision !== claim.sourceInspectionRevision ||
        (jobState.workflowStatus !== 'approved_for_report_generation' &&
          jobState.workflowStatus !== 'report_generated')
      ) {
        await transaction.query(
          `
            UPDATE report_generation_jobs
            SET status = 'superseded', revision_number = NULL,
                lease_token = NULL, lease_expires_at = NULL,
                last_failure_code = 'STALE_SOURCE_REVISION', updated_at = $3
            WHERE company_id = $1 AND generation_id = $2
          `,
          [claim.companyId, claim.generationId, completedAt],
        );
        return undefined;
      }

      const replay = firstRow(
        await transaction.query<RevisionRow>(
          `
            SELECT ${REVISION_COLUMNS}
            FROM report_revisions revision
            JOIN object_references object
              ON object.company_id = revision.company_id
             AND object.object_id = revision.object_id
            JOIN inspections inspection
              ON inspection.company_id = revision.company_id
             AND inspection.inspection_id = revision.source_inspection_id
            WHERE revision.company_id = $1
              AND revision.generation_idempotency_key = $2
          `,
          [claim.companyId, claim.idempotencyKey],
        ),
      );
      if (replay) {
        await transaction.query(
          `
            UPDATE report_generation_jobs
            SET status = 'completed', lease_token = NULL,
                lease_expires_at = NULL, completed_at = $3,
                last_failure_code = NULL, updated_at = $3
            WHERE company_id = $1 AND generation_id = $2
          `,
          [claim.companyId, claim.generationId, completedAt],
        );
        return parseRevision(replay, claim.companyId);
      }

      await transaction.query(
        `
          INSERT INTO object_references (
            company_id, object_id, object_key, content_type, byte_size,
            sha256, created_at
          ) VALUES ($1, $2, $3, 'application/pdf', $4, $5, $6)
          ON CONFLICT (company_id, object_key) DO NOTHING
        `,
        [
          claim.companyId,
          artifact.objectId,
          artifact.objectKey,
          artifact.byteSize,
          artifact.sha256,
          completedAt,
        ],
      );
      const objectRow = firstRow(
        await transaction.query<Record<string, unknown>>(
          `
            SELECT object_id, content_type, byte_size, sha256
            FROM object_references
            WHERE company_id = $1 AND object_key = $2
          `,
          [claim.companyId, artifact.objectKey],
        ),
      );
      if (
        !objectRow ||
        objectRow.object_id !== artifact.objectId ||
        objectRow.content_type !== 'application/pdf' ||
        Number(objectRow.byte_size) !== artifact.byteSize ||
        objectRow.sha256 !== artifact.sha256
      ) {
        throw new ReportGenerationFailure(
          'CONFLICT',
          'private report object metadata conflicts with existing content',
        );
      }

      const latestRevisionNumber = claim.revisionNumber;
      if (latestRevisionNumber === null) {
        throw new ReportGenerationFailure(
          'PERSISTENCE_UNAVAILABLE',
          'report generation has no reserved revision number',
        );
      }
      const latestStoredRevision = firstRow(
        await transaction.query<LatestRevisionRow>(
          `
            SELECT MAX(revision_number) AS latest_revision
            FROM report_revisions
            WHERE company_id = $1 AND report_id = $2
          `,
          [claim.companyId, claim.reportId],
        ),
      );
      const existingLatestRevision =
        latestStoredRevision?.latest_revision === null ||
        latestStoredRevision?.latest_revision === undefined
          ? null
          : requiredInteger(
              latestStoredRevision.latest_revision,
              'latest_revision',
            );
      const supersededAt =
        existingLatestRevision !== null &&
        existingLatestRevision > latestRevisionNumber
          ? completedAt
          : null;
      await transaction.query(
        `
          UPDATE report_revisions
          SET superseded_at = $3
          WHERE company_id = $1 AND report_id = $2
            AND superseded_at IS NULL AND revision_number < $4
        `,
        [claim.companyId, claim.reportId, completedAt, latestRevisionNumber],
      );
      await transaction.query(
        `
          INSERT INTO report_revisions (
            company_id, report_revision_id, report_id, job_id,
            source_inspection_id, source_snapshot_id, jurisdiction,
            revision_number, template_version, generation_idempotency_key,
            object_id, sha256, created_by_user_id, reviewed_by_user_id,
            created_at, superseded_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          )
        `,
        [
          claim.companyId,
          claim.reportRevisionId,
          claim.reportId,
          claim.jobId,
          claim.sourceInspectionId,
          claim.snapshotId,
          claim.jurisdiction,
          latestRevisionNumber,
          claim.templateVersion,
          claim.idempotencyKey,
          artifact.objectId,
          artifact.sha256,
          claim.createdByUserId,
          claim.reviewedByUserId,
          completedAt,
          supersededAt,
        ],
      );

      const jobUpdate = await transaction.query<Record<string, unknown>>(
        `
          UPDATE jobs
          SET workflow_status = 'report_generated', updated_at = $4
          WHERE company_id = $1 AND job_id = $2
            AND workflow_status IN ('approved_for_report_generation', 'report_generated')
            AND (
              SELECT MAX(revision_number)
              FROM inspections
              WHERE company_id = $1 AND job_id = $2
            ) = $3
          RETURNING job_id
        `,
        [
          claim.companyId,
          claim.jobId,
          claim.sourceInspectionRevision,
          completedAt,
        ],
      );
      if (affectedRows(jobUpdate) !== 1) {
        throw new ReportGenerationFailure(
          'CONFLICT',
          'job is no longer approved for this report source revision',
        );
      }

      await transaction.query(
        `
          INSERT INTO audit_events (
            company_id, audit_event_id, actor_user_id, action, target_type,
            target_id, transition_metadata, occurred_at
          ) VALUES ($1, $2, $3, 'report.revision_generated', 'report_revision', $4, $5, $6)
        `,
        [
          claim.companyId,
          randomBytes(16).toString('hex'),
          claim.createdByUserId,
          claim.reportRevisionId,
          JSON.stringify({
            jurisdiction: claim.jurisdiction,
            sourceInspectionRevision: claim.sourceInspectionRevision,
            reportRevisionNumber: latestRevisionNumber,
            templateVersion: claim.templateVersion,
            supersededAt: supersededAt?.toISOString() ?? null,
          }),
          completedAt,
        ],
      );
      await transaction.query(
        `
          UPDATE report_generation_jobs
          SET status = 'completed', lease_token = NULL,
              lease_expires_at = NULL, completed_at = $3,
              last_failure_code = NULL, updated_at = $3
          WHERE company_id = $1 AND generation_id = $2
        `,
        [claim.companyId, claim.generationId, completedAt],
      );

      const inserted = firstRow(
        await transaction.query<RevisionRow>(
          `
            SELECT ${REVISION_COLUMNS}
            FROM report_revisions revision
            JOIN object_references object
              ON object.company_id = revision.company_id
             AND object.object_id = revision.object_id
            JOIN inspections inspection
              ON inspection.company_id = revision.company_id
             AND inspection.inspection_id = revision.source_inspection_id
            WHERE revision.company_id = $1
              AND revision.report_revision_id = $2
          `,
          [claim.companyId, claim.reportRevisionId],
        ),
      );
      if (!inserted) {
        throw new ReportGenerationFailure(
          'PERSISTENCE_UNAVAILABLE',
          'report revision was not returned after generation',
        );
      }
      return parseRevision(inserted, claim.companyId);
    });
  }

  async fail(
    claim: ReportGenerationClaim,
    failureCode: string,
    retryable: boolean,
    at: Date,
  ): Promise<void> {
    await this.withTenant(claim.companyId, async (transaction) => {
      await transaction.query(
        `
          UPDATE report_generation_jobs
          SET status = CASE
                WHEN $4 AND attempt_count < 3 THEN 'queued'
                ELSE 'failed'
              END,
              available_at = CASE
                WHEN $4 AND attempt_count < 3
                  THEN $3::timestamptz
                    + (LEAST(attempt_count * 30, 120) * INTERVAL '1 second')
                ELSE available_at
              END,
              revision_number = CASE
                WHEN $4 AND attempt_count < 3 THEN revision_number
                ELSE NULL
              END,
              lease_token = NULL, lease_expires_at = NULL,
              last_failure_code = $5, updated_at = $3
          WHERE company_id = $1 AND generation_id = $2
            AND status = 'processing' AND lease_token = $6
        `,
        [
          claim.companyId,
          claim.generationId,
          at,
          retryable,
          failureCode.slice(0, 128),
          claim.leaseToken,
        ],
      );
    });
  }

  async findRevision(
    companyId: string,
    reportRevisionId: string,
  ): Promise<ReportRevisionRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const row = firstRow(
        await transaction.query<RevisionRow>(
          `
            SELECT ${REVISION_COLUMNS}
            FROM report_revisions revision
            JOIN object_references object
              ON object.company_id = revision.company_id
             AND object.object_id = revision.object_id
            JOIN inspections inspection
              ON inspection.company_id = revision.company_id
             AND inspection.inspection_id = revision.source_inspection_id
            WHERE revision.company_id = $1
              AND revision.report_revision_id = $2
          `,
          [companyId, reportRevisionId],
        ),
      );
      return row ? parseRevision(row, companyId) : undefined;
    });
  }

  private async readCurrentJobState(
    transaction: SqlTransaction,
    companyId: string,
    jobId: string,
  ): Promise<
    | { readonly workflowStatus: string; readonly latestRevision: number }
    | undefined
  > {
    const row = firstRow(
      await transaction.query<JobStateRow>(
        `
          SELECT job.workflow_status,
                 MAX(inspection.revision_number) AS latest_revision
          FROM jobs job
          JOIN inspections inspection
            ON inspection.company_id = job.company_id
           AND inspection.job_id = job.job_id
          WHERE job.company_id = $1 AND job.job_id = $2
          GROUP BY job.workflow_status
        `,
        [companyId, jobId],
      ),
    );
    if (!row) return undefined;
    return {
      workflowStatus: requiredString(row.workflow_status, 'workflow_status'),
      latestRevision: requiredInteger(row.latest_revision, 'latest_revision'),
    };
  }

  private async withTenant<T>(
    companyId: string,
    work: (transaction: SqlTransaction) => Promise<T>,
  ): Promise<T> {
    let context;
    try {
      context = setTenantContextStatement(createTenantContext(companyId));
    } catch {
      throw new ReportGenerationFailure(
        'INVALID_INPUT',
        'companyId must be a stable lowercase opaque identifier',
      );
    }
    try {
      return await this.database.transaction(async (transaction) => {
        await transaction.query(context.text, context.values);
        return work(transaction);
      });
    } catch (error) {
      mapPersistenceError(error, 'report persistence is unavailable');
    }
  }
}
