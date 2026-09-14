import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { DatabaseModule, POSTGRES_DATABASE } from '../database/database.module';
import type { SqlDatabase } from '../database/postgres-database';
import { SyncController } from './sync.controller';
import {
  NoopSyncMutationPayloadApplier,
  type SyncClock,
  type SyncIdGenerator,
  type SyncMutationPayloadApplier,
  type SyncMutationStore,
} from './sync.types';
import { UnconfiguredSyncMutationStore } from './sync-store';
import { PostgresSyncMutationStore } from './postgres-sync-store';
import {
  LocalPrivatePhotoObjectStore,
  privatePhotoObjectRootFromEnvironment,
} from './private-photo-object-store';
import {
  PHOTO_UPLOAD_SERVICE,
  PhotoUploadService,
  UnconfiguredPhotoUploadService,
  type PhotoUploadServiceLike,
} from './photo-upload-service';
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
  imports: [AuthModule, DatabaseModule],
  controllers: [SyncController],
  providers: [
    {
      provide: SYNC_MUTATION_STORE,
      useFactory: (database: SqlDatabase | undefined): SyncMutationStore =>
        database
          ? new PostgresSyncMutationStore(database)
          : new UnconfiguredSyncMutationStore(),
      inject: [POSTGRES_DATABASE],
    },
    { provide: SYNC_CLOCK, useValue: systemSyncClock },
    { provide: SYNC_ID_GENERATOR, useValue: secureSyncIdGenerator },
    {
      provide: SYNC_MUTATION_PAYLOAD_APPLIER,
      useClass: NoopSyncMutationPayloadApplier,
    },
    {
      provide: PHOTO_UPLOAD_SERVICE,
      useFactory: (
        database: SqlDatabase | undefined,
      ): PhotoUploadServiceLike =>
        database
          ? new PhotoUploadService(
              database,
              new LocalPrivatePhotoObjectStore(
                privatePhotoObjectRootFromEnvironment(),
              ),
            )
          : new UnconfiguredPhotoUploadService(),
      inject: [POSTGRES_DATABASE],
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
