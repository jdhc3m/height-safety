import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type {
  SqlDatabase,
  SqlResult,
  SqlTransaction,
} from '../database/postgres-database';
import type { SyncInspectionSubmissionPayload } from '../sync/sync.types';
import {
  ReviewFailure,
  type SubmittedEvidenceAnchor,
  type SubmittedEvidencePhotoMetadata,
  type SubmittedInspectionEvidence,
  type SubmittedEvidenceReader,
  type SubmittedPhotoUploadState,
} from './review.types';

interface InspectionStateRow extends Record<string, unknown> {
  readonly inspection_id: unknown;
  readonly job_id: unknown;
  readonly site_id: unknown;
  readonly jurisdiction: unknown;
  readonly revision_number: unknown;
  readonly inspector_user_id: unknown;
  readonly inspection_workflow_status: unknown;
  readonly submitted_at: unknown;
  readonly job_pack_version: unknown;
}

interface LatestRevisionRow extends Record<string, unknown> {
  readonly latest_revision: unknown;
}

interface ReviewCountRow extends Record<string, unknown> {
  readonly open_blockers: unknown;
  readonly open_warnings: unknown;
  readonly open_conflicts: unknown;
  readonly open_changes: unknown;
}

interface PayloadRow extends Record<string, unknown> {
  readonly entity_version: unknown;
  readonly request_body: unknown;
}

interface PendingPhotoRow extends Record<string, unknown> {
  readonly pending_photos: unknown;
  readonly failed_photos: unknown;
}

interface PhotoStateRow extends Record<string, unknown> {
  readonly photo_id: unknown;
  readonly local_id: unknown;
  readonly upload_state: unknown;
}

interface JobPackRow extends Record<string, unknown> {
  readonly job_id: unknown;
  readonly job_pack_version: unknown;
  readonly site_id: unknown;
  readonly jurisdiction: unknown;
  readonly anchors_document: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function storedFailure(message: string): ReviewFailure {
  return new ReviewFailure('PERSISTENCE_UNAVAILABLE', message);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  return value;
}

function requiredDate(value: unknown, field: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  return date;
}

function requiredEpochMillisIso(value: unknown, field: string): string {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  const date = new Date(number);
  if (Number.isNaN(date.getTime())) {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  return date.toISOString();
}

function requiredInteger(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  return number;
}

function storedCount(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
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
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  return value;
}

function requiredOutcome(
  value: unknown,
  field: string,
): SubmittedEvidenceAnchor['recordedOutcome'] {
  if (
    value !== null &&
    value !== 'serviceable' &&
    value !== 'defective' &&
    value !== 'not_inspected' &&
    value !== 'further_assessment_required'
  ) {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  return value;
}

function requiredExceptionReason(
  value: unknown,
  field: string,
): SubmittedEvidenceAnchor['exceptionReason'] {
  if (
    value !== null &&
    value !== 'inaccessible' &&
    value !== 'unable_to_locate'
  ) {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  return value;
}

function requiredProposal(
  value: unknown,
  field: string,
): SubmittedEvidenceAnchor['reconciliationProposal'] {
  if (
    value !== null &&
    value !== 'newly_discovered' &&
    value !== 'replacement' &&
    value !== 'duplicate'
  ) {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  return value;
}

function requiredDisposition(
  value: unknown,
  field: string,
): SubmittedEvidenceAnchor['disposition'] {
  if (value !== null && value !== 'removed_from_service') {
    throw storedFailure(`submitted evidence read returned invalid ${field}`);
  }
  return value;
}

function parsePayload(value: unknown): SyncInspectionSubmissionPayload {
  // request_body is stored as JSON text; parse it in the adapter rather than
  // casting the column, matching the sync and approved-snapshot adapters.
  let request: unknown = value;
  if (typeof request === 'string') {
    try {
      request = JSON.parse(request);
    } catch {
      throw storedFailure('submitted evidence request body is not valid JSON');
    }
  }
  if (!isRecord(request)) {
    throw storedFailure('submitted evidence request body is not an object');
  }
  if (!isRecord(request.payload)) {
    throw storedFailure(
      'submitted evidence state has no synchronised inspection payload',
    );
  }
  return request.payload as unknown as SyncInspectionSubmissionPayload;
}

function parseExpectedAnchorCount(value: unknown): number {
  let document: unknown = value;
  if (typeof document === 'string') {
    try {
      document = JSON.parse(document);
    } catch {
      throw storedFailure('submitted evidence anchors document is not JSON');
    }
  }
  if (!Array.isArray(document)) {
    throw storedFailure('submitted evidence anchors document is not a list');
  }
  for (const [index, item] of document.entries()) {
    if (!isRecord(item) || typeof item.anchorId !== 'string') {
      throw storedFailure(`anchors_document[${index}]`);
    }
  }
  return document.length;
}

function photoMetadata(
  payloadPhoto: SyncInspectionSubmissionPayload['anchorInspections'][number]['photos'][number],
  state: {
    readonly photo_id: unknown;
    readonly upload_state: unknown;
  },
): SubmittedEvidencePhotoMetadata {
  return {
    photoId: requiredString(state.photo_id, 'photo.photo_id'),
    localId: requiredString(payloadPhoto.localId, 'photo.localId'),
    checksum: requiredString(payloadPhoto.checksum, 'photo.checksum'),
    capturedAt: requiredEpochMillisIso(
      payloadPhoto.capturedAtEpochMillis,
      'photo.capturedAtEpochMillis',
    ),
    uploadState: requiredUploadState(state.upload_state, 'photo.upload_state'),
  };
}

/**
 * Tenant-bound read-only adapter for one submitted inspection revision. It
 * reads the submitted revision header, the acknowledged synchronised payload,
 * photo upload states and review-issue counts, and derives recorded counts
 * (expected/accounted anchors, open issues, pending photos). It runs no
 * INSERT, UPDATE or DELETE statement and derives no jurisdiction rule.
 */
export class PostgresSubmittedEvidenceReader
  implements SubmittedEvidenceReader
{
  constructor(private readonly database: SqlDatabase) {}

  async find(
    companyId: string,
    inspectionId: string,
  ): Promise<SubmittedInspectionEvidence | undefined> {
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
        return this.readState(transaction, companyId, inspectionId);
      });
    } catch (error) {
      if (error instanceof ReviewFailure) throw error;
      throw storedFailure('submitted evidence is unavailable');
    }
  }

  private async readState(
    transaction: SqlTransaction,
    companyId: string,
    inspectionId: string,
  ): Promise<SubmittedInspectionEvidence | undefined> {
    const inspectionRow = firstRow(
      await transaction.query<InspectionStateRow>(
        `
          SELECT i.inspection_id, i.job_id, i.site_id, i.jurisdiction,
                 i.revision_number, i.inspector_user_id,
                 i.workflow_status AS inspection_workflow_status,
                 i.submitted_at, j.job_pack_version
          FROM inspections i
          JOIN jobs j
            ON j.company_id = i.company_id
           AND j.job_id = i.job_id
          WHERE i.company_id = $1 AND i.inspection_id = $2
        `,
        [companyId, inspectionId],
      ),
    );
    if (!inspectionRow) return undefined;

    const workflowStatus = requiredString(
      inspectionRow.inspection_workflow_status,
      'inspection_workflow_status',
    );
    if (workflowStatus !== 'submitted') {
      throw storedFailure(
        'inspection revision is not a submitted inspection revision',
      );
    }
    const submittedAt = requiredDate(
      inspectionRow.submitted_at,
      'inspection.submitted_at',
    );

    const jobId = requiredString(inspectionRow.job_id, 'job_id');
    const revisionRow = firstRow(
      await transaction.query<LatestRevisionRow>(
        `
          SELECT MAX(revision_number) AS latest_revision
          FROM inspections
          WHERE company_id = $1 AND job_id = $2
        `,
        [companyId, jobId],
      ),
    );
    if (!revisionRow) {
      throw storedFailure('submitted evidence read returned no job revision');
    }

    const countRow = firstRow(
      await transaction.query<ReviewCountRow>(
        `
          SELECT
            COUNT(*) FILTER (WHERE status = 'open' AND issue_type = 'blocker')
              AS open_blockers,
            COUNT(*) FILTER (WHERE status = 'open' AND issue_type = 'warning')
              AS open_warnings,
            COUNT(*) FILTER (WHERE status = 'open' AND issue_type = 'conflict')
              AS open_conflicts,
            COUNT(*) FILTER (WHERE status = 'open' AND issue_type = 'change')
              AS open_changes
          FROM review_issues
          WHERE company_id = $1 AND inspection_id = $2
        `,
        [companyId, inspectionId],
      ),
    );
    if (!countRow) {
      throw storedFailure(
        'submitted evidence read returned no review issue counts',
      );
    }

    const payloadRow = firstRow(
      await transaction.query<PayloadRow>(
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
      ),
    );
    if (!payloadRow) {
      throw storedFailure(
        'submitted evidence state has no synchronised inspection payload',
      );
    }

    const photoCountRow = firstRow(
      await transaction.query<PendingPhotoRow>(
        `
          SELECT
            COUNT(*) FILTER (WHERE p.upload_state <> 'uploaded')
              AS pending_photos,
            COUNT(*) FILTER (WHERE p.upload_state = 'failed')
              AS failed_photos
          FROM photos p
          JOIN anchor_inspections ai
            ON ai.company_id = p.company_id
           AND ai.anchor_inspection_id = p.anchor_inspection_id
          WHERE p.company_id = $1
            AND ai.inspection_id = $2
        `,
        [companyId, inspectionId],
      ),
    );
    if (!photoCountRow) {
      throw storedFailure(
        'submitted evidence read returned no photo upload counts',
      );
    }

    const photoStateRows = (
      await transaction.query<PhotoStateRow>(
        `
          SELECT p.photo_id, p.local_id, p.upload_state
          FROM photos p
          JOIN anchor_inspections ai
            ON ai.company_id = p.company_id
           AND ai.anchor_inspection_id = p.anchor_inspection_id
          WHERE p.company_id = $1
            AND ai.inspection_id = $2
        `,
        [companyId, inspectionId],
      )
    ).rows;
    const photoStates = new Map<string, PhotoStateRow>();
    for (const [index, row] of photoStateRows.entries()) {
      const localId = requiredString(row.local_id, `photo[${index}].local_id`);
      if (photoStates.has(localId)) {
        throw storedFailure(`photo[${index}].local_id is duplicated`);
      }
      photoStates.set(localId, row);
    }

    const jurisdiction = requiredString(
      inspectionRow.jurisdiction,
      'inspection.jurisdiction',
    );
    if (jurisdiction !== 'NSW' && jurisdiction !== 'QLD') {
      throw storedFailure(
        'submitted evidence read returned invalid jurisdiction',
      );
    }
    const jobPackVersion = requiredInteger(
      inspectionRow.job_pack_version,
      'job_pack_version',
    );
    const siteId = requiredString(inspectionRow.site_id, 'site_id');

    const submission = parsePayload(payloadRow.request_body);
    if (
      submission.companyId !== companyId ||
      submission.jobId !== jobId ||
      submission.siteId !== siteId ||
      submission.jurisdiction !== jurisdiction ||
      submission.jobPackVersion !== jobPackVersion
    ) {
      throw storedFailure(
        'submitted evidence payload does not match the submitted inspection row',
      );
    }

    const packRow = firstRow(
      await transaction.query<JobPackRow>(
        `
          SELECT job_id, job_pack_version, site_id, jurisdiction,
                 anchors_document
          FROM job_pack_snapshots
          WHERE company_id = $1 AND job_id = $2 AND job_pack_version = $3
        `,
        [companyId, submission.jobId, jobPackVersion],
      ),
    );
    if (
      !packRow ||
      packRow.job_id !== submission.jobId ||
      requiredInteger(
        packRow.job_pack_version,
        'job_pack_snapshot.job_pack_version',
      ) !== jobPackVersion ||
      packRow.site_id !== siteId ||
      packRow.jurisdiction !== jurisdiction
    ) {
      throw storedFailure(
        'matching immutable job-pack snapshot was not found for the submitted revision',
      );
    }
    const expectedAnchorCount = parseExpectedAnchorCount(
      packRow.anchors_document,
    );

    const accountedAnchorIds = new Set<string>();
    const anchors = submission.anchorInspections.map(
      (payloadAnchor, index): SubmittedEvidenceAnchor => {
        if (!isRecord(payloadAnchor)) {
          throw storedFailure(`anchor_inspections[${index}]`);
        }
        const anchorInspectionId = requiredString(
          payloadAnchor.inspectionId,
          `anchor_inspections[${index}].inspectionId`,
        );
        if (payloadAnchor.expectedAnchorId !== null) {
          accountedAnchorIds.add(payloadAnchor.expectedAnchorId);
        }
        return {
          anchorInspectionId,
          expectedAnchorId: optionalString(
            payloadAnchor.expectedAnchorId,
            `anchor_inspections[${index}].expectedAnchorId`,
          ),
          provisionalAnchorId: optionalString(
            payloadAnchor.provisionalAnchorId,
            `anchor_inspections[${index}].provisionalAnchorId`,
          ),
          identityConfirmed: payloadAnchor.identityConfirmed === true,
          locationConfirmed: payloadAnchor.locationConfirmed === true,
          location: optionalString(
            payloadAnchor.location,
            `anchor_inspections[${index}].location`,
          ),
          recordedOutcome: requiredOutcome(
            payloadAnchor.recordedOutcome,
            `anchor_inspections[${index}].recordedOutcome`,
          ),
          exceptionReason: requiredExceptionReason(
            payloadAnchor.exceptionReason,
            `anchor_inspections[${index}].exceptionReason`,
          ),
          reconciliationProposal: requiredProposal(
            payloadAnchor.reconciliationProposal,
            `anchor_inspections[${index}].reconciliationProposal`,
          ),
          reconciliationReferenceId: optionalString(
            payloadAnchor.reconciliationReferenceId,
            `anchor_inspections[${index}].reconciliationReferenceId`,
          ),
          disposition: requiredDisposition(
            payloadAnchor.disposition,
            `anchor_inspections[${index}].disposition`,
          ),
          notes: optionalString(
            payloadAnchor.notes,
            `anchor_inspections[${index}].notes`,
          ),
          observations: optionalString(
            payloadAnchor.observations,
            `anchor_inspections[${index}].observations`,
          ),
          defectDescription: optionalString(
            payloadAnchor.defectDescription,
            `anchor_inspections[${index}].defectDescription`,
          ),
          recommendation: optionalString(
            payloadAnchor.recommendation,
            `anchor_inspections[${index}].recommendation`,
          ),
          proofTestLoad: optionalString(
            payloadAnchor.proofTestLoad,
            `anchor_inspections[${index}].proofTestLoad`,
          ),
          proofTestHold: optionalString(
            payloadAnchor.proofTestHold,
            `anchor_inspections[${index}].proofTestHold`,
          ),
          proofTestResult: optionalString(
            payloadAnchor.proofTestResult,
            `anchor_inspections[${index}].proofTestResult`,
          ),
          proofTestEquipmentReference: optionalString(
            payloadAnchor.proofTestEquipmentReference,
            `anchor_inspections[${index}].proofTestEquipmentReference`,
          ),
          photos: payloadAnchor.photos.map((payloadPhoto, photoIndex) => {
            const state = photoStates.get(payloadPhoto.localId);
            if (!state) {
              throw storedFailure(
                `anchor_inspections[${index}].photos[${photoIndex}] has no stored upload state`,
              );
            }
            return photoMetadata(payloadPhoto, state);
          }),
        };
      },
    );

    const pendingPhotoCount = storedCount(
      photoCountRow.pending_photos,
      'pending_photos',
    );
    const failedPhotoCount = storedCount(
      photoCountRow.failed_photos,
      'failed_photos',
    );

    return {
      companyId,
      inspectionId: requiredString(
        inspectionRow.inspection_id,
        'inspection_id',
      ),
      revisionNumber: requiredInteger(
        inspectionRow.revision_number,
        'revision_number',
      ),
      latestRevisionNumber: requiredInteger(
        revisionRow.latest_revision,
        'latest_revision',
      ),
      workflowStatus: 'submitted',
      jobId,
      siteId,
      jurisdiction,
      jobPackVersion,
      inspectorUserId: requiredString(
        inspectionRow.inspector_user_id,
        'inspector_user_id',
      ),
      submittedAt,
      evidenceVersion: requiredInteger(
        payloadRow.entity_version,
        'entity_version',
      ),
      evidenceSynchronised: pendingPhotoCount === 0,
      pendingPhotoCount,
      failedPhotoCount,
      expectedAnchorCount,
      accountedAnchorCount: accountedAnchorIds.size,
      openBlockerCount: storedCount(countRow.open_blockers, 'open_blockers'),
      openWarningCount: storedCount(countRow.open_warnings, 'open_warnings'),
      openConflictCount: storedCount(countRow.open_conflicts, 'open_conflicts'),
      openChangeRequestCount: storedCount(
        countRow.open_changes,
        'open_changes',
      ),
      anchors,
    };
  }
}

function firstRow<Row extends Record<string, unknown>>(
  result: SqlResult<Row>,
): Row | undefined {
  return result.rows[0];
}
