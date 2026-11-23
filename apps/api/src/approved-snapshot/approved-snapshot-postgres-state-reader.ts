import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type { SyncInspectionSubmissionPayload } from '../sync/sync.types';
import {
  ApprovedSnapshotFailure,
  type ApprovedSnapshotExpectedAnchor,
  type ApprovedSnapshotReportContext,
  type ApprovedSnapshotReviewAction,
  type ApprovedSnapshotReviewIssue,
  type ApprovedSnapshotSiteContext,
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
  readonly submitted_at: unknown;
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

interface JobPackRow extends Record<string, unknown> {
  readonly job_id: unknown;
  readonly job_pack_version: unknown;
  readonly site_id: unknown;
  readonly jurisdiction: unknown;
  readonly site_document: unknown;
  readonly anchors_document: unknown;
}

interface ReviewIssueRow extends Record<string, unknown> {
  readonly review_issue_id: unknown;
  readonly anchor_inspection_id: unknown;
  readonly issue_type: unknown;
  readonly status: unknown;
  readonly reviewer_user_id: unknown;
  readonly reason: unknown;
  readonly created_at: unknown;
  readonly resolved_at: unknown;
}

interface ReviewActionRow extends Record<string, unknown> {
  readonly review_action_id: unknown;
  readonly review_issue_id: unknown;
  readonly reviewer_user_id: unknown;
  readonly action: unknown;
  readonly reason: unknown;
  readonly created_at: unknown;
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

function optionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw storedFailure(`durable submission state returned invalid ${field}`);
  }
  return value;
}

function requiredDate(value: unknown, field: string): string {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw storedFailure(`durable submission state returned invalid ${field}`);
  }
  return date.toISOString();
}

function optionalDate(value: unknown, field: string): string | null {
  return value === null || value === undefined
    ? null
    : requiredDate(value, field);
}

function parseJsonDocument(value: unknown, field: string): unknown {
  if (typeof value !== 'string') {
    throw storedFailure(`durable submission state returned invalid ${field}`);
  }
  try {
    return JSON.parse(value);
  } catch {
    throw storedFailure(`durable submission state returned invalid ${field}`);
  }
}

function parseSiteContext(
  value: unknown,
  companyId: string,
  siteId: string,
  jurisdiction: string,
): ApprovedSnapshotSiteContext {
  if (!isRecord(value)) throw storedFailure('site_document');
  const rowSiteId = requiredString(value.siteId, 'site.siteId');
  const rowJurisdiction = requiredString(
    value.jurisdiction,
    'site.jurisdiction',
  );
  if (
    value.companyId !== companyId ||
    rowSiteId !== siteId ||
    rowJurisdiction !== jurisdiction
  ) {
    throw storedFailure('job-pack site does not match the inspection');
  }
  return {
    siteId: rowSiteId,
    clientId: requiredString(value.clientId, 'site.clientId'),
    name: requiredString(value.name, 'site.name'),
    address: optionalString(value.address, 'site.address'),
    jurisdiction:
      rowJurisdiction as ApprovedSnapshotSiteContext['jurisdiction'],
    siteReference: optionalString(value.siteReference, 'site.siteReference'),
  };
}

function parseExpectedAnchors(
  value: unknown,
  companyId: string,
  siteId: string,
): readonly ApprovedSnapshotExpectedAnchor[] {
  if (!Array.isArray(value)) throw storedFailure('anchors_document');
  const seenIds = new Set<string>();
  return value.map((item, index) => {
    if (!isRecord(item)) throw storedFailure(`anchors_document[${index}]`);
    const anchorId = requiredString(item.anchorId, `anchor[${index}].anchorId`);
    if (
      item.companyId !== companyId ||
      item.siteId !== siteId ||
      seenIds.has(anchorId)
    ) {
      throw storedFailure(`anchors_document[${index}] identity`);
    }
    seenIds.add(anchorId);
    if (item.anchorType !== 'single_point') {
      throw storedFailure(`anchor[${index}].anchorType`);
    }
    if (
      item.registerStatus !== 'active' &&
      item.registerStatus !== 'inactive' &&
      item.registerStatus !== 'archived'
    ) {
      throw storedFailure(`anchor[${index}].registerStatus`);
    }
    return {
      anchorId,
      label: optionalString(item.label, `anchor[${index}].label`),
      registerId: optionalString(
        item.registerId,
        `anchor[${index}].registerId`,
      ),
      location: optionalString(item.location, `anchor[${index}].location`),
      anchorType: 'single_point',
      manufacturer: optionalString(
        item.manufacturer,
        `anchor[${index}].manufacturer`,
      ),
      model: optionalString(item.model, `anchor[${index}].model`),
      installContext: optionalString(
        item.installContext,
        `anchor[${index}].installContext`,
      ),
      registerStatus: item.registerStatus,
    };
  });
}

function parseReviewIssues(
  issueRows: readonly ReviewIssueRow[],
  actionRows: readonly ReviewActionRow[],
): readonly ApprovedSnapshotReviewIssue[] {
  const actionsByIssue = new Map<string, ApprovedSnapshotReviewAction[]>();
  for (const [index, row] of actionRows.entries()) {
    const action: ApprovedSnapshotReviewAction = {
      reviewActionId: requiredString(
        row.review_action_id,
        `review_action[${index}].review_action_id`,
      ),
      reviewerUserId: requiredString(
        row.reviewer_user_id,
        `review_action[${index}].reviewer_user_id`,
      ),
      action: requiredReviewAction(
        row.action,
        `review_action[${index}].action`,
      ),
      reason: requiredString(row.reason, `review_action[${index}].reason`),
      createdAt: requiredDate(
        row.created_at,
        `review_action[${index}].created_at`,
      ),
    };
    const issueId = requiredString(
      row.review_issue_id,
      `review_action[${index}].review_issue_id`,
    );
    const existing = actionsByIssue.get(issueId) ?? [];
    existing.push(action);
    actionsByIssue.set(issueId, existing);
  }

  return issueRows.map((row, index) => {
    const reviewIssueId = requiredString(
      row.review_issue_id,
      `review_issue[${index}].review_issue_id`,
    );
    return {
      reviewIssueId,
      anchorInspectionId: optionalString(
        row.anchor_inspection_id,
        `review_issue[${index}].anchor_inspection_id`,
      ),
      issueType: requiredReviewIssueType(
        row.issue_type,
        `review_issue[${index}].issue_type`,
      ),
      status: requiredReviewStatus(row.status, `review_issue[${index}].status`),
      reviewerUserId: requiredString(
        row.reviewer_user_id,
        `review_issue[${index}].reviewer_user_id`,
      ),
      reason: requiredString(row.reason, `review_issue[${index}].reason`),
      createdAt: requiredDate(
        row.created_at,
        `review_issue[${index}].created_at`,
      ),
      resolvedAt: optionalDate(
        row.resolved_at,
        `review_issue[${index}].resolved_at`,
      ),
      actions: actionsByIssue.get(reviewIssueId) ?? [],
    };
  });
}

export async function readApprovedSnapshotReviewIssues(
  transaction: ApprovedSnapshotSqlTransaction,
  companyId: string,
  inspectionId: string,
): Promise<readonly ApprovedSnapshotReviewIssue[]> {
  const issueRows = (
    await transaction.query<ReviewIssueRow>(
      `
        SELECT review_issue_id, anchor_inspection_id, issue_type, status,
               reviewer_user_id, reason, created_at, resolved_at
        FROM review_issues
        WHERE company_id = $1 AND inspection_id = $2
        ORDER BY created_at ASC, review_issue_id ASC
      `,
      [companyId, inspectionId],
    )
  ).rows;
  const actionRows = (
    await transaction.query<ReviewActionRow>(
      `
        SELECT action.review_action_id, action.review_issue_id,
               action.reviewer_user_id, action.action, action.reason,
               action.created_at
        FROM review_actions action
        JOIN review_issues issue
          ON issue.company_id = action.company_id
         AND issue.review_issue_id = action.review_issue_id
        WHERE issue.company_id = $1 AND issue.inspection_id = $2
        ORDER BY action.created_at ASC, action.review_action_id ASC
      `,
      [companyId, inspectionId],
    )
  ).rows;
  return parseReviewIssues(issueRows, actionRows);
}

function requiredReviewIssueType(
  value: unknown,
  field: string,
): ApprovedSnapshotReviewIssue['issueType'] {
  if (
    value !== 'blocker' &&
    value !== 'warning' &&
    value !== 'conflict' &&
    value !== 'change'
  ) {
    throw storedFailure(field);
  }
  return value;
}

function requiredReviewStatus(
  value: unknown,
  field: string,
): ApprovedSnapshotReviewIssue['status'] {
  if (value !== 'open' && value !== 'resolved') throw storedFailure(field);
  return value;
}

function requiredReviewAction(
  value: unknown,
  field: string,
): ApprovedSnapshotReviewAction['action'] {
  if (
    value !== 'issue_created' &&
    value !== 'changes_requested' &&
    value !== 'resolved'
  ) {
    throw storedFailure(field);
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
 * Reads one submitted inspection revision, its immutable released job-pack
 * context, review history, acknowledged submission payload and pending photo
 * uploads in one tenant-bound transaction. Counts are recorded outcomes of
 * stored rows; this adapter derives no jurisdiction rule and mutates nothing.
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
               j.job_pack_version, i.submitted_at
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

    const packRow = (
      await transaction.query<JobPackRow>(
        `
          SELECT job_id, job_pack_version, site_id, jurisdiction,
                 site_document, anchors_document
          FROM job_pack_snapshots
          WHERE company_id = $1 AND job_id = $2 AND job_pack_version = $3
        `,
        [companyId, submission.jobId, rowJobPackVersion],
      )
    ).rows[0];
    if (
      !packRow ||
      packRow.job_id !== submission.jobId ||
      requiredInteger(
        packRow.job_pack_version,
        'job_pack_snapshot.job_pack_version',
      ) !== rowJobPackVersion ||
      packRow.site_id !== submission.siteId ||
      packRow.jurisdiction !== rowJurisdiction
    ) {
      throw storedFailure('matching immutable job-pack snapshot was not found');
    }

    const reviewIssues = await readApprovedSnapshotReviewIssues(
      transaction,
      companyId,
      inspectionId,
    );

    const reportContext: ApprovedSnapshotReportContext = {
      jobPackVersion: rowJobPackVersion,
      // The current submission contract carries no trusted inspection-start
      // time. Older sync writes reused the server acknowledgement time here.
      inspectionStartedAt: null,
      inspectionSubmittedAt: requiredDate(
        inspection.submitted_at,
        'inspection.submitted_at',
      ),
      site: parseSiteContext(
        parseJsonDocument(packRow.site_document, 'site_document'),
        companyId,
        submission.siteId,
        rowJurisdiction,
      ),
      expectedAnchors: parseExpectedAnchors(
        parseJsonDocument(packRow.anchors_document, 'anchors_document'),
        companyId,
        submission.siteId,
      ),
      reviewIssues,
    };

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
      reportContext,
    };
  }
}
