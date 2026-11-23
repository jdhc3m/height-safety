import { createHash, randomBytes } from 'node:crypto';

import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import {
  INSPECTION_REVISION_LOCK_SQL,
  inspectionRevisionLockValues,
} from '../database/inspection-revision-lock';
import { SYNC_JURISDICTIONS, type SyncJurisdiction } from '../sync/sync.types';
import {
  APPROVED_REVIEW_STATUSES,
  ApprovedSnapshotFailure,
  type ApprovedSnapshot,
  type ApprovedSnapshotAuditEvent,
  type ApprovedSnapshotDocument,
  type ApprovedSnapshotReportContext,
  type AtomicApprovedSnapshotStore,
  type JobTransitionApprovalStore,
} from './approved-snapshot.types';
import { copyApprovedSnapshot } from './approved-snapshot-store';
import { readApprovedSnapshotReviewIssues } from './approved-snapshot-postgres-state-reader';

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

function isReportContext(
  value: unknown,
): value is ApprovedSnapshotReportContext {
  if (!isRecord(value) || !isRecord(value.site)) return false;
  if (
    !Number.isSafeInteger(value.jobPackVersion) ||
    (value.jobPackVersion as number) < 1 ||
    typeof value.inspectionSubmittedAt !== 'string' ||
    !(
      value.inspectionStartedAt === null ||
      typeof value.inspectionStartedAt === 'string'
    ) ||
    typeof value.site.siteId !== 'string' ||
    typeof value.site.clientId !== 'string' ||
    typeof value.site.name !== 'string' ||
    !(value.site.address === null || typeof value.site.address === 'string') ||
    (value.site.jurisdiction !== 'NSW' && value.site.jurisdiction !== 'QLD') ||
    !(
      value.site.siteReference === null ||
      typeof value.site.siteReference === 'string'
    ) ||
    !Array.isArray(value.expectedAnchors) ||
    !Array.isArray(value.reviewIssues)
  ) {
    return false;
  }
  return (
    value.expectedAnchors.every(
      (anchor) =>
        isRecord(anchor) &&
        typeof anchor.anchorId === 'string' &&
        (anchor.label === null || typeof anchor.label === 'string') &&
        (anchor.registerId === null || typeof anchor.registerId === 'string') &&
        (anchor.location === null || typeof anchor.location === 'string') &&
        anchor.anchorType === 'single_point' &&
        (anchor.manufacturer === null ||
          typeof anchor.manufacturer === 'string') &&
        (anchor.model === null || typeof anchor.model === 'string') &&
        (anchor.installContext === null ||
          typeof anchor.installContext === 'string') &&
        (anchor.registerStatus === 'active' ||
          anchor.registerStatus === 'inactive' ||
          anchor.registerStatus === 'archived'),
    ) &&
    value.reviewIssues.every(
      (issue) =>
        isRecord(issue) &&
        typeof issue.reviewIssueId === 'string' &&
        (issue.anchorInspectionId === null ||
          typeof issue.anchorInspectionId === 'string') &&
        (issue.issueType === 'blocker' ||
          issue.issueType === 'warning' ||
          issue.issueType === 'conflict' ||
          issue.issueType === 'change') &&
        (issue.status === 'open' || issue.status === 'resolved') &&
        typeof issue.reviewerUserId === 'string' &&
        typeof issue.reason === 'string' &&
        typeof issue.createdAt === 'string' &&
        (issue.resolvedAt === null || typeof issue.resolvedAt === 'string') &&
        Array.isArray(issue.actions) &&
        issue.actions.every(
          (action) =>
            isRecord(action) &&
            typeof action.reviewActionId === 'string' &&
            typeof action.reviewerUserId === 'string' &&
            (action.action === 'issue_created' ||
              action.action === 'changes_requested' ||
              action.action === 'resolved') &&
            typeof action.reason === 'string' &&
            typeof action.createdAt === 'string',
        ),
    )
  );
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
  const schemaVersion = document.snapshotSchemaVersion;
  if (
    (schemaVersion !== 1 && schemaVersion !== 2) ||
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
  if (
    schemaVersion === 2 &&
    (!isReportContext(document.reportContext) ||
      document.reportContext.jobPackVersion !== jobPackVersion ||
      document.reportContext.site.siteId !== siteId ||
      document.reportContext.site.jurisdiction !== jurisdiction)
  ) {
    throw storedFailure('approved snapshot report context is invalid');
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

export class PostgresApprovedSnapshotStore
  implements AtomicApprovedSnapshotStore, JobTransitionApprovalStore
{
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
        await this.insertSnapshot(transaction, snapshot);
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

  async createWithAudit(
    snapshot: ApprovedSnapshot,
    event: ApprovedSnapshotAuditEvent,
  ): Promise<void> {
    this.assertApprovalInput(snapshot, event);
    try {
      await this.withTenant(snapshot.companyId, async (transaction) => {
        await this.insertSnapshot(transaction, snapshot);
        await this.insertAuditEvent(transaction, event);
      });
    } catch (error) {
      throw this.mapApprovalWriteError(error);
    }
  }

  async createApprovalWithJobTransition(
    snapshot: ApprovedSnapshot,
    event: ApprovedSnapshotAuditEvent,
  ): Promise<void> {
    this.assertApprovalInput(snapshot, event);
    try {
      await this.withTenant(snapshot.companyId, async (transaction) => {
        // Share the D-048 per-company/job lock with inspection submissions and
        // review writes, then re-read the frozen review history while holding it.
        await transaction.query(
          INSPECTION_REVISION_LOCK_SQL,
          inspectionRevisionLockValues(snapshot.companyId, snapshot.jobId),
        );
        const reportContext = snapshot.document.reportContext;
        if (!reportContext) {
          throw new ApprovedSnapshotFailure(
            'CONFLICT',
            'approved snapshot does not contain frozen review history',
          );
        }
        const currentReviewIssues = await readApprovedSnapshotReviewIssues(
          transaction,
          snapshot.companyId,
          snapshot.sourceInspectionId,
        );
        if (
          currentReviewIssues.some(
            (issue) => issue.status === 'open' && issue.issueType === 'blocker',
          )
        ) {
          throw new ApprovedSnapshotFailure(
            'CONFLICT',
            'inspection has unresolved hard blockers',
          );
        }
        if (
          currentReviewIssues.some(
            (issue) => issue.status === 'open' && issue.issueType === 'change',
          )
        ) {
          throw new ApprovedSnapshotFailure(
            'CONFLICT',
            'inspection has open change requests',
          );
        }
        if (
          JSON.stringify(currentReviewIssues) !==
          JSON.stringify(reportContext.reviewIssues)
        ) {
          throw new ApprovedSnapshotFailure(
            'CONFLICT',
            'review history changed before approval was committed',
          );
        }
        await this.insertSnapshot(transaction, snapshot);
        await this.insertAuditEvent(transaction, event);
        // The job row is the mutable workflow pointer. The submitted
        // inspection and its snapshot stay immutable; a later resubmission
        // revision requires a new approval identity. `changes_requested` is a
        // valid starting point because a resubmission leaves the job there;
        // the inspection-level `submitted` revision is the authoritative
        // signal. The guard re-validates, inside this transaction, that the
        // approved revision is still the submitted revision for the job, so a
        // stale approval fails closed.
        const transition = await transaction.query<Record<string, unknown>>(
          `
            UPDATE jobs
            SET workflow_status = 'approved_for_report_generation',
                updated_at = $3
            WHERE company_id = $1
              AND job_id = $2
              AND workflow_status IN (
                'submitted', 'under_review', 'changes_requested'
              )
              AND EXISTS (
                SELECT 1
                FROM inspections i
                WHERE i.company_id = $1
                  AND i.job_id = $2
                  AND i.inspection_id = $4
                  AND i.revision_number = $5
                  AND i.workflow_status = 'submitted'
                  AND i.revision_number = (
                    SELECT MAX(revision_number)
                    FROM inspections
                    WHERE company_id = $1 AND job_id = $2
                  )
              )
            RETURNING job_id
          `,
          [
            snapshot.companyId,
            snapshot.jobId,
            snapshot.approvedAt,
            snapshot.sourceInspectionId,
            snapshot.sourceInspectionRevision,
          ],
        );
        if (transition.rows.length !== 1) {
          throw new ApprovedSnapshotFailure(
            'CONFLICT',
            'inspection revision is not the submitted revision awaiting approval',
          );
        }
      });
    } catch (error) {
      throw this.mapApprovalWriteError(error);
    }
  }

  private assertApprovalInput(
    snapshot: ApprovedSnapshot,
    event: ApprovedSnapshotAuditEvent,
  ): void {
    if (sha256(snapshot.documentJson) !== snapshot.sha256) {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'approved snapshot document checksum does not match its content',
      );
    }
    if (event.companyId !== snapshot.companyId) {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'approved snapshot audit event crosses company scope',
      );
    }
  }

  private mapApprovalWriteError(error: unknown): ApprovedSnapshotFailure {
    if (error instanceof ApprovedSnapshotFailure) {
      return error;
    }
    if (isUniqueViolation(error)) {
      return new ApprovedSnapshotFailure(
        'CONFLICT',
        'approved snapshot or review approval already exists',
      );
    }
    return storedFailure('approved snapshot persistence is unavailable');
  }

  private async insertAuditEvent(
    transaction: ApprovedSnapshotSqlTransaction,
    event: ApprovedSnapshotAuditEvent,
  ): Promise<void> {
    await transaction.query(
      `
        INSERT INTO audit_events (
          company_id, audit_event_id, actor_user_id, action, target_type,
          target_id, transition_metadata, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        event.companyId,
        randomBytes(16).toString('hex'),
        event.actorUserId,
        event.action,
        event.targetType,
        event.targetId,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.occurredAt,
      ],
    );
  }

  private async insertSnapshot(
    transaction: ApprovedSnapshotSqlTransaction,
    snapshot: ApprovedSnapshot,
  ): Promise<void> {
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
