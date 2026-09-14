import { randomBytes } from 'node:crypto';

import type { AuthPrincipal, ProductRole } from '../identity/auth.types';

export const REVIEW_ISSUE_TYPES = [
  'blocker',
  'warning',
  'conflict',
  'change',
] as const;
export type ReviewIssueType = (typeof REVIEW_ISSUE_TYPES)[number];

export const REVIEW_ISSUE_STATUSES = ['open', 'resolved'] as const;
export type ReviewIssueStatus = (typeof REVIEW_ISSUE_STATUSES)[number];

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
