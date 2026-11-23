import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type {
  SqlDatabase,
  SqlResult,
  SqlTransaction,
} from '../database/postgres-database';
import {
  ReviewFailure,
  type SubmittedPhotoMediaRecord,
  type SubmittedPhotoMediaReader,
  type SubmittedPhotoUploadState,
} from './review.types';

interface PhotoMediaRow extends Record<string, unknown> {
  readonly photo_id: unknown;
  readonly anchor_inspection_id: unknown;
  readonly upload_state: unknown;
  readonly object_key: unknown;
  readonly content_type: unknown;
  readonly byte_size: unknown;
  readonly sha256: unknown;
  readonly inspection_workflow_status: unknown;
}

function storedFailure(message: string): ReviewFailure {
  return new ReviewFailure('PERSISTENCE_UNAVAILABLE', message);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw storedFailure(`submitted photo media read returned invalid ${field}`);
  }
  return value;
}

function requiredByteSize(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw storedFailure(`submitted photo media read returned invalid ${field}`);
  }
  return number;
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
    throw storedFailure(`submitted photo media read returned invalid ${field}`);
  }
  return value;
}

function requiredObjectKey(value: unknown, companyId: string): string {
  const objectKey = requiredString(value, 'object_key');
  if (!objectKey.startsWith(`${companyId}/`)) {
    throw storedFailure(
      'submitted photo media read returned an object key outside the tenant scope',
    );
  }
  return objectKey;
}

/**
 * Tenant-bound read-only adapter that resolves one evidence photo's private
 * object metadata through its anchor inspection and submitted inspection
 * revision. It runs no INSERT, UPDATE or DELETE statement and never exposes
 * object keys to callers.
 */
export class PostgresSubmittedPhotoMediaReader
  implements SubmittedPhotoMediaReader
{
  constructor(private readonly database: SqlDatabase) {}

  async find(
    companyId: string,
    inspectionId: string,
    photoId: string,
  ): Promise<SubmittedPhotoMediaRecord | undefined> {
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
        return this.readState(transaction, companyId, inspectionId, photoId);
      });
    } catch (error) {
      if (error instanceof ReviewFailure) throw error;
      throw storedFailure('submitted photo media is unavailable');
    }
  }

  private async readState(
    transaction: SqlTransaction,
    companyId: string,
    inspectionId: string,
    photoId: string,
  ): Promise<SubmittedPhotoMediaRecord | undefined> {
    const row = firstRow(
      await transaction.query<PhotoMediaRow>(
        `
          SELECT p.photo_id, p.anchor_inspection_id, p.upload_state,
                 o.object_key, o.content_type, o.byte_size, o.sha256,
                 i.workflow_status AS inspection_workflow_status
          FROM photos p
          JOIN anchor_inspections ai
            ON ai.company_id = p.company_id
           AND ai.anchor_inspection_id = p.anchor_inspection_id
          JOIN inspections i
            ON i.company_id = ai.company_id
           AND i.inspection_id = ai.inspection_id
          JOIN object_references o
            ON o.company_id = p.company_id
           AND o.object_id = p.object_id
          WHERE p.company_id = $1
            AND i.inspection_id = $2
            AND p.photo_id = $3
        `,
        [companyId, inspectionId, photoId],
      ),
    );
    if (!row) return undefined;
    if (row.inspection_workflow_status !== 'submitted') {
      throw storedFailure(
        'photo media is not attached to a submitted inspection revision',
      );
    }

    const storedPhotoId = requiredString(row.photo_id, 'photo_id');
    if (storedPhotoId !== photoId) {
      throw storedFailure(
        'submitted photo media read returned an unexpected photo identity',
      );
    }
    const anchorInspectionId = requiredString(
      row.anchor_inspection_id,
      'anchor_inspection_id',
    );
    const objectKey = requiredObjectKey(row.object_key, companyId);
    return {
      companyId,
      inspectionId,
      photoId,
      anchorInspectionId,
      objectKey,
      contentType: requiredString(row.content_type, 'content_type'),
      byteSize: requiredByteSize(row.byte_size, 'byte_size'),
      sha256: requiredString(row.sha256, 'sha256'),
      uploadState: requiredUploadState(row.upload_state, 'upload_state'),
    };
  }
}

function firstRow<Row extends Record<string, unknown>>(
  result: SqlResult<Row>,
): Row | undefined {
  return result.rows[0];
}
