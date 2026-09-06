import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { SyncController } from './sync.controller';
import {
  NoopSyncMutationPayloadApplier,
  type SyncClock,
  type SyncIdGenerator,
  type SyncMutationPayloadApplier,
  type SyncMutationStore,
} from './sync.types';
import { UnconfiguredSyncMutationStore } from './sync-store';
import {
  secureSyncIdGenerator,
  SyncService,
  systemSyncClock,
} from './sync-service';

export const SYNC_MUTATION_STORE = Symbol('SYNC_MUTATION_STORE');
export const SYNC_CLOCK = Symbol('SYNC_CLOCK');
export const SYNC_ID_GENERATOR = Symbol('SYNC_ID_GENERATOR');
export const SYNC_MUTATION_PAYLOAD_APPLIER = Symbol(
  'SYNC_MUTATION_PAYLOAD_APPLIER',
);

@Module({
  imports: [AuthModule],
  controllers: [SyncController],
  providers: [
    { provide: SYNC_MUTATION_STORE, useClass: UnconfiguredSyncMutationStore },
    { provide: SYNC_CLOCK, useValue: systemSyncClock },
    { provide: SYNC_ID_GENERATOR, useValue: secureSyncIdGenerator },
    {
      provide: SYNC_MUTATION_PAYLOAD_APPLIER,
      useClass: NoopSyncMutationPayloadApplier,
    },
    {
      provide: SyncService,
      useFactory: (
        store: SyncMutationStore,
        clock: SyncClock,
        idGenerator: SyncIdGenerator,
        payloadApplier: SyncMutationPayloadApplier,
      ) => new SyncService({ store, clock, idGenerator, payloadApplier }),
      inject: [
        SYNC_MUTATION_STORE,
        SYNC_CLOCK,
        SYNC_ID_GENERATOR,
        SYNC_MUTATION_PAYLOAD_APPLIER,
      ],
    },
  ],
  exports: [SyncService],
})
export class SyncModule {}
