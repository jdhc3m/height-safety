import type { AuthPrincipal } from '../identity/auth.types';
import {
  assertCanReview,
  REVIEW_ISSUE_TYPES,
  ReviewFailure,
  type CreateReviewIssueInput,
  type ReviewActionRecord,
  type ReviewClock,
  type ReviewIdGenerator,
  type ReviewIssueRecord,
  type ReviewIssueType,
  type ReviewResolutionResult,
  type ReviewStore,
} from './review.types';

const ID_MAX_LENGTH = 128;
const REASON_MAX_LENGTH = 10_000;

export interface ReviewServiceOptions {
  readonly store: ReviewStore;
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
