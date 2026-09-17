import { Module } from '@nestjs/common';

import {
  NoopApprovedSnapshotAuditSink,
  systemApprovedSnapshotClock,
  UnconfiguredApprovedSnapshotStateReader,
  UnconfiguredApprovedSnapshotStore,
  type ApprovedSnapshotAuditSink,
  type ApprovedSnapshotClock,
  type ApprovedSnapshotIdGenerator,
  type ApprovedSnapshotStateReader,
  type ApprovedSnapshotStore,
} from './approved-snapshot.types';
import {
  ApprovedSnapshotService,
  secureApprovedSnapshotIdGenerator,
} from './approved-snapshot-service';
import { DatabaseModule, POSTGRES_DATABASE } from '../database/database.module';
import { AuthModule } from '../identity/auth.module';
import { PostgresAuditSink } from '../database/postgres-audit-sink';
import { ApprovedSnapshotController } from './approved-snapshot.controller';
import { PostgresApprovedSnapshotStore } from './approved-snapshot-postgres-store';
import { PostgresApprovedSnapshotStateReader } from './approved-snapshot-postgres-state-reader';
import type { SqlDatabase } from '../database/postgres-database';

export const APPROVED_SNAPSHOT_STORE = Symbol('APPROVED_SNAPSHOT_STORE');
export const APPROVED_SNAPSHOT_STATE_READER = Symbol(
  'APPROVED_SNAPSHOT_STATE_READER',
);
export const APPROVED_SNAPSHOT_AUDIT_SINK = Symbol(
  'APPROVED_SNAPSHOT_AUDIT_SINK',
);
export const APPROVED_SNAPSHOT_CLOCK = Symbol('APPROVED_SNAPSHOT_CLOCK');
export const APPROVED_SNAPSHOT_ID_GENERATOR = Symbol(
  'APPROVED_SNAPSHOT_ID_GENERATOR',
);

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [ApprovedSnapshotController],
  providers: [
    {
      provide: APPROVED_SNAPSHOT_STORE,
      useFactory: (database: SqlDatabase | undefined): ApprovedSnapshotStore =>
        database
          ? new PostgresApprovedSnapshotStore(database)
          : new UnconfiguredApprovedSnapshotStore(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: APPROVED_SNAPSHOT_AUDIT_SINK,
      useFactory: (
        database: SqlDatabase | undefined,
      ): ApprovedSnapshotAuditSink =>
        database
          ? new PostgresAuditSink(database)
          : new NoopApprovedSnapshotAuditSink(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: APPROVED_SNAPSHOT_STATE_READER,
      useFactory: (
        database: SqlDatabase | undefined,
      ): ApprovedSnapshotStateReader =>
        database
          ? new PostgresApprovedSnapshotStateReader(database)
          : new UnconfiguredApprovedSnapshotStateReader(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: APPROVED_SNAPSHOT_CLOCK,
      useValue: systemApprovedSnapshotClock,
    },
    {
      provide: APPROVED_SNAPSHOT_ID_GENERATOR,
      useValue: secureApprovedSnapshotIdGenerator,
    },
    {
      provide: ApprovedSnapshotService,
      useFactory: (
        store: ApprovedSnapshotStore,
        auditSink: ApprovedSnapshotAuditSink,
        clock: ApprovedSnapshotClock,
        idGenerator: ApprovedSnapshotIdGenerator,
        stateReader: ApprovedSnapshotStateReader,
      ) =>
        new ApprovedSnapshotService({
          store,
          auditSink,
          clock,
          idGenerator,
          stateReader,
        }),
      inject: [
        APPROVED_SNAPSHOT_STORE,
        APPROVED_SNAPSHOT_AUDIT_SINK,
        APPROVED_SNAPSHOT_CLOCK,
        APPROVED_SNAPSHOT_ID_GENERATOR,
        APPROVED_SNAPSHOT_STATE_READER,
      ],
    },
  ],
  exports: [ApprovedSnapshotService],
})
export class ApprovedSnapshotModule {}
