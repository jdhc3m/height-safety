import { Module } from '@nestjs/common';

import {
  NoopApprovedSnapshotAuditSink,
  systemApprovedSnapshotClock,
  UnconfiguredApprovedSnapshotStore,
  type ApprovedSnapshotAuditSink,
  type ApprovedSnapshotClock,
  type ApprovedSnapshotIdGenerator,
  type ApprovedSnapshotStore,
} from './approved-snapshot.types';
import {
  ApprovedSnapshotService,
  secureApprovedSnapshotIdGenerator,
} from './approved-snapshot-service';

export const APPROVED_SNAPSHOT_STORE = Symbol('APPROVED_SNAPSHOT_STORE');
export const APPROVED_SNAPSHOT_AUDIT_SINK = Symbol(
  'APPROVED_SNAPSHOT_AUDIT_SINK',
);
export const APPROVED_SNAPSHOT_CLOCK = Symbol('APPROVED_SNAPSHOT_CLOCK');
export const APPROVED_SNAPSHOT_ID_GENERATOR = Symbol(
  'APPROVED_SNAPSHOT_ID_GENERATOR',
);

@Module({
  providers: [
    {
      provide: APPROVED_SNAPSHOT_STORE,
      useClass: UnconfiguredApprovedSnapshotStore,
    },
    {
      provide: APPROVED_SNAPSHOT_AUDIT_SINK,
      useClass: NoopApprovedSnapshotAuditSink,
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
      ) =>
        new ApprovedSnapshotService({ store, auditSink, clock, idGenerator }),
      inject: [
        APPROVED_SNAPSHOT_STORE,
        APPROVED_SNAPSHOT_AUDIT_SINK,
        APPROVED_SNAPSHOT_CLOCK,
        APPROVED_SNAPSHOT_ID_GENERATOR,
      ],
    },
  ],
  exports: [ApprovedSnapshotService],
})
export class ApprovedSnapshotModule {}
