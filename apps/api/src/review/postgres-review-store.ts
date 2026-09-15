import { randomBytes } from 'node:crypto';

import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type {
  SqlDatabase,
  SqlResult,
  SqlTransaction,
} from '../database/postgres-database';
import { ReviewFailure } from './review.types';
import type {
  ReviewActionRecord,
  ReviewAuditEvent,
  ReviewIssueRecord,
  ReviewStore,
} from './review.types';

interface ReviewIssueRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly review_issue_id: unknown;
  readonly inspection_id: unknown;
  readonly anchor_inspection_id: unknown;
  readonly issue_type: unknown;
  readonly status: unknown;
  readonly reviewer_user_id: unknown;
  readonly reason: unknown;
  readonly created_at: unknown;
  readonly resolved_at: unknown;
}

interface ReviewActionRow extends Record<string, unknown> {
  readonly company_id: unknown;
  readonly review_action_id: unknown;
  readonly review_issue_id: unknown;
  readonly reviewer_user_id: unknown;
  readonly action: unknown;
  readonly reason: unknown;
  readonly created_at: unknown;
}

const REVIEW_ISSUE_COLUMNS = `
  company_id,
  review_issue_id,
  inspection_id,
  anchor_inspection_id,
  issue_type,
  status,
  reviewer_user_id,
  reason,
  created_at,
  resolved_at
`;

const REVIEW_ACTION_COLUMNS = `
  company_id,
  review_action_id,
  review_issue_id,
  reviewer_user_id,
  action,
  reason,
  created_at
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function errorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === 'string'
    ? error.code
    : undefined;
}

function firstRow<Row extends Record<string, unknown>>(
  result: SqlResult<Row>,
): Row | undefined {
  return result.rows[0];
}

function storedString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      `review persistence returned invalid ${field}`,
    );
  }
  return value;
}

function storedDate(value: unknown, field: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      `review persistence returned invalid ${field}`,
    );
  }
  return date;
}

function storedNullableDate(value: unknown, field: string): Date | null {
  return value === null || value === undefined
    ? null
    : storedDate(value, field);
}

function storedIssueType(value: unknown): ReviewIssueRecord['issueType'] {
  if (
    value !== 'blocker' &&
    value !== 'warning' &&
    value !== 'conflict' &&
    value !== 'change'
  ) {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      'review persistence returned invalid issue_type',
    );
  }
  return value;
}

function storedStatus(value: unknown): ReviewIssueRecord['status'] {
  if (value !== 'open' && value !== 'resolved') {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      'review persistence returned invalid status',
    );
  }
  return value;
}

function storedAction(value: unknown): ReviewActionRecord['action'] {
  if (
    value !== 'issue_created' &&
    value !== 'changes_requested' &&
    value !== 'resolved'
  ) {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      'review persistence returned invalid action',
    );
  }
  return value;
}

function parseIssue(row: ReviewIssueRow, companyId: string): ReviewIssueRecord {
  const rowCompanyId = storedString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      'review persistence crossed company scope',
    );
  }
  const anchorInspectionId =
    row.anchor_inspection_id === null || row.anchor_inspection_id === undefined
      ? null
      : storedString(row.anchor_inspection_id, 'anchor_inspection_id');
  return {
    companyId: rowCompanyId,
    reviewIssueId: storedString(row.review_issue_id, 'review_issue_id'),
    inspectionId: storedString(row.inspection_id, 'inspection_id'),
    anchorInspectionId,
    issueType: storedIssueType(row.issue_type),
    status: storedStatus(row.status),
    reviewerUserId: storedString(row.reviewer_user_id, 'reviewer_user_id'),
    reason: storedString(row.reason, 'reason'),
    createdAt: storedDate(row.created_at, 'created_at'),
    resolvedAt: storedNullableDate(row.resolved_at, 'resolved_at'),
  };
}

function parseAction(
  row: ReviewActionRow,
  companyId: string,
): ReviewActionRecord {
  const rowCompanyId = storedString(row.company_id, 'company_id');
  if (rowCompanyId !== companyId) {
    throw new ReviewFailure(
      'PERSISTENCE_UNAVAILABLE',
      'review persistence crossed company scope',
    );
  }
  return {
    companyId: rowCompanyId,
    reviewActionId: storedString(row.review_action_id, 'review_action_id'),
    reviewIssueId: storedString(row.review_issue_id, 'review_issue_id'),
    reviewerUserId: storedString(row.reviewer_user_id, 'reviewer_user_id'),
    action: storedAction(row.action),
    reason: storedString(row.reason, 'reason'),
    createdAt: storedDate(row.created_at, 'created_at'),
  };
}

function rowsAffected(result: SqlResult<Record<string, unknown>>): number {
  return result.rowCount ?? result.rows.length;
}

/**
 * Tenant-bound review persistence. Issue creation and resolution write the
 * review row, append-only action row and generic audit event in the same
 * transaction so a visible review decision cannot exist without its history.
 */
export class PostgresReviewStore implements ReviewStore {
  constructor(private readonly database: SqlDatabase) {}

  async createIssue(
    issue: ReviewIssueRecord,
    action: ReviewActionRecord,
    auditEvent: ReviewAuditEvent,
  ): Promise<void> {
    await this.withTenant(issue.companyId, async (transaction) => {
      await transaction.query(
        `
          INSERT INTO review_issues (
            company_id, review_issue_id, inspection_id,
            anchor_inspection_id, issue_type, status, reviewer_user_id,
            reason, created_at, resolved_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          issue.companyId,
          issue.reviewIssueId,
          issue.inspectionId,
          issue.anchorInspectionId,
          issue.issueType,
          issue.status,
          issue.reviewerUserId,
          issue.reason,
          issue.createdAt,
          issue.resolvedAt,
        ],
      );
      await this.insertAction(transaction, action);
      await this.insertAuditEvent(transaction, auditEvent);
      if (issue.issueType === 'change') {
        // Keep the submitted inspection immutable. The job is the mutable
        // workflow pointer; the next inspector submission becomes a new
        // server-assigned inspection revision for the same released pack.
        await transaction.query(
          `
            UPDATE jobs
            SET workflow_status = 'changes_requested', updated_at = $3
            WHERE company_id = $1
              AND job_id = (
                SELECT job_id
                FROM inspections
                WHERE company_id = $1 AND inspection_id = $2
              )
              AND workflow_status IN ('submitted', 'under_review')
          `,
          [issue.companyId, issue.inspectionId, issue.createdAt],
        );
      }
    });
  }

  async getIssue(
    companyId: string,
    reviewIssueId: string,
  ): Promise<ReviewIssueRecord | undefined> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<ReviewIssueRow>(
        `
          SELECT ${REVIEW_ISSUE_COLUMNS}
          FROM review_issues
          WHERE company_id = $1 AND review_issue_id = $2
        `,
        [companyId, reviewIssueId],
      );
      const row = firstRow(result);
      return row ? parseIssue(row, companyId) : undefined;
    });
  }

  async listIssues(
    companyId: string,
    inspectionId: string,
  ): Promise<readonly ReviewIssueRecord[]> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<ReviewIssueRow>(
        `
          SELECT ${REVIEW_ISSUE_COLUMNS}
          FROM review_issues
          WHERE company_id = $1 AND inspection_id = $2
          ORDER BY created_at ASC, review_issue_id ASC
        `,
        [companyId, inspectionId],
      );
      return result.rows.map((row) => parseIssue(row, companyId));
    });
  }

  async listActions(
    companyId: string,
    reviewIssueId: string,
  ): Promise<readonly ReviewActionRecord[]> {
    return this.withTenant(companyId, async (transaction) => {
      const result = await transaction.query<ReviewActionRow>(
        `
          SELECT ${REVIEW_ACTION_COLUMNS}
          FROM review_actions
          WHERE company_id = $1 AND review_issue_id = $2
          ORDER BY created_at ASC, review_action_id ASC
        `,
        [companyId, reviewIssueId],
      );
      return result.rows.map((row) => parseAction(row, companyId));
    });
  }

  async resolveIssue(
    issue: ReviewIssueRecord,
    action: ReviewActionRecord,
    auditEvent: ReviewAuditEvent,
  ): Promise<boolean> {
    return this.withTenant(issue.companyId, async (transaction) => {
      const result = await transaction.query<Record<string, unknown>>(
        `
          UPDATE review_issues
          SET status = 'resolved', resolved_at = $3
          WHERE company_id = $1
            AND review_issue_id = $2
            AND status = 'open'
        `,
        [issue.companyId, issue.reviewIssueId, issue.resolvedAt],
      );
      if (rowsAffected(result) === 0) return false;
      await this.insertAction(transaction, action);
      await this.insertAuditEvent(transaction, auditEvent);
      return true;
    });
  }

  private async insertAction(
    transaction: SqlTransaction,
    action: ReviewActionRecord,
  ): Promise<void> {
    await transaction.query(
      `
        INSERT INTO review_actions (
          company_id, review_action_id, review_issue_id, reviewer_user_id,
          action, reason, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        action.companyId,
        action.reviewActionId,
        action.reviewIssueId,
        action.reviewerUserId,
        action.action,
        action.reason,
        action.createdAt,
      ],
    );
  }

  private async insertAuditEvent(
    transaction: SqlTransaction,
    event: ReviewAuditEvent,
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

  private async withTenant<T>(
    companyId: string,
    work: (transaction: SqlTransaction) => Promise<T>,
  ): Promise<T> {
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
        return work(transaction);
      });
    } catch (error) {
      if (error instanceof ReviewFailure) throw error;
      switch (errorCode(error)) {
        case '23503':
          throw new ReviewFailure(
            'NOT_FOUND',
            'review target or reviewer membership was not found',
          );
        case '23505':
          throw new ReviewFailure(
            'CONFLICT',
            'review issue or action identity already exists',
          );
        case '23514':
          throw new ReviewFailure(
            'INVALID_INPUT',
            'review record violates a supported workflow constraint',
          );
        default:
          throw new ReviewFailure(
            'PERSISTENCE_UNAVAILABLE',
            'review persistence is unavailable',
          );
      }
    }
  }
}
