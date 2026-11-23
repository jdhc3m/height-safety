import { createHash } from 'node:crypto';

import type { AuthPrincipal } from '../identity/auth.types';
import {
  assertCanReview,
  REVIEW_ISSUE_TYPES,
  ReviewFailure,
  type AnchorHistoryReader,
  type AnchorRecordedOutcome,
  type CreateReviewIssueInput,
  type PrivatePhotoObjectReader,
  type ReviewActionRecord,
  type ReviewClock,
  type ReviewIdGenerator,
  type ReviewIssueRecord,
  type ReviewIssueType,
  type ReviewPhotoMedia,
  type ReviewResolutionResult,
  type ReviewStore,
  type SubmittedEvidenceAnchor,
  type SubmittedEvidencePhotoMetadata,
  type SubmittedEvidenceReader,
  type SubmittedInspectionEvidence,
  type SubmittedPhotoMediaReader,
} from './review.types';

const ID_MAX_LENGTH = 128;
const REASON_MAX_LENGTH = 10_000;

export interface ReviewServiceOptions {
  readonly store: ReviewStore;
  readonly evidenceReader: SubmittedEvidenceReader;
  readonly anchorHistoryReader: AnchorHistoryReader;
  readonly photoMediaReader: SubmittedPhotoMediaReader;
  readonly photoObjects: PrivatePhotoObjectReader;
  readonly clock: ReviewClock;
  readonly idGenerator: ReviewIdGenerator;
}

function copyDate(value: Date): Date {
  return new Date(value.getTime());
}

function requiredId(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ReviewFailure('INVALID_INPUT', `${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > ID_MAX_LENGTH) {
    throw new ReviewFailure(
      'INVALID_INPUT',
      `${field} must be between 1 and ${ID_MAX_LENGTH} characters`,
    );
  }
  return normalized;
}

function optionalId(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  return requiredId(value, field);
}

function requiredReason(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ReviewFailure('INVALID_INPUT', 'reason is required');
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > REASON_MAX_LENGTH) {
    throw new ReviewFailure(
      'INVALID_INPUT',
      `reason must be between 1 and ${REASON_MAX_LENGTH} characters`,
    );
  }
  return normalized;
}

function requiredIssueType(value: unknown): ReviewIssueType {
  if (
    typeof value !== 'string' ||
    !REVIEW_ISSUE_TYPES.includes(value as ReviewIssueType)
  ) {
    throw new ReviewFailure('INVALID_INPUT', 'issueType is not supported');
  }
  return value as ReviewIssueType;
}

function copyIssue(issue: ReviewIssueRecord): ReviewIssueRecord {
  return {
    ...issue,
    createdAt: copyDate(issue.createdAt),
    resolvedAt: issue.resolvedAt ? copyDate(issue.resolvedAt) : null,
  };
}

function copyAction(action: ReviewActionRecord): ReviewActionRecord {
  return { ...action, createdAt: copyDate(action.createdAt) };
}

function copyPhoto(
  photo: SubmittedEvidencePhotoMetadata,
): SubmittedEvidencePhotoMetadata {
  return { ...photo };
}

function copyAnchor(anchor: SubmittedEvidenceAnchor): SubmittedEvidenceAnchor {
  return { ...anchor, photos: anchor.photos.map(copyPhoto) };
}

function copyEvidence(
  evidence: SubmittedInspectionEvidence,
): SubmittedInspectionEvidence {
  return {
    ...evidence,
    submittedAt: copyDate(evidence.submittedAt),
    anchors: evidence.anchors.map(copyAnchor),
  };
}

function copyRecordedOutcome(
  outcome: AnchorRecordedOutcome,
): AnchorRecordedOutcome {
  return {
    ...outcome,
    submittedAt: copyDate(outcome.submittedAt),
    photos: outcome.photos.map(copyPhoto),
  };
}

export class ReviewService {
  constructor(private readonly options: ReviewServiceOptions) {}

  async createIssue(
    principal: AuthPrincipal,
    input: CreateReviewIssueInput,
  ): Promise<ReviewIssueRecord> {
    assertCanReview(principal);
    const issueType = requiredIssueType(input.issueType);
    const inspectionId = requiredId(input.inspectionId, 'inspectionId');
    const anchorInspectionId = optionalId(
      input.anchorInspectionId,
      'anchorInspectionId',
    );
    const reason = requiredReason(input.reason);
    const createdAt = copyDate(this.options.clock.now());
    const reviewIssueId = requiredId(
      this.options.idGenerator.createId(),
      'reviewIssueId',
    );
    const issue: ReviewIssueRecord = {
      companyId: principal.companyId,
      reviewIssueId,
      inspectionId,
      anchorInspectionId,
      issueType,
      status: 'open',
      reviewerUserId: principal.userId,
      reason,
      createdAt,
      resolvedAt: null,
    };
    const action: ReviewActionRecord = {
      companyId: principal.companyId,
      reviewActionId: requiredId(
        this.options.idGenerator.createId(),
        'reviewActionId',
      ),
      reviewIssueId,
      reviewerUserId: principal.userId,
      action: issueType === 'change' ? 'changes_requested' : 'issue_created',
      reason,
      createdAt,
    };

    await this.options.store.createIssue(issue, action, {
      companyId: principal.companyId,
      actorUserId: principal.userId,
      action:
        issueType === 'change'
          ? 'review.changes_requested'
          : 'review.issue_created',
      targetType: 'review_issue',
      targetId: reviewIssueId,
      occurredAt: createdAt,
      metadata: {
        issueType,
        inspectionId,
        ...(anchorInspectionId ? { anchorInspectionId } : {}),
      },
    });

    return copyIssue(issue);
  }

  async listIssues(
    principal: AuthPrincipal,
    inspectionId: string,
  ): Promise<readonly ReviewIssueRecord[]> {
    assertCanReview(principal);
    const normalizedInspectionId = requiredId(inspectionId, 'inspectionId');
    const issues = await this.options.store.listIssues(
      principal.companyId,
      normalizedInspectionId,
    );
    return issues.map(copyIssue);
  }

  /**
   * Read-only office view of one submitted inspection revision and its
   * anchor evidence. The reader never rewrites submitted data and this
   * method exposes no mutation path.
   */
  async getSubmittedEvidence(
    principal: AuthPrincipal,
    inspectionId: string,
  ): Promise<SubmittedInspectionEvidence> {
    assertCanReview(principal);
    const normalizedInspectionId = requiredId(inspectionId, 'inspectionId');
    const evidence = await this.options.evidenceReader.find(
      principal.companyId,
      normalizedInspectionId,
    );
    if (!evidence) {
      throw new ReviewFailure(
        'NOT_FOUND',
        'submitted inspection revision was not found',
      );
    }
    if (evidence.companyId !== principal.companyId) {
      throw new ReviewFailure(
        'NOT_FOUND',
        'submitted inspection revision was not found',
      );
    }
    return copyEvidence(evidence);
  }

  /**
   * Read-only office view of one register anchor's recorded outcomes across
   * its submitted inspection revisions, newest first. The reader never
   * rewrites submitted data and this method exposes no mutation path.
   */
  async listAnchorRecordedOutcomes(
    principal: AuthPrincipal,
    anchorId: string,
  ): Promise<readonly AnchorRecordedOutcome[]> {
    assertCanReview(principal);
    const normalizedAnchorId = requiredId(anchorId, 'anchorId');
    const outcomes =
      await this.options.anchorHistoryReader.listRecordedOutcomes(
        principal.companyId,
        normalizedAnchorId,
      );
    if (!outcomes) {
      throw new ReviewFailure('NOT_FOUND', 'register anchor was not found');
    }
    for (const outcome of outcomes) {
      if (outcome.companyId !== principal.companyId) {
        throw new ReviewFailure('NOT_FOUND', 'register anchor was not found');
      }
    }
    return outcomes.map(copyRecordedOutcome);
  }

  /**
   * Read-only office view of the submitted inspection revision recorded
   * immediately before the referenced anchor inspection, for the same
   * register anchor. The reader never rewrites submitted data and this
   * method exposes no mutation path.
   */
  async getPreviousAnchorRevision(
    principal: AuthPrincipal,
    anchorInspectionId: string,
  ): Promise<AnchorRecordedOutcome> {
    assertCanReview(principal);
    const normalizedAnchorInspectionId = requiredId(
      anchorInspectionId,
      'anchorInspectionId',
    );
    const previous =
      await this.options.anchorHistoryReader.findPreviousRevision(
        principal.companyId,
        normalizedAnchorInspectionId,
      );
    if (!previous) {
      throw new ReviewFailure(
        'NOT_FOUND',
        'previous inspection revision was not found',
      );
    }
    if (previous.companyId !== principal.companyId) {
      throw new ReviewFailure(
        'NOT_FOUND',
        'previous inspection revision was not found',
      );
    }
    return copyRecordedOutcome(previous);
  }

  /**
   * Read-only office read of one evidence photo's private bytes for a photo
   * attached to a submitted inspection revision. Bytes come straight from the
   * private object store through the authenticated session boundary; the
   * stored checksum, byte size and recorded content type are verified before
   * anything is served and no public or pre-signed URL is involved.
   */
  async getInspectionPhotoMedia(
    principal: AuthPrincipal,
    inspectionId: string,
    photoId: string,
  ): Promise<ReviewPhotoMedia> {
    assertCanReview(principal);
    const normalizedInspectionId = requiredId(inspectionId, 'inspectionId');
    const normalizedPhotoId = requiredId(photoId, 'photoId');
    const record = await this.options.photoMediaReader.find(
      principal.companyId,
      normalizedInspectionId,
      normalizedPhotoId,
    );
    if (!record || record.companyId !== principal.companyId) {
      throw new ReviewFailure('NOT_FOUND', 'photo media was not found');
    }
    if (record.uploadState !== 'uploaded') {
      throw new ReviewFailure(
        'NOT_FOUND',
        'photo media has not been uploaded yet',
      );
    }
    const bytes = await this.options.photoObjects.read(record.objectKey);
    if (
      !bytes ||
      bytes.byteLength !== record.byteSize ||
      createHash('sha256').update(bytes).digest('hex') !== record.sha256
    ) {
      throw new ReviewFailure(
        'PERSISTENCE_UNAVAILABLE',
        'private photo bytes failed their stored integrity check',
      );
    }
    return {
      photoId: record.photoId,
      bytes,
      contentType: record.contentType,
    };
  }

  async listActions(
    principal: AuthPrincipal,
    reviewIssueId: string,
  ): Promise<readonly ReviewActionRecord[]> {
    assertCanReview(principal);
    const normalizedIssueId = requiredId(reviewIssueId, 'reviewIssueId');
    const issue = await this.options.store.getIssue(
      principal.companyId,
      normalizedIssueId,
    );
    if (!issue) {
      throw new ReviewFailure('NOT_FOUND', 'review issue was not found');
    }
    const actions = await this.options.store.listActions(
      principal.companyId,
      normalizedIssueId,
    );
    return actions.map(copyAction);
  }

  async resolveIssue(
    principal: AuthPrincipal,
    reviewIssueId: string,
    resolutionReason: string,
  ): Promise<ReviewResolutionResult> {
    assertCanReview(principal);
    const normalizedIssueId = requiredId(reviewIssueId, 'reviewIssueId');
    const reason = requiredReason(resolutionReason);
    const current = await this.options.store.getIssue(
      principal.companyId,
      normalizedIssueId,
    );
    if (!current) {
      throw new ReviewFailure('NOT_FOUND', 'review issue was not found');
    }
    if (current.status === 'resolved') {
      return { issue: copyIssue(current), replayed: true };
    }

    const resolvedAt = copyDate(this.options.clock.now());
    const resolved: ReviewIssueRecord = {
      ...current,
      status: 'resolved',
      resolvedAt,
    };
    const action: ReviewActionRecord = {
      companyId: principal.companyId,
      reviewActionId: requiredId(
        this.options.idGenerator.createId(),
        'reviewActionId',
      ),
      reviewIssueId: normalizedIssueId,
      reviewerUserId: principal.userId,
      action: 'resolved',
      reason,
      createdAt: resolvedAt,
    };
    const applied = await this.options.store.resolveIssue(resolved, action, {
      companyId: principal.companyId,
      actorUserId: principal.userId,
      action: 'review.issue_resolved',
      targetType: 'review_issue',
      targetId: normalizedIssueId,
      occurredAt: resolvedAt,
      metadata: {
        issueType: current.issueType,
        inspectionId: current.inspectionId,
      },
    });
    if (applied) {
      return { issue: copyIssue(resolved), replayed: false };
    }

    const replay = await this.options.store.getIssue(
      principal.companyId,
      normalizedIssueId,
    );
    if (!replay) {
      throw new ReviewFailure('NOT_FOUND', 'review issue was not found');
    }
    return { issue: copyIssue(replay), replayed: true };
  }
}
