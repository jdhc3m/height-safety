import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type { SyncInspectionSubmissionPayload } from '../sync/sync.types';
import {
  ApprovedSnapshotFailure,
  type ApprovedSnapshotStateReader,
  type ApprovedSnapshotSubmissionState,
} from './approved-snapshot.types';
import type {
  ApprovedSnapshotSqlDatabase,
  ApprovedSnapshotSqlTransaction,
} from './approved-snapshot-postgres-store';

interface InspectionStateRow extends Record<string, unknown> {
  readonly inspection_id: unknown;
  readonly job_id: unknown;
  readonly site_id: unknown;
  readonly jurisdiction: unknown;
  readonly revision_number: unknown;
  readonly inspector_user_id: unknown;
  readonly inspection_workflow_status: unknown;
  readonly job_pack_version: unknown;
}

interface LatestRevisionRow extends Record<string, unknown> {
  readonly latest_revision: unknown;
}

interface ReviewCountRow extends Record<string, unknown> {
  readonly open_blockers: unknown;
  readonly open_changes: unknown;
}

interface MutationRow extends Record<string, unknown> {
  readonly entity_version: unknown;
  readonly request_body: unknown;
}

interface PendingPhotoRow extends Record<string, unknown> {
  readonly pending_photos: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function storedFailure(message: string): ApprovedSnapshotFailure {
  return new ApprovedSnapshotFailure('PERSISTENCE_UNAVAILABLE', message);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw storedFailure(`durable submission state returned invalid ${field}`);
  }
  return value;
}

function requiredInteger(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw storedFailure(`durable submission state returned invalid ${field}`);
  }
  return number;
}

function storedCount(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw storedFailure(`durable submission state returned invalid ${field}`);
  }
  return number;
}

/**
 * Reads one submitted inspection revision, its review-issue counts, the
 * acknowledged submission payload and pending photo uploads in one
 * tenant-bound transaction. Counts are recorded outcomes of stored rows; this
 * adapter derives no jurisdiction rule and mutates nothing.
 */
export class PostgresApprovedSnapshotStateReader
  implements ApprovedSnapshotStateReader
{
  constructor(private readonly database: ApprovedSnapshotSqlDatabase) {}

  async findSubmissionState(
    companyId: string,
    inspectionId: string,
  ): Promise<ApprovedSnapshotSubmissionState | undefined> {
    let context;
    try {
      context = createTenantContext(companyId);
    } catch {
      throw new ApprovedSnapshotFailure(
        'INVALID_INPUT',
        'companyId must be a stable lowercase opaque identifier',
      );
    }

    try {
      return await this.database.transaction(async (transaction) => {
        const statement = setTenantContextStatement(context);
        await transaction.query(statement.text, statement.values);
        return this.readState(transaction, companyId, inspectionId);
      });
    } catch (error) {
      if (error instanceof ApprovedSnapshotFailure) throw error;
      throw storedFailure('durable submission state is unavailable');
    }
  }

  private async readState(
    transaction: ApprovedSnapshotSqlTransaction,
    companyId: string,
    inspectionId: string,
  ): Promise<ApprovedSnapshotSubmissionState | undefined> {
    const inspectionResult = await transaction.query<InspectionStateRow>(
      `
        SELECT i.inspection_id, i.job_id, i.site_id, i.jurisdiction,
               i.revision_number, i.inspector_user_id,
               i.workflow_status AS inspection_workflow_status,
               j.job_pack_version
        FROM inspections i
        JOIN jobs j
          ON j.company_id = i.company_id
         AND j.job_id = i.job_id
        WHERE i.company_id = $1 AND i.inspection_id = $2
      `,
      [companyId, inspectionId],
    );
    const inspection = inspectionResult.rows[0];
    if (!inspection) return undefined;

    const revisionRow = (
      await transaction.query<LatestRevisionRow>(
        `
          SELECT MAX(revision_number) AS latest_revision
          FROM inspections
          WHERE company_id = $1 AND job_id = $2
        `,
        [companyId, requiredString(inspection.job_id, 'job_id')],
      )
    ).rows[0];
    if (!revisionRow) {
      throw storedFailure('durable submission state returned no job revision');
    }

    const countRow = (
      await transaction.query<ReviewCountRow>(
        `
          SELECT
            COUNT(*) FILTER (WHERE status = 'open' AND issue_type = 'blocker')
              AS open_blockers,
            COUNT(*) FILTER (WHERE status = 'open' AND issue_type = 'change')
              AS open_changes
          FROM review_issues
          WHERE company_id = $1 AND inspection_id = $2
        `,
        [companyId, inspectionId],
      )
    ).rows[0];
    if (!countRow) {
      throw storedFailure(
        'durable submission state returned no review issue counts',
      );
    }

    const payloadRow = (
      await transaction.query<MutationRow>(
        `
          SELECT entity_version, request_body
          FROM sync_mutations
          WHERE company_id = $1
            AND entity_type = 'inspection_submission'
            AND entity_id = $2
            AND state = 'synchronised'
          ORDER BY entity_version DESC
          LIMIT 1
        `,
        [companyId, inspectionId],
      )
    ).rows[0];

    const pendingRow = (
      await transaction.query<PendingPhotoRow>(
        `
          SELECT COUNT(*) AS pending_photos
          FROM photos p
          JOIN anchor_inspections ai
            ON ai.company_id = p.company_id
           AND ai.anchor_inspection_id = p.anchor_inspection_id
          WHERE p.company_id = $1
            AND ai.inspection_id = $2
            AND p.upload_state <> 'uploaded'
        `,
        [companyId, inspectionId],
      )
    ).rows[0];
    if (!pendingRow) {
      throw storedFailure(
        'durable submission state returned no photo upload counts',
      );
    }

    if (!payloadRow) {
      throw storedFailure(
        'durable submission state has no synchronised inspection payload',
      );
    }

    const rowJurisdiction = requiredString(
      inspection.jurisdiction,
      'jurisdiction',
    );
    const rowJobPackVersion = requiredInteger(
      inspection.job_pack_version,
      'job_pack_version',
    );
    // request_body is stored as JSON text; extract the acknowledged payload
    // here rather than casting the column, matching the sync store adapter.
    let request: unknown = payloadRow.request_body;
    if (typeof request === 'string') {
      try {
        request = JSON.parse(request);
      } catch {
        throw storedFailure(
          'durable submission request body is not valid JSON',
        );
      }
    }
    if (!isRecord(request)) {
      throw storedFailure('durable submission request body is not an object');
    }
    const payload: unknown = request.payload;
    if (!isRecord(payload)) {
      throw storedFailure(
        'durable submission state has no synchronised inspection payload',
      );
    }
    const submission = payload as unknown as SyncInspectionSubmissionPayload;
    if (
      submission.companyId !== companyId ||
      submission.jobId !== requiredString(inspection.job_id, 'job_id') ||
      submission.siteId !== requiredString(inspection.site_id, 'site_id') ||
      submission.jurisdiction !== rowJurisdiction ||
      submission.jobPackVersion !== rowJobPackVersion
    ) {
      throw storedFailure(
        'durable submission payload does not match the submitted inspection row',
      );
    }

    return {
      inspectionId: requiredString(inspection.inspection_id, 'inspection_id'),
      revisionNumber: requiredInteger(
        inspection.revision_number,
        'revision_number',
      ),
      latestRevisionNumber: requiredInteger(
        revisionRow.latest_revision,
        'latest_revision',
      ),
      workflowStatus: requiredString(
        inspection.inspection_workflow_status,
        'inspection_workflow_status',
      ),
      jobPackVersion: rowJobPackVersion,
      inspectorUserId: requiredString(
        inspection.inspector_user_id,
        'inspector_user_id',
      ),
      requiredEvidenceSynchronised:
        storedCount(pendingRow.pending_photos, 'pending_photos') === 0,
      openHardBlockerCount: storedCount(
        countRow.open_blockers,
        'open_blockers',
      ),
      openChangeRequestCount: storedCount(
        countRow.open_changes,
        'open_changes',
      ),
      evidenceVersion: requiredInteger(
        payloadRow.entity_version,
        'entity_version',
      ),
      submission,
    };
  }
}
