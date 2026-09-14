import { createHash } from 'node:crypto';

import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import { SYNC_JURISDICTIONS, type SyncJurisdiction } from '../sync/sync.types';
import {
  APPROVED_REVIEW_STATUSES,
  ApprovedSnapshotFailure,
  type ApprovedSnapshot,
  type ApprovedSnapshotDocument,
  type ApprovedSnapshotStore,
} from './approved-snapshot.types';
import { copyApprovedSnapshot } from './approved-snapshot-store';

export interface ApprovedSnapshotSqlResult<Row> {
  readonly rows: readonly Row[];
}

export interface ApprovedSnapshotSqlTransaction {
  query<Row extends Record<string, unknown>>(
    text: string,
    values: readonly unknown[],
  ): Promise<ApprovedSnapshotSqlResult<Row>>;
}

/**
 * Infrastructure owns the actual PostgreSQL client and transaction lifecycle.
 * The adapter only depends on this small port so the API module does not take
 * a provider-specific client dependency before runtime persistence is wired.
 */
export interface ApprovedSnapshotSqlDatabase {
  transaction<T>(
    work: (transaction: ApprovedSnapshotSqlTransaction) => Promise<T>,
  ): Promise<T>;
}

interface ApprovedSnapshotRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly snapshot_id: unknown;
  readonly approval_id: unknown;
  readonly inspection_id: unknown;
  readonly jurisdiction: unknown;
  readonly snapshot_document: unknown;
  readonly sha256: unknown;
}

const SNAPSHOT_COLUMNS = `
  company_id,
  snapshot_id,
  approval_id,
  inspection_id,
  jurisdiction,
  snapshot_document,
  sha256
`;

const FIND_BY_ID_SQL = `
  SELECT ${SNAPSHOT_COLUMNS}
  FROM inspection_snapshots
  WHERE company_id = $1 AND snapshot_id = $2
`;

const FIND_BY_APPROVAL_ID_SQL = `
  SELECT ${SNAPSHOT_COLUMNS}
  FROM inspection_snapshots
  WHERE company_id = $1 AND approval_id = $2
`;

const INSERT_SQL = `
  INSERT INTO inspection_snapshots (
    company_id,
    snapshot_id,
    approval_id,
    inspection_id,
    jurisdiction,
    snapshot_document,
    sha256,
    created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`;

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function storedFailure(message: string): ApprovedSnapshotFailure {
  return new ApprovedSnapshotFailure('PERSISTENCE_UNAVAILABLE', message);
}

function requiredStoredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw storedFailure(
      `approved snapshot persistence returned invalid ${field}`,
    );
  }
  return value;
}

function requiredStoredInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw storedFailure(
      `approved snapshot persistence returned invalid ${field}`,
    );
  }
  return value as number;
}

function requiredStoredEnum<const Values extends readonly string[]>(
  value: unknown,
  field: string,
  values: Values,
): Values[number] {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw storedFailure(
      `approved snapshot persistence returned invalid ${field}`,
    );
  }
  return value as Values[number];
}

function requiredStoredSha256(value: unknown, field: string): string {
  const normalized = requiredStoredString(value, field);
  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw storedFailure(
      `approved snapshot persistence returned invalid ${field}`,
    );
  }
  return normalized;
}

function isUniqueViolation(error: unknown): boolean {
  return isRecord(error) && error.code === '23505';
}

function parseStoredDocument(
  row: ApprovedSnapshotRow,
  companyId: string,
): ApprovedSnapshot {
  const rowCompanyId = requiredStoredString(row.company_id, 'company_id');
  const snapshotId = requiredStoredString(row.snapshot_id, 'snapshot_id');
  const approvalId = requiredStoredString(row.approval_id, 'approval_id');
  const inspectionId = requiredStoredString(row.inspection_id, 'inspection_id');
  const jurisdiction = requiredStoredEnum(
    row.jurisdiction,
    'jurisdiction',
    SYNC_JURISDICTIONS,
  );
  const documentJson = requiredStoredString(
    row.snapshot_document,
    'snapshot_document',
  );
  const storedSha256 = requiredStoredSha256(row.sha256, 'sha256');

  if (rowCompanyId !== companyId || sha256(documentJson) !== storedSha256) {
    throw storedFailure(
      'approved snapshot checksum or tenant scope is invalid',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(documentJson);
  } catch {
    throw storedFailure('approved snapshot document is not valid JSON');
  }
  if (!isRecord(parsed)) {
    throw storedFailure('approved snapshot document is not an object');
  }

  const document = parsed as Partial<ApprovedSnapshotDocument> &
    Record<string, unknown>;
  const submission = document.inspectionSubmission;
  const reviewStatus = requiredStoredEnum(
    document.reviewStatus,
    'review_status',
    APPROVED_REVIEW_STATUSES,
  );
  const jobId = requiredStoredString(document.jobId, 'job_id');
  const siteId = requiredStoredString(document.siteId, 'site_id');
  const jobPackVersion = requiredStoredInteger(
    document.jobPackVersion,
    'job_pack_version',
  );
  if (
    document.snapshotSchemaVersion !== 1 ||
    document.companyId !== rowCompanyId ||
    document.approvalId !== approvalId ||
    document.sourceInspectionId !== inspectionId ||
    document.jurisdiction !== jurisdiction ||
    !isRecord(submission) ||
    !Array.isArray(submission.anchorInspections) ||
    submission.companyId !== rowCompanyId ||
    submission.jobId !== jobId ||
    submission.siteId !== siteId ||
    submission.jurisdiction !== jurisdiction ||
    submission.jobPackVersion !== jobPackVersion
  ) {
    throw storedFailure('approved snapshot document does not match its row');
  }

  const approvedAt = new Date(
    typeof document.approvedAt === 'string' ? document.approvedAt : NaN,
  );
  if (Number.isNaN(approvedAt.getTime())) {
    throw storedFailure('approved snapshot approval time is invalid');
  }

  const sourceInspectionRevision = requiredStoredInteger(
    document.sourceInspectionRevision,
    'source_inspection_revision',
  );
  const sourceEvidenceVersion = requiredStoredInteger(
    document.sourceEvidenceVersion,
    'source_evidence_version',
  );
  const approvedByUserId = requiredStoredString(
    document.approvedByUserId,
    'approved_by_user_id',
  );
  const sourceIdentitySha256 = requiredStoredSha256(
    document.sourceIdentitySha256,
    'source_identity_sha256',
  );
  requiredStoredString(document.inspectorUserId, 'inspector_user_id');

  for (const [index, inspection] of submission.anchorInspections.entries()) {
    if (!isRecord(inspection) || !Array.isArray(inspection.photos)) {
      throw storedFailure(
        `approved snapshot anchor inspection ${index} is invalid`,
      );
    }
  }

  return copyApprovedSnapshot({
    companyId: rowCompanyId,
    snapshotId,
    approvalId,
    jobId,
    siteId,
    jurisdiction: jurisdiction as SyncJurisdiction,
    sourceInspectionId: inspectionId,
    sourceInspectionRevision,
    sourceEvidenceVersion,
    approvedByUserId,
    approvedAt,
    sourceIdentitySha256,
    documentJson,
    document: document as ApprovedSnapshotDocument,
    sha256: storedSha256,
  });
}

export class PostgresApprovedSnapshotStore implements ApprovedSnapshotStore {
  constructor(private readonly database: ApprovedSnapshotSqlDatabase) {}

  async findById(
    companyId: string,
    snapshotId: string,
  ): Promise<ApprovedSnapshot | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<ApprovedSnapshotRow>(
        FIND_BY_ID_SQL,
        [companyId, snapshotId],
      );
      const row = result.rows[0];
      return row ? parseStoredDocument(row, companyId) : undefined;
    });
  }

  async findByApprovalId(
    companyId: string,
    approvalId: string,
  ): Promise<ApprovedSnapshot | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<ApprovedSnapshotRow>(
        FIND_BY_APPROVAL_ID_SQL,
        [companyId, approvalId],
      );
      const row = result.rows[0];
      return row ? parseStoredDocument(row, companyId) : undefined;
    });
  }

  async create(snapshot: ApprovedSnapshot): Promise<void> {
    if (sha256(snapshot.documentJson) !== snapshot.sha256) {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'approved snapshot document checksum does not match its content',
      );
    }

    try {
      await this.withTenant(snapshot.companyId, async (transaction) => {
        await transaction.query(INSERT_SQL, [
          snapshot.companyId,
          snapshot.snapshotId,
          snapshot.approvalId,
          snapshot.sourceInspectionId,
          snapshot.jurisdiction,
          snapshot.documentJson,
          snapshot.sha256,
          snapshot.approvedAt,
        ]);
      });
    } catch (error) {
      if (error instanceof ApprovedSnapshotFailure) {
        throw error;
      }
      if (isUniqueViolation(error)) {
        throw new ApprovedSnapshotFailure(
          'CONFLICT',
          'approved snapshot or review approval already exists',
        );
      }
      throw storedFailure('approved snapshot persistence is unavailable');
    }
  }

  private async withTenant<T>(
    companyId: string,
    work: (transaction: ApprovedSnapshotSqlTransaction) => Promise<T>,
  ): Promise<T> {
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
        return work(transaction);
      });
    } catch (error) {
      if (error instanceof ApprovedSnapshotFailure) {
        throw error;
      }
      if (isUniqueViolation(error)) {
        throw new ApprovedSnapshotFailure(
          'CONFLICT',
          'approved snapshot or review approval already exists',
        );
      }
      throw storedFailure('approved snapshot persistence is unavailable');
    }
  }
}
