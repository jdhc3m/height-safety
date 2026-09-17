import { createHash, randomBytes } from 'node:crypto';

import type { AuthPrincipal } from '../identity/auth.types';
import {
  SYNC_DISPOSITIONS,
  SYNC_EXCEPTION_REASONS,
  SYNC_JURISDICTIONS,
  SYNC_RECONCILIATION_PROPOSALS,
  SYNC_RECORDED_OUTCOMES,
  type SyncInspectionPhotoPayload,
  type SyncInspectionSubmissionPayload,
} from '../sync/sync.types';
import {
  APPROVED_REVIEW_STATUSES,
  ApprovedSnapshotFailure,
  assertCanApproveSnapshot,
  type ApprovedSnapshot,
  type ApprovedSnapshotAuditSink,
  type ApprovedSnapshotClock,
  type ApprovedSnapshotDocument,
  type ApprovedSnapshotIdGenerator,
  type ApprovedSnapshotSource,
  type ApprovedSnapshotStateReader,
  type ApprovedSnapshotStore,
  type ApprovedSnapshotResult,
  type AtomicApprovedSnapshotStore,
  type JobTransitionApprovalStore,
} from './approved-snapshot.types';
import {
  copyApprovedSnapshot,
  copySubmissionPayload,
} from './approved-snapshot-store';

const ID_MAX_LENGTH = 128;
const TEXT_MAX_LENGTH = 10_000;

export interface ApprovedSnapshotServiceOptions {
  readonly store: ApprovedSnapshotStore;
  readonly auditSink: ApprovedSnapshotAuditSink;
  readonly clock: ApprovedSnapshotClock;
  readonly idGenerator: ApprovedSnapshotIdGenerator;
  /** Required for the authoritative durable-state approval path. */
  readonly stateReader?: ApprovedSnapshotStateReader;
}

export interface ApproveInspectionInput {
  readonly inspectionId: string;
}

function requiredId(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ApprovedSnapshotFailure('INVALID_INPUT', `${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > ID_MAX_LENGTH) {
    throw new ApprovedSnapshotFailure(
      'INVALID_INPUT',
      `${field} must be between 1 and ${ID_MAX_LENGTH} characters`,
    );
  }
  return normalized;
}

function optionalText(
  value: unknown,
  field: string,
  maxLength = TEXT_MAX_LENGTH,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new ApprovedSnapshotFailure(
      'INVALID_INPUT',
      `${field} must be null or a string of at most ${maxLength} characters`,
    );
  }
  return value;
}

function requiredInteger(
  value: unknown,
  field: string,
  minimum: number,
): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new ApprovedSnapshotFailure(
      'INVALID_INPUT',
      `${field} must be a safe integer of at least ${minimum}`,
    );
  }
  return value as number;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ApprovedSnapshotFailure(
      'INVALID_INPUT',
      `${field} must be a boolean`,
    );
  }
  return value;
}

function requiredEnum<const T extends readonly string[]>(
  value: unknown,
  field: string,
  values: T,
): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new ApprovedSnapshotFailure(
      'INVALID_INPUT',
      `${field} is not supported`,
    );
  }
  return value as T[number];
}

function optionalEnum<const T extends readonly string[]>(
  value: unknown,
  field: string,
  values: T,
): T[number] | null {
  if (value === undefined || value === null) return null;
  return requiredEnum(value, field, values);
}

function requiredObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApprovedSnapshotFailure(
      'INVALID_INPUT',
      `${field} must be an object`,
    );
  }
  return value as Record<string, unknown>;
}

function requiredArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new ApprovedSnapshotFailure(
      'INVALID_INPUT',
      `${field} must be an array`,
    );
  }
  return value;
}

function normalizePhoto(
  value: unknown,
  index: number,
): SyncInspectionPhotoPayload {
  const candidate = requiredObject(value, `submission photo ${index}`);
  const byteSize =
    candidate.byteSize === undefined || candidate.byteSize === null
      ? null
      : requiredInteger(
          candidate.byteSize,
          `submission photo ${index}.byteSize`,
          0,
        );
  return {
    localId: requiredId(candidate.localId, `submission photo ${index}.localId`),
    storageReference: requiredId(
      candidate.storageReference,
      `submission photo ${index}.storageReference`,
    ),
    capturedAtEpochMillis: requiredInteger(
      candidate.capturedAtEpochMillis,
      `submission photo ${index}.capturedAtEpochMillis`,
      0,
    ),
    checksum: requiredId(
      candidate.checksum,
      `submission photo ${index}.checksum`,
    ),
    contentType: optionalText(
      candidate.contentType,
      `submission photo ${index}.contentType`,
      128,
    ),
    byteSize,
  };
}

function normalizeAnchorInspection(
  value: unknown,
  index: number,
): SyncInspectionSubmissionPayload['anchorInspections'][number] {
  const candidate = requiredObject(
    value,
    `submission anchor inspection ${index}`,
  );
  const photos = requiredArray(
    candidate.photos,
    `submission anchor inspection ${index}.photos`,
  );
  if (photos.length > 100) {
    throw new ApprovedSnapshotFailure(
      'INVALID_INPUT',
      `submission anchor inspection ${index}.photos cannot contain more than 100 photos`,
    );
  }
  return {
    inspectionId: requiredId(
      candidate.inspectionId,
      `submission anchor inspection ${index}.inspectionId`,
    ),
    expectedAnchorId: optionalText(
      candidate.expectedAnchorId,
      `submission anchor inspection ${index}.expectedAnchorId`,
      ID_MAX_LENGTH,
    ),
    provisionalAnchorId: optionalText(
      candidate.provisionalAnchorId,
      `submission anchor inspection ${index}.provisionalAnchorId`,
      ID_MAX_LENGTH,
    ),
    identityConfirmed: requiredBoolean(
      candidate.identityConfirmed,
      `submission anchor inspection ${index}.identityConfirmed`,
    ),
    locationConfirmed: requiredBoolean(
      candidate.locationConfirmed,
      `submission anchor inspection ${index}.locationConfirmed`,
    ),
    location: optionalText(
      candidate.location,
      `submission anchor inspection ${index}.location`,
    ),
    observations: optionalText(
      candidate.observations,
      `submission anchor inspection ${index}.observations`,
    ),
    recordedOutcome: optionalEnum(
      candidate.recordedOutcome,
      `submission anchor inspection ${index}.recordedOutcome`,
      SYNC_RECORDED_OUTCOMES,
    ),
    exceptionReason: optionalEnum(
      candidate.exceptionReason,
      `submission anchor inspection ${index}.exceptionReason`,
      SYNC_EXCEPTION_REASONS,
    ),
    reconciliationProposal: optionalEnum(
      candidate.reconciliationProposal,
      `submission anchor inspection ${index}.reconciliationProposal`,
      SYNC_RECONCILIATION_PROPOSALS,
    ),
    reconciliationReferenceId: optionalText(
      candidate.reconciliationReferenceId,
      `submission anchor inspection ${index}.reconciliationReferenceId`,
      ID_MAX_LENGTH,
    ),
    disposition: optionalEnum(
      candidate.disposition,
      `submission anchor inspection ${index}.disposition`,
      SYNC_DISPOSITIONS,
    ),
    notes: optionalText(
      candidate.notes,
      `submission anchor inspection ${index}.notes`,
    ),
    defectDescription: optionalText(
      candidate.defectDescription,
      `submission anchor inspection ${index}.defectDescription`,
    ),
    recommendation: optionalText(
      candidate.recommendation,
      `submission anchor inspection ${index}.recommendation`,
    ),
    proofTestLoad: optionalText(
      candidate.proofTestLoad,
      `submission anchor inspection ${index}.proofTestLoad`,
    ),
    proofTestHold: optionalText(
      candidate.proofTestHold,
      `submission anchor inspection ${index}.proofTestHold`,
    ),
    proofTestResult: optionalText(
      candidate.proofTestResult,
      `submission anchor inspection ${index}.proofTestResult`,
    ),
    proofTestEquipmentReference: optionalText(
      candidate.proofTestEquipmentReference,
      `submission anchor inspection ${index}.proofTestEquipmentReference`,
    ),
    photos: photos.map(normalizePhoto),
  };
}

function normalizeSubmission(value: unknown): SyncInspectionSubmissionPayload {
  const candidate = requiredObject(value, 'submission');
  const anchorInspections = requiredArray(
    candidate.anchorInspections,
    'submission.anchorInspections',
  );
  if (anchorInspections.length > 1_000) {
    throw new ApprovedSnapshotFailure(
      'INVALID_INPUT',
      'submission.anchorInspections cannot contain more than 1000 inspections',
    );
  }
  return {
    companyId: requiredId(candidate.companyId, 'submission.companyId'),
    jobId: requiredId(candidate.jobId, 'submission.jobId'),
    siteId: requiredId(candidate.siteId, 'submission.siteId'),
    jurisdiction: requiredEnum(
      candidate.jurisdiction,
      'submission.jurisdiction',
      SYNC_JURISDICTIONS,
    ),
    submissionId: requiredId(candidate.submissionId, 'submission.submissionId'),
    jobPackVersion: requiredInteger(
      candidate.jobPackVersion,
      'submission.jobPackVersion',
      1,
    ),
    anchorInspections: anchorInspections.map(normalizeAnchorInspection),
  };
}

function normalizeSource(value: unknown): ApprovedSnapshotSource {
  const candidate = requiredObject(value, 'approved snapshot source');
  const submission = normalizeSubmission(candidate.submission);
  const source: ApprovedSnapshotSource = {
    approvalId: requiredId(candidate.approvalId, 'approvalId'),
    reviewStatus: requiredEnum(
      candidate.reviewStatus,
      'reviewStatus',
      APPROVED_REVIEW_STATUSES,
    ),
    companyId: requiredId(candidate.companyId, 'companyId'),
    jobId: requiredId(candidate.jobId, 'jobId'),
    siteId: requiredId(candidate.siteId, 'siteId'),
    jurisdiction: requiredEnum(
      candidate.jurisdiction,
      'jurisdiction',
      SYNC_JURISDICTIONS,
    ),
    inspectionId: requiredId(candidate.inspectionId, 'inspectionId'),
    inspectionRevision: requiredInteger(
      candidate.inspectionRevision,
      'inspectionRevision',
      1,
    ),
    evidenceVersion: requiredInteger(
      candidate.evidenceVersion,
      'evidenceVersion',
      1,
    ),
    jobPackVersion: requiredInteger(
      candidate.jobPackVersion,
      'jobPackVersion',
      1,
    ),
    inspectorUserId: requiredId(candidate.inspectorUserId, 'inspectorUserId'),
    requiredEvidenceSynchronised: requiredBoolean(
      candidate.requiredEvidenceSynchronised,
      'requiredEvidenceSynchronised',
    ),
    openHardBlockerCount: requiredInteger(
      candidate.openHardBlockerCount,
      'openHardBlockerCount',
      0,
    ),
    openChangeRequestCount: requiredInteger(
      candidate.openChangeRequestCount,
      'openChangeRequestCount',
      0,
    ),
    submission,
  };

  if (
    source.companyId !== submission.companyId ||
    source.jobId !== submission.jobId ||
    source.siteId !== submission.siteId ||
    source.jurisdiction !== submission.jurisdiction ||
    source.jobPackVersion !== submission.jobPackVersion
  ) {
    throw new ApprovedSnapshotFailure(
      'CONFLICT',
      'approved snapshot source does not match its inspection submission',
    );
  }

  return source;
}

function canonicalSourceIdentity(source: ApprovedSnapshotSource): string {
  return JSON.stringify({
    snapshotSchemaVersion: 1,
    approvalId: source.approvalId,
    reviewStatus: source.reviewStatus,
    companyId: source.companyId,
    jobId: source.jobId,
    siteId: source.siteId,
    jurisdiction: source.jurisdiction,
    sourceInspectionId: source.inspectionId,
    sourceInspectionRevision: source.inspectionRevision,
    sourceEvidenceVersion: source.evidenceVersion,
    jobPackVersion: source.jobPackVersion,
    inspectorUserId: source.inspectorUserId,
    inspectionSubmission: copySubmissionPayload(source.submission),
  });
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function copyDate(value: Date): Date {
  return new Date(value.getTime());
}

export class ApprovedSnapshotService {
  constructor(private readonly options: ApprovedSnapshotServiceOptions) {}

  async create(
    principal: AuthPrincipal,
    source: ApprovedSnapshotSource,
  ): Promise<ApprovedSnapshotResult> {
    assertCanApproveSnapshot(principal);
    const normalized = normalizeSource(source);
    this.assertSourceCompany(principal, normalized);
    this.assertApprovalGates(normalized);
    return this.freeze(principal, normalized, { moveJobPointer: false });
  }

  /**
   * Authoritative approval path. The submitted inspection revision, its
   * review-issue counts and evidence synchronisation state are read from
   * durable persistence; caller-supplied gate counts are never trusted. The
   * approval identity is derived from the server-assigned inspection revision
   * (D-048), so each resubmission revision requires its own approval.
   */
  async createApproved(
    principal: AuthPrincipal,
    input: ApproveInspectionInput,
  ): Promise<ApprovedSnapshotResult> {
    assertCanApproveSnapshot(principal);
    const reader = this.options.stateReader;
    if (!reader) {
      throw new ApprovedSnapshotFailure(
        'PERSISTENCE_UNAVAILABLE',
        'approved snapshot state reader is not configured',
      );
    }
    const inspectionId = requiredId(input.inspectionId, 'inspectionId');
    const state = await reader.findSubmissionState(
      principal.companyId,
      inspectionId,
    );
    if (!state) {
      throw new ApprovedSnapshotFailure(
        'NOT_FOUND',
        'submitted inspection was not found',
      );
    }
    if (state.workflowStatus !== 'submitted') {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'inspection revision is not submitted for review',
      );
    }
    if (state.latestRevisionNumber !== state.revisionNumber) {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'a newer inspection revision exists for this job',
      );
    }

    const normalized = normalizeSource({
      approvalId: `inspection:${state.inspectionId}:rev:${state.revisionNumber}`,
      reviewStatus: APPROVED_REVIEW_STATUSES[0],
      companyId: principal.companyId,
      jobId: state.submission.jobId,
      siteId: state.submission.siteId,
      jurisdiction: state.submission.jurisdiction,
      inspectionId: state.inspectionId,
      inspectionRevision: state.revisionNumber,
      evidenceVersion: state.evidenceVersion,
      jobPackVersion: state.jobPackVersion,
      inspectorUserId: state.inspectorUserId,
      requiredEvidenceSynchronised: state.requiredEvidenceSynchronised,
      openHardBlockerCount: state.openHardBlockerCount,
      openChangeRequestCount: state.openChangeRequestCount,
      submission: state.submission,
    });
    this.assertApprovalGates(normalized);
    return this.freeze(principal, normalized, { moveJobPointer: true });
  }

  private assertSourceCompany(
    principal: AuthPrincipal,
    normalized: ApprovedSnapshotSource,
  ): void {
    if (normalized.companyId !== principal.companyId) {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'approved snapshot source belongs to another company',
      );
    }
  }

  private assertApprovalGates(normalized: ApprovedSnapshotSource): void {
    if (!normalized.requiredEvidenceSynchronised) {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'required inspection evidence is not synchronised',
      );
    }
    if (normalized.openHardBlockerCount !== 0) {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'inspection has unresolved hard blockers',
      );
    }
    if (normalized.openChangeRequestCount !== 0) {
      throw new ApprovedSnapshotFailure(
        'CONFLICT',
        'inspection has open change requests',
      );
    }
  }

  private async freeze(
    principal: AuthPrincipal,
    normalized: ApprovedSnapshotSource,
    options: { moveJobPointer: boolean },
  ): Promise<ApprovedSnapshotResult> {
    const sourceIdentityJson = canonicalSourceIdentity(normalized);
    const sourceIdentitySha256 = sha256(sourceIdentityJson);
    const existing = await this.options.store.findByApprovalId(
      principal.companyId,
      normalized.approvalId,
    );
    if (existing) {
      if (existing.sourceIdentitySha256 !== sourceIdentitySha256) {
        throw new ApprovedSnapshotFailure(
          'CONFLICT',
          'approved snapshot source cannot be rewritten',
        );
      }
      return { snapshot: copyApprovedSnapshot(existing), replayed: true };
    }

    const approvedAt = this.options.clock.now();
    if (Number.isNaN(approvedAt.getTime())) {
      throw new Error('approved snapshot clock returned invalid date');
    }
    const snapshotId = requiredId(
      this.options.idGenerator.createId(),
      'snapshotId',
    );
    const document: ApprovedSnapshotDocument = {
      snapshotSchemaVersion: 1,
      approvalId: normalized.approvalId,
      reviewStatus: normalized.reviewStatus,
      companyId: normalized.companyId,
      jobId: normalized.jobId,
      siteId: normalized.siteId,
      jurisdiction: normalized.jurisdiction,
      sourceInspectionId: normalized.inspectionId,
      sourceInspectionRevision: normalized.inspectionRevision,
      sourceEvidenceVersion: normalized.evidenceVersion,
      jobPackVersion: normalized.jobPackVersion,
      inspectorUserId: normalized.inspectorUserId,
      approvedByUserId: principal.userId,
      approvedAt: approvedAt.toISOString(),
      sourceIdentitySha256,
      inspectionSubmission: copySubmissionPayload(normalized.submission),
    };
    const documentJson = JSON.stringify(document);
    const snapshot: ApprovedSnapshot = {
      companyId: normalized.companyId,
      snapshotId,
      approvalId: normalized.approvalId,
      jobId: normalized.jobId,
      siteId: normalized.siteId,
      jurisdiction: normalized.jurisdiction,
      sourceInspectionId: normalized.inspectionId,
      sourceInspectionRevision: normalized.inspectionRevision,
      sourceEvidenceVersion: normalized.evidenceVersion,
      approvedByUserId: principal.userId,
      approvedAt: copyDate(approvedAt),
      sourceIdentitySha256,
      documentJson,
      document,
      sha256: sha256(documentJson),
    };

    const auditEvent = {
      companyId: principal.companyId,
      actorUserId: principal.userId,
      action: 'inspection.snapshot_approved',
      targetType: 'inspection_snapshot',
      targetId: snapshotId,
      occurredAt: copyDate(approvedAt),
      metadata: {
        jurisdiction: snapshot.jurisdiction,
        sourceInspectionRevision: snapshot.sourceInspectionRevision,
        sourceEvidenceVersion: snapshot.sourceEvidenceVersion,
      },
    } satisfies Parameters<ApprovedSnapshotAuditSink['record']>[0];

    try {
      if (options.moveJobPointer) {
        const jobTransitionStore = this.options
          .store as Partial<JobTransitionApprovalStore>;
        if (
          typeof jobTransitionStore.createApprovalWithJobTransition !==
          'function'
        ) {
          throw new ApprovedSnapshotFailure(
            'PERSISTENCE_UNAVAILABLE',
            'approved snapshot store cannot move the job workflow pointer',
          );
        }
        await jobTransitionStore.createApprovalWithJobTransition(
          snapshot,
          auditEvent,
        );
        return { snapshot: copyApprovedSnapshot(snapshot), replayed: false };
      }
      const atomicStore = this.options
        .store as Partial<AtomicApprovedSnapshotStore>;
      if (typeof atomicStore.createWithAudit === 'function') {
        await atomicStore.createWithAudit(snapshot, auditEvent);
      } else {
        await this.options.store.create(snapshot);
        await this.options.auditSink.record(auditEvent);
      }
    } catch (error) {
      // A durable store may reject a concurrent insert after both callers
      // observed no existing approval. Re-read the approval so a retry still
      // has exactly-once behaviour when the source is identical.
      if (
        error instanceof ApprovedSnapshotFailure &&
        error.code === 'CONFLICT'
      ) {
        const concurrent = await this.options.store.findByApprovalId(
          principal.companyId,
          normalized.approvalId,
        );
        if (
          concurrent &&
          concurrent.sourceIdentitySha256 === sourceIdentitySha256
        ) {
          return { snapshot: copyApprovedSnapshot(concurrent), replayed: true };
        }
      }
      throw error;
    }
    return { snapshot: copyApprovedSnapshot(snapshot), replayed: false };
  }

  async get(
    principal: AuthPrincipal,
    snapshotId: string,
  ): Promise<ApprovedSnapshot> {
    assertCanApproveSnapshot(principal);
    const normalizedSnapshotId = requiredId(snapshotId, 'snapshotId');
    const snapshot = await this.options.store.findById(
      principal.companyId,
      normalizedSnapshotId,
    );
    if (!snapshot || snapshot.companyId !== principal.companyId) {
      throw new ApprovedSnapshotFailure(
        'NOT_FOUND',
        'approved snapshot was not found',
      );
    }
    return copyApprovedSnapshot(snapshot);
  }
}

export const secureApprovedSnapshotIdGenerator: ApprovedSnapshotIdGenerator = {
  createId: () => randomBytes(16).toString('hex'),
};
