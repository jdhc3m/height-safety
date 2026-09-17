import type { AuthPrincipal, ProductRole } from '../identity/auth.types';
import type {
  SyncInspectionSubmissionPayload,
  SyncJurisdiction,
} from '../sync/sync.types';

export const APPROVED_REVIEW_STATUSES = [
  'approved_for_report_generation',
] as const;
export type ApprovedReviewStatus = (typeof APPROVED_REVIEW_STATUSES)[number];

export type ApprovedSnapshotFailureCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ROLE_FORBIDDEN'
  | 'PERSISTENCE_UNAVAILABLE';

export class ApprovedSnapshotFailure extends Error {
  constructor(
    readonly code: ApprovedSnapshotFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApprovedSnapshotFailure';
  }
}

/**
 * This is the handoff produced by the office-review boundary. The 3D-01
 * implementation will become the authoritative producer of this value; this
 * ticket only verifies the approval gates before freezing it.
 */
export interface ApprovedSnapshotSource {
  readonly approvalId: string;
  readonly reviewStatus: ApprovedReviewStatus;
  readonly companyId: string;
  readonly jobId: string;
  readonly siteId: string;
  readonly jurisdiction: SyncJurisdiction;
  readonly inspectionId: string;
  readonly inspectionRevision: number;
  readonly evidenceVersion: number;
  readonly jobPackVersion: number;
  readonly inspectorUserId: string;
  readonly requiredEvidenceSynchronised: boolean;
  readonly openHardBlockerCount: number;
  readonly openChangeRequestCount: number;
  readonly submission: SyncInspectionSubmissionPayload;
}

export interface ApprovedSnapshotDocument {
  readonly snapshotSchemaVersion: 1;
  readonly approvalId: string;
  readonly reviewStatus: ApprovedReviewStatus;
  readonly companyId: string;
  readonly jobId: string;
  readonly siteId: string;
  readonly jurisdiction: SyncJurisdiction;
  readonly sourceInspectionId: string;
  readonly sourceInspectionRevision: number;
  readonly sourceEvidenceVersion: number;
  readonly jobPackVersion: number;
  readonly inspectorUserId: string;
  readonly approvedByUserId: string;
  readonly approvedAt: string;
  readonly sourceIdentitySha256: string;
  readonly inspectionSubmission: SyncInspectionSubmissionPayload;
}

export interface ApprovedSnapshot {
  readonly companyId: string;
  readonly snapshotId: string;
  readonly approvalId: string;
  readonly jobId: string;
  readonly siteId: string;
  readonly jurisdiction: SyncJurisdiction;
  readonly sourceInspectionId: string;
  readonly sourceInspectionRevision: number;
  readonly sourceEvidenceVersion: number;
  readonly approvedByUserId: string;
  readonly approvedAt: Date;
  readonly sourceIdentitySha256: string;
  /** Canonical JSON persisted in inspection_snapshots.snapshot_document. */
  readonly documentJson: string;
  readonly document: ApprovedSnapshotDocument;
  /** SHA-256 of documentJson, persisted in inspection_snapshots.sha256. */
  readonly sha256: string;
}

export interface ApprovedSnapshotResult {
  readonly snapshot: ApprovedSnapshot;
  readonly replayed: boolean;
}

/**
 * The authoritative 3D-01/3C durable view of one submitted inspection
 * revision. The approval boundary reads this from persistence instead of
 * trusting caller-supplied gate counts. Counts and synchronisation flags are
 * recorded outcomes of stored review issues, mutations and photo uploads;
 * they never assert compliance or a technical judgement.
 */
export interface ApprovedSnapshotSubmissionState {
  readonly inspectionId: string;
  /** Server-assigned inspection revision (D-048). */
  readonly revisionNumber: number;
  /** Highest server-assigned revision recorded for the same job. */
  readonly latestRevisionNumber: number;
  readonly workflowStatus: string;
  readonly jobPackVersion: number;
  readonly inspectorUserId: string;
  readonly requiredEvidenceSynchronised: boolean;
  readonly openHardBlockerCount: number;
  readonly openChangeRequestCount: number;
  /**
   * The entity version of the synchronised submission mutation that carried
   * the frozen payload; it is the durable server-side identity of the
   * acknowledged evidence revision.
   */
  readonly evidenceVersion: number;
  readonly submission: SyncInspectionSubmissionPayload;
}

export interface ApprovedSnapshotStateReader {
  findSubmissionState(
    companyId: string,
    inspectionId: string,
  ): Promise<ApprovedSnapshotSubmissionState | undefined>;
}

/**
 * Durable stores must implement this so the snapshot, its audit event and the
 * mutable job workflow pointer commit or roll back together. The submitted
 * inspection row itself is never mutated.
 */
export interface JobTransitionApprovalStore extends ApprovedSnapshotStore {
  createApprovalWithJobTransition(
    snapshot: ApprovedSnapshot,
    event: ApprovedSnapshotAuditEvent,
  ): Promise<void>;
}

export class UnconfiguredApprovedSnapshotStateReader
  implements ApprovedSnapshotStateReader
{
  async findSubmissionState(
    _companyId: string,
    _inspectionId: string,
  ): Promise<ApprovedSnapshotSubmissionState | undefined> {
    throw new ApprovedSnapshotFailure(
      'PERSISTENCE_UNAVAILABLE',
      'approved snapshot state reader is not configured',
    );
  }
}

/**
 * There is intentionally no update or delete method. A durable adapter must
 * implement this interface with the same application and database-level
 * immutability guarantees.
 */
export interface ApprovedSnapshotStore {
  findById(
    companyId: string,
    snapshotId: string,
  ): Promise<ApprovedSnapshot | undefined>;
  findByApprovalId(
    companyId: string,
    approvalId: string,
  ): Promise<ApprovedSnapshot | undefined>;
  create(snapshot: ApprovedSnapshot): Promise<void>;
}

export interface ApprovedSnapshotAuditEvent {
  readonly companyId: string;
  readonly actorUserId: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly occurredAt: Date;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface ApprovedSnapshotAuditSink {
  record(event: ApprovedSnapshotAuditEvent): void | Promise<void>;
}

/**
 * Durable stores may implement this stronger boundary so a newly approved
 * snapshot and its audit event commit or roll back together. The separate
 * audit sink remains available for provider-neutral service tests and stores
 * that do not yet expose a transaction-aware adapter.
 */
export interface AtomicApprovedSnapshotStore extends ApprovedSnapshotStore {
  createWithAudit(
    snapshot: ApprovedSnapshot,
    event: ApprovedSnapshotAuditEvent,
  ): Promise<void>;
}

export class NoopApprovedSnapshotAuditSink
  implements ApprovedSnapshotAuditSink
{
  record(_event: ApprovedSnapshotAuditEvent): void {
    // The durable audit adapter remains unconfigured until runtime persistence
    // is selected. The service still emits an application-owned event.
  }
}

export interface ApprovedSnapshotClock {
  now(): Date;
}

export interface ApprovedSnapshotIdGenerator {
  createId(): string;
}

export function canApproveSnapshot(role: ProductRole): boolean {
  return role === 'administrator' || role === 'office_reviewer';
}

export function assertCanApproveSnapshot(principal: AuthPrincipal): void {
  if (!canApproveSnapshot(principal.role)) {
    throw new ApprovedSnapshotFailure(
      'ROLE_FORBIDDEN',
      'Administrator or Office reviewer role is required',
    );
  }
}

export class UnconfiguredApprovedSnapshotStore
  implements ApprovedSnapshotStore
{
  private unavailable(): never {
    throw new ApprovedSnapshotFailure(
      'PERSISTENCE_UNAVAILABLE',
      'approved snapshot persistence adapter is not configured',
    );
  }

  async findById(
    _companyId: string,
    _snapshotId: string,
  ): Promise<ApprovedSnapshot | undefined> {
    return this.unavailable();
  }

  async findByApprovalId(
    _companyId: string,
    _approvalId: string,
  ): Promise<ApprovedSnapshot | undefined> {
    return this.unavailable();
  }

  async create(_snapshot: ApprovedSnapshot): Promise<void> {
    this.unavailable();
  }
}

export const systemApprovedSnapshotClock: ApprovedSnapshotClock = {
  now: () => new Date(),
};
