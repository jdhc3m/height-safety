import { randomBytes } from 'node:crypto';

import {
  createTenantContext,
  setTenantContextStatement,
} from './tenant-context';
import type { SqlDatabase, SqlTransaction } from './postgres-database';

export interface DurableAuditEvent {
  readonly companyId: string;
  readonly actorUserId: string | null;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly occurredAt: Date;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Shared append-only audit adapter.  Each event is written in a tenant-bound
 * transaction; callers await `record` so persistence failures remain visible
 * instead of becoming unhandled background work.
 */
export class PostgresAuditSink {
  constructor(private readonly database: SqlDatabase) {}

  async record(event: DurableAuditEvent): Promise<void> {
    const context = setTenantContextStatement(
      createTenantContext(event.companyId),
    );
    await this.database.transaction(async (transaction) => {
      await transaction.query(context.text, context.values);
      await this.insert(transaction, event);
    });
  }

  private async insert(
    transaction: SqlTransaction,
    event: DurableAuditEvent,
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
}
