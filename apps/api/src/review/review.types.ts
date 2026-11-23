import { randomBytes } from 'node:crypto';

import type { AuthPrincipal, ProductRole } from '../identity/auth.types';
import type {
  SyncDisposition,
  SyncExceptionReason,
  SyncReconciliationProposal,
  SyncRecordedOutcome,
  SyncJurisdiction,
} from '../sync/sync.types';

export const REVIEW_ISSUE_TYPES = [
  'blocker',
  'warning',
  'conflict',
  'change',
] as const;
export type ReviewIssueType = (typeof REVIEW_ISSUE_TYPES)[number];

export const REVIEW_ISSUE_STATUSES = ['open', 'resolved'] as const;
export type ReviewIssueStatus = (typeof REVIEW_ISSUE_STATUSES)[number];

export const SUBMITTED_PHOTO_UPLOAD_STATES = [
  'pending_upload',
  'uploaded',
  'failed',
] as const;
export type SubmittedPhotoUploadState =
  (typeof SUBMITTED_PHOTO_UPLOAD_STATES)[number];

export interface SubmittedEvidencePhotoMetadata {
  readonly photoId: string;
  readonly localId: string;
  readonly checksum: string;
  readonly capturedAt: string;
  readonly uploadState: SubmittedPhotoUploadState;
}

/**
 * One submitted per-anchor inspection as the office can read it. Values are
 * recorded outcomes copied from the synchronised submission payload; this
 * boundary derives no jurisdiction rule and offers no write path.
 */
export interface SubmittedEvidenceAnchor {
  readonly anchorInspectionId: string;
  readonly expectedAnchorId: string | null;
  readonly provisionalAnchorId: string | null;
  readonly identityConfirmed: boolean;
  readonly locationConfirmed: boolean;
  readonly location: string | null;
  readonly recordedOutcome: SyncRecordedOutcome | null;
  readonly exceptionReason: SyncExceptionReason | null;
  readonly reconciliationProposal: SyncReconciliationProposal | null;
  readonly reconciliationReferenceId: string | null;
  readonly disposition: SyncDisposition | null;
  readonly notes: string | null;
  readonly observations: string | null;
  readonly defectDescription: string | null;
  readonly recommendation: string | null;
  readonly proofTestLoad: string | null;
  readonly proofTestHold: string | null;
  readonly proofTestResult: string | null;
  readonly proofTestEquipmentReference: string | null;
  readonly photos: readonly SubmittedEvidencePhotoMetadata[];
}

/**
 * Office read model for one submitted inspection revision. Counts are
 * recorded outcomes of stored rows so the office web can derive
 * accounted/expected anchor totals, conflict visibility and photo-pending
 * flags without guessing; they are never a pass/fail verdict.
 */
export interface SubmittedInspectionEvidence {
  readonly companyId: string;
  readonly inspectionId: string;
  readonly revisionNumber: number;
  readonly latestRevisionNumber: number;
  readonly workflowStatus: 'submitted';
  readonly jobId: string;
  readonly siteId: string;
  readonly jurisdiction: SyncJurisdiction;
  readonly jobPackVersion: number;
  readonly inspectorUserId: string;
  readonly submittedAt: Date;
  readonly evidenceVersion: number;
  readonly evidenceSynchronised: boolean;
  readonly pendingPhotoCount: number;
  readonly failedPhotoCount: number;
  readonly expectedAnchorCount: number;
  readonly accountedAnchorCount: number;
  readonly openBlockerCount: number;
  readonly openWarningCount: number;
  readonly openConflictCount: number;
  readonly openChangeRequestCount: number;
  readonly anchors: readonly SubmittedEvidenceAnchor[];
}

/**
 * One recorded outcome for a register anchor inside one submitted inspection
 * revision. Values are recorded outcomes copied from stored submitted rows;
 * this boundary derives no jurisdiction rule and offers no write path.
 */
export interface AnchorRecordedOutcome {
  readonly companyId: string;
  readonly anchorInspectionId: string;
  readonly inspectionId: string;
  readonly revisionNumber: number;
  readonly jobId: string;
  readonly jobReference: string;
  readonly submittedAt: Date;
  readonly recordedOutcome: SyncRecordedOutcome | null;
  readonly exceptionReason: SyncExceptionReason | null;
  readonly disposition: SyncDisposition | null;
  readonly photos: readonly SubmittedEvidencePhotoMetadata[];
}

export type ReviewFailureCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ROLE_FORBIDDEN'
  | 'PERSISTENCE_UNAVAILABLE';

export class ReviewFailure extends Error {
  constructor(
    readonly code: ReviewFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'ReviewFailure';
  }
}

export interface ReviewIssueRecord {
  readonly companyId: string;
  readonly reviewIssueId: string;
  readonly inspectionId: string;
  readonly anchorInspectionId: string | null;
  readonly issueType: ReviewIssueType;
  readonly status: ReviewIssueStatus;
  readonly reviewerUserId: string;
  readonly reason: string;
  readonly createdAt: Date;
  readonly resolvedAt: Date | null;
}

export interface ReviewActionRecord {
  readonly companyId: string;
  readonly reviewActionId: string;
  readonly reviewIssueId: string;
  readonly reviewerUserId: string;
  readonly action: 'issue_created' | 'changes_requested' | 'resolved';
  readonly reason: string;
  readonly createdAt: Date;
}

export interface ReviewAuditEvent {
  readonly companyId: string;
  readonly actorUserId: string;
  readonly action:
    | 'review.issue_created'
    | 'review.changes_requested'
    | 'review.issue_resolved';
  readonly targetType: 'review_issue';
  readonly targetId: string;
  readonly occurredAt: Date;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface ReviewStore {
  /**
   * Persists the issue, its first append-only action and the audit event in
   * one durable boundary when the PostgreSQL adapter is selected.
   */
  createIssue(
    issue: ReviewIssueRecord,
    action: ReviewActionRecord,
    auditEvent: ReviewAuditEvent,
  ): void | Promise<void>;

  getIssue(
    companyId: string,
    reviewIssueId: string,
  ): ReviewIssueRecord | undefined | Promise<ReviewIssueRecord | undefined>;

  listIssues(
    companyId: string,
    inspectionId: string,
  ): readonly ReviewIssueRecord[] | Promise<readonly ReviewIssueRecord[]>;

  listActions(
    companyId: string,
    reviewIssueId: string,
  ): readonly ReviewActionRecord[] | Promise<readonly ReviewActionRecord[]>;

  /** Returns false when another request already resolved the issue. */
  resolveIssue(
    issue: ReviewIssueRecord,
    action: ReviewActionRecord,
    auditEvent: ReviewAuditEvent,
  ): boolean | Promise<boolean>;
}

export interface ReviewClock {
  now(): Date;
}

export interface ReviewIdGenerator {
  createId(): string;
}

/**
 * Read-only port for one submitted inspection revision and its anchor
 * evidence. Implementations must never mutate submitted data.
 */
export interface SubmittedEvidenceReader {
  find(
    companyId: string,
    inspectionId: string,
  ):
    | SubmittedInspectionEvidence
    | undefined
    | Promise<SubmittedInspectionEvidence | undefined>;
}

/**
 * Read-only port for one register anchor's recorded outcomes across its
 * submitted inspection revisions. `listRecordedOutcomes` returns undefined
 * when the register anchor does not exist and an empty list when it has no
 * submitted inspection revision yet. `findPreviousRevision` returns the
 * recorded outcome submitted immediately before the referenced anchor
 * inspection, or undefined when the anchor inspection does not exist, names
 * no register anchor, or has no earlier submitted revision. Implementations
 * must never mutate submitted data.
 */
export interface AnchorHistoryReader {
  listRecordedOutcomes(
    companyId: string,
    anchorId: string,
  ):
    | readonly AnchorRecordedOutcome[]
    | undefined
    | Promise<readonly AnchorRecordedOutcome[] | undefined>;

  findPreviousRevision(
    companyId: string,
    anchorInspectionId: string,
  ):
    | AnchorRecordedOutcome
    | undefined
    | Promise<AnchorRecordedOutcome | undefined>;
}

export interface CreateReviewIssueInput {
  readonly inspectionId: string;
  readonly anchorInspectionId?: string | null;
  readonly issueType: ReviewIssueType;
  readonly reason: string;
}

export interface ReviewResolutionResult {
  readonly issue: ReviewIssueRecord;
  readonly replayed: boolean;
}

export function canReview(role: ProductRole): boolean {
  return role === 'administrator' || role === 'office_reviewer';
}

export function assertCanReview(principal: AuthPrincipal): void {
  if (!canReview(principal.role)) {
    throw new ReviewFailure(
      'ROLE_FORBIDDEN',
      'Administrator or Office reviewer role is required',
    );
  }
}

export const secureReviewIdGenerator: ReviewIdGenerator = {
  createId: () => randomBytes(16).toString('hex'),
};

export const systemReviewClock: ReviewClock = {
  now: () => new Date(),
};

export class UnconfiguredReviewStore implements ReviewStore {
  private unavailable(): never {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      'review persistence adapter is not configured',
    );
  }

  createIssue(
    _issue: ReviewIssueRecord,
    _action: ReviewActionRecord,
    _auditEvent: ReviewAuditEvent,
  ): void {
    this.unavailable();
  }

  getIssue(
    _companyId: string,
    _reviewIssueId: string,
  ): ReviewIssueRecord | undefined {
    return this.unavailable();
  }

  listIssues(
    _companyId: string,
    _inspectionId: string,
  ): readonly ReviewIssueRecord[] {
    return this.unavailable();
  }

  listActions(
    _companyId: string,
    _reviewIssueId: string,
  ): readonly ReviewActionRecord[] {
    return this.unavailable();
  }

  resolveIssue(
    _issue: ReviewIssueRecord,
    _action: ReviewActionRecord,
    _auditEvent: ReviewAuditEvent,
  ): boolean {
    return this.unavailable();
  }
}

export class UnconfiguredSubmittedEvidenceReader
  implements SubmittedEvidenceReader
{
  find(
    _companyId: string,
    _inspectionId: string,
  ): Promise<SubmittedInspectionEvidence | undefined> {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      'submitted-inspection evidence reader adapter is not configured',
    );
  }
}

export class UnconfiguredAnchorHistoryReader implements AnchorHistoryReader {
  listRecordedOutcomes(
    _companyId: string,
    _anchorId: string,
  ): Promise<readonly AnchorRecordedOutcome[] | undefined> {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      'anchor history reader adapter is not configured',
    );
  }

  findPreviousRevision(
    _companyId: string,
    _anchorInspectionId: string,
  ): Promise<AnchorRecordedOutcome | undefined> {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      'anchor history reader adapter is not configured',
    );
  }
}
