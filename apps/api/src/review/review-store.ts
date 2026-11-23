import type {
  ReviewActionRecord,
  ReviewAuditEvent,
  ReviewIssueRecord,
  ReviewStore,
} from './review.types';
import { ReviewFailure } from './review.types';

function key(companyId: string, value: string): string {
  return `${companyId}\u0000${value}`;
}

function copyIssue(issue: ReviewIssueRecord): ReviewIssueRecord {
  return {
    ...issue,
    createdAt: new Date(issue.createdAt.getTime()),
    resolvedAt: issue.resolvedAt ? new Date(issue.resolvedAt.getTime()) : null,
  };
}

function copyAction(action: ReviewActionRecord): ReviewActionRecord {
  return {
    ...action,
    createdAt: new Date(action.createdAt.getTime()),
  };
}

function copyAuditEvent(event: ReviewAuditEvent): ReviewAuditEvent {
  return {
    ...event,
    occurredAt: new Date(event.occurredAt.getTime()),
    metadata: event.metadata ? { ...event.metadata } : undefined,
  };
}

/**
 * Small provider-neutral store used by API tests and local contract proofs.
 * The PostgreSQL adapter provides the production transaction and RLS boundary;
 * this store still preserves immutable action history and defensive copies.
 */
export class InMemoryReviewStore implements ReviewStore {
  private readonly issues = new Map<string, ReviewIssueRecord>();
  private readonly actions = new Map<string, ReviewActionRecord[]>();
  readonly auditEvents: ReviewAuditEvent[] = [];

  createIssue(
    issue: ReviewIssueRecord,
    action: ReviewActionRecord,
    auditEvent: ReviewAuditEvent,
  ): void {
    const issueKey = key(issue.companyId, issue.reviewIssueId);
    if (this.issues.has(issueKey)) {
      throw new ReviewFailure(
        'CONFLICT',
        'review issue identity has already been recorded',
      );
    }
    this.issues.set(issueKey, copyIssue(issue));
    this.actions.set(issueKey, [copyAction(action)]);
    this.auditEvents.push(copyAuditEvent(auditEvent));
  }

  getIssue(
    companyId: string,
    reviewIssueId: string,
  ): ReviewIssueRecord | undefined {
    const issue = this.issues.get(key(companyId, reviewIssueId));
    return issue ? copyIssue(issue) : undefined;
  }

  listIssues(
    companyId: string,
    inspectionId: string,
  ): readonly ReviewIssueRecord[] {
    return [...this.issues.values()]
      .filter(
        (issue) =>
          issue.companyId === companyId && issue.inspectionId === inspectionId,
      )
      .sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() ||
          left.reviewIssueId.localeCompare(right.reviewIssueId),
      )
      .map(copyIssue);
  }

  listActions(
    companyId: string,
    reviewIssueId: string,
  ): readonly ReviewActionRecord[] {
    return (this.actions.get(key(companyId, reviewIssueId)) ?? [])
      .filter((action) => action.companyId === companyId)
      .sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() ||
          left.reviewActionId.localeCompare(right.reviewActionId),
      )
      .map(copyAction);
  }

  resolveIssue(
    issue: ReviewIssueRecord,
    action: ReviewActionRecord,
    auditEvent: ReviewAuditEvent,
  ): boolean {
    const issueKey = key(issue.companyId, issue.reviewIssueId);
    const current = this.issues.get(issueKey);
    if (!current) {
      throw new ReviewFailure('NOT_FOUND', 'review issue was not found');
    }
    if (current.status !== 'open') return false;

    this.issues.set(issueKey, copyIssue(issue));
    const currentActions = this.actions.get(issueKey) ?? [];
    currentActions.push(copyAction(action));
    this.actions.set(issueKey, currentActions);
    this.auditEvents.push(copyAuditEvent(auditEvent));
    return true;
  }
}
