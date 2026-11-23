import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type {
  SqlDatabase,
  SqlResult,
  SqlTransaction,
} from '../database/postgres-database';
import type {
  SyncDisposition,
  SyncExceptionReason,
  SyncRecordedOutcome,
} from '../sync/sync.types';
import {
  ReviewFailure,
  type AnchorRecordedOutcome,
  type AnchorHistoryReader,
  type SubmittedEvidencePhotoMetadata,
  type SubmittedPhotoUploadState,
} from './review.types';

interface AnchorRow extends Record<string, unknown> {
  readonly anchor_id: unknown;
}

interface OutcomeRow extends Record<string, unknown> {
  readonly anchor_inspection_id: unknown;
  readonly inspection_id: unknown;
  readonly revision_number: unknown;
  readonly job_id: unknown;
  readonly job_reference: unknown;
  readonly submitted_at: unknown;
  readonly recorded_outcome: unknown;
  readonly exception_reason: unknown;
  readonly disposition: unknown;
}

interface CurrentRow extends Record<string, unknown> {
  readonly anchor_id: unknown;
  readonly inspection_workflow_status: unknown;
  readonly submitted_at: unknown;
  readonly revision_number: unknown;
  readonly inspection_id: unknown;
}

interface PhotoRow extends Record<string, unknown> {
  readonly anchor_inspection_id: unknown;
  readonly photo_id: unknown;
  readonly local_id: unknown;
  readonly sha256: unknown;
  readonly capture_time: unknown;
  readonly upload_state: unknown;
}

function firstRow<Row extends Record<string, unknown>>(
  result: SqlResult<Row>,
): Row | undefined {
  return result.rows[0];
}

function storedFailure(message: string): ReviewFailure {
  return new ReviewFailure(
    'PERSISTENCE_UNAVAILABLE',
    `anchor history read returned invalid ${message}`,
  );
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw storedFailure(field);
  }
  return value;
}

function requiredDate(value: unknown, field: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw storedFailure(field);
  }
  return date;
}

function requiredInteger(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw storedFailure(field);
  }
  return number;
}

function requiredOutcome(
  value: unknown,
  field: string,
): SyncRecordedOutcome | null {
  if (
    value !== null &&
    value !== 'serviceable' &&
    value !== 'defective' &&
    value !== 'not_inspected' &&
    value !== 'further_assessment_required'
  ) {
    throw storedFailure(field);
  }
  return value;
}

function requiredExceptionReason(
  value: unknown,
  field: string,
): SyncExceptionReason | null {
  if (
    value !== null &&
    value !== 'inaccessible' &&
    value !== 'unable_to_locate'
  ) {
    throw storedFailure(field);
  }
  return value;
}

function requiredDisposition(
  value: unknown,
  field: string,
): SyncDisposition | null {
  if (value !== null && value !== 'removed_from_service') {
    throw storedFailure(field);
  }
  return value;
}

function requiredUploadState(
  value: unknown,
  field: string,
): SubmittedPhotoUploadState {
  if (
    value !== 'pending_upload' &&
    value !== 'uploaded' &&
    value !== 'failed'
  ) {
    throw storedFailure(field);
  }
  return value;
}

/**
 * Ordering key of one submitted inspection revision. The previous-revision
 * comparison and the ORDER BY below use the same element-wise order, so
 * "immediately previous" stays well-defined even when two submissions
 * recorded the same timestamp.
 */
const REVISION_ORDER_COLUMNS = `(ins.submitted_at, ins.revision_number, ins.inspection_id, ai.anchor_inspection_id)`;

/**
 * Tenant-bound read-only adapter for one register anchor's recorded-outcome
 * history. It reads submitted anchor inspection rows, their job reference and
 * their photo metadata, and runs no INSERT, UPDATE or DELETE statement. It
 * derives no jurisdiction rule and never rewrites submitted evidence.
 */
export class PostgresAnchorHistoryReader implements AnchorHistoryReader {
  constructor(private readonly database: SqlDatabase) {}

  async listRecordedOutcomes(
    companyId: string,
    anchorId: string,
  ): Promise<readonly AnchorRecordedOutcome[] | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const anchorRow = firstRow(
        await transaction.query<AnchorRow>(
          `
            SELECT anchor_id
            FROM anchors
            WHERE company_id = $1 AND anchor_id = $2
          `,
          [companyId, anchorId],
        ),
      );
      if (!anchorRow) return undefined;

      const outcomeRows = (
        await transaction.query<OutcomeRow>(
          `
            SELECT ai.anchor_inspection_id, ai.recorded_outcome,
                   ai.exception_reason, ai.disposition,
                   ins.inspection_id, ins.revision_number, ins.job_id,
                   ins.submitted_at,
                   jobs.reference AS job_reference
            FROM anchor_inspections ai
            JOIN inspections ins
              ON ins.company_id = ai.company_id
             AND ins.inspection_id = ai.inspection_id
            JOIN jobs
              ON jobs.company_id = ins.company_id
             AND jobs.job_id = ins.job_id
            WHERE ai.company_id = $1
              AND ai.anchor_id = $2
              AND ins.workflow_status = 'submitted'
            ORDER BY ins.submitted_at DESC, ins.revision_number DESC,
                     ins.inspection_id DESC, ai.anchor_inspection_id DESC
          `,
          [companyId, anchorId],
        )
      ).rows;

      const photos = await this.readPhotos(
        transaction,
        companyId,
        outcomeRows.map((row) =>
          requiredString(row.anchor_inspection_id, 'anchor_inspection_id'),
        ),
      );

      return outcomeRows.map((row) =>
        this.parseOutcome(row, companyId, photos),
      );
    });
  }

  async findPreviousRevision(
    companyId: string,
    anchorInspectionId: string,
  ): Promise<AnchorRecordedOutcome | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const currentRow = firstRow(
        await transaction.query<CurrentRow>(
          `
            SELECT ai.anchor_id, ins.workflow_status AS inspection_workflow_status,
                   ins.submitted_at, ins.revision_number, ins.inspection_id
            FROM anchor_inspections ai
            JOIN inspections ins
              ON ins.company_id = ai.company_id
             AND ins.inspection_id = ai.inspection_id
            WHERE ai.company_id = $1 AND ai.anchor_inspection_id = $2
          `,
          [companyId, anchorInspectionId],
        ),
      );
      if (!currentRow) return undefined;

      const workflowStatus = requiredString(
        currentRow.inspection_workflow_status,
        'inspection_workflow_status',
      );
      if (workflowStatus !== 'submitted') {
        throw storedFailure(
          'anchor inspection is not a submitted inspection revision',
        );
      }
      // A provisional record names no register anchor, so it has no
      // per-anchor history to compare against.
      if (currentRow.anchor_id === null || currentRow.anchor_id === undefined) {
        return undefined;
      }
      const anchorId = requiredString(currentRow.anchor_id, 'anchor_id');

      const previousRows = (
        await transaction.query<OutcomeRow>(
          `
            SELECT ai.anchor_inspection_id, ai.recorded_outcome,
                   ai.exception_reason, ai.disposition,
                   ins.inspection_id, ins.revision_number, ins.job_id,
                   ins.submitted_at,
                   jobs.reference AS job_reference
            FROM anchor_inspections ai
            JOIN inspections ins
              ON ins.company_id = ai.company_id
             AND ins.inspection_id = ai.inspection_id
            JOIN jobs
              ON jobs.company_id = ins.company_id
             AND jobs.job_id = ins.job_id
            WHERE ai.company_id = $1
              AND ai.anchor_id = $2
              AND ins.workflow_status = 'submitted'
              AND ${REVISION_ORDER_COLUMNS} < ($3, $4, $5, $6)
            ORDER BY ins.submitted_at DESC, ins.revision_number DESC,
                     ins.inspection_id DESC, ai.anchor_inspection_id DESC
            LIMIT 1
          `,
          [
            companyId,
            anchorId,
            requiredDate(currentRow.submitted_at, 'submitted_at'),
            requiredInteger(currentRow.revision_number, 'revision_number'),
            requiredString(currentRow.inspection_id, 'inspection_id'),
            anchorInspectionId,
          ],
        )
      ).rows;

      const previousRow = previousRows[0];
      if (!previousRow) return undefined;

      const photos = await this.readPhotos(transaction, companyId, [
        requiredString(
          previousRow.anchor_inspection_id,
          'anchor_inspection_id',
        ),
      ]);
      return this.parseOutcome(previousRow, companyId, photos);
    });
  }

  private async readPhotos(
    transaction: SqlTransaction,
    companyId: string,
    anchorInspectionIds: readonly string[],
  ): Promise<Map<string, SubmittedEvidencePhotoMetadata[]>> {
    if (anchorInspectionIds.length === 0) {
      return new Map();
    }
    const result = await transaction.query<PhotoRow>(
      `
        SELECT p.anchor_inspection_id, p.photo_id, p.local_id, o.sha256,
               p.capture_time, p.upload_state
        FROM photos p
        JOIN object_references o
          ON o.company_id = p.company_id
         AND o.object_id = p.object_id
        WHERE p.company_id = $1
          AND p.anchor_inspection_id = ANY($2)
        ORDER BY p.created_at ASC, p.photo_id ASC
      `,
      [companyId, [...anchorInspectionIds]],
    );
    const photosByAnchor = new Map<string, SubmittedEvidencePhotoMetadata[]>();
    for (const row of result.rows) {
      const anchorInspectionId = requiredString(
        row.anchor_inspection_id,
        'photo.anchor_inspection_id',
      );
      const photo: SubmittedEvidencePhotoMetadata = {
        photoId: requiredString(row.photo_id, 'photo.photo_id'),
        localId: requiredString(row.local_id, 'photo.local_id'),
        checksum: requiredString(row.sha256, 'photo.sha256'),
        capturedAt: requiredDate(
          row.capture_time,
          'photo.capture_time',
        ).toISOString(),
        uploadState: requiredUploadState(
          row.upload_state,
          'photo.upload_state',
        ),
      };
      const existing = photosByAnchor.get(anchorInspectionId) ?? [];
      existing.push(photo);
      photosByAnchor.set(anchorInspectionId, existing);
    }
    return photosByAnchor;
  }

  private parseOutcome(
    row: OutcomeRow,
    companyId: string,
    photos: Map<string, SubmittedEvidencePhotoMetadata[]>,
  ): AnchorRecordedOutcome {
    const anchorInspectionId = requiredString(
      row.anchor_inspection_id,
      'anchor_inspection_id',
    );
    return {
      companyId,
      anchorInspectionId,
      inspectionId: requiredString(row.inspection_id, 'inspection_id'),
      revisionNumber: requiredInteger(row.revision_number, 'revision_number'),
      jobId: requiredString(row.job_id, 'job_id'),
      jobReference: requiredString(row.job_reference, 'job_reference'),
      submittedAt: requiredDate(row.submitted_at, 'submitted_at'),
      recordedOutcome: requiredOutcome(
        row.recorded_outcome,
        'recorded_outcome',
      ),
      exceptionReason: requiredExceptionReason(
        row.exception_reason,
        'exception_reason',
      ),
      disposition: requiredDisposition(row.disposition, 'disposition'),
      photos: photos.get(anchorInspectionId) ?? [],
    };
  }

  private async withTenant<T>(
    companyId: string,
    work: (transaction: SqlTransaction) => Promise<T>,
  ): Promise<T> {
    let context;
    try {
      context = createTenantContext(companyId);
    } catch {
      throw new ReviewFailure(
        'INVALID_INPUT',
        'companyId must be a stable lowercase opaque identifier',
      );
    }

    try {
      return await this.database.transaction(async (transaction) => {
        const statement = setTenantContextStatement(context);
        await transaction.query(statement.text, statement.values);
        return work(transaction);
      });
    } catch (error) {
      if (error instanceof ReviewFailure) throw error;
      throw storedFailure('anchor history is unavailable');
    }
  }
}
