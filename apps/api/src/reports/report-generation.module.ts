import { Module } from '@nestjs/common';

import {
  APPROVED_SNAPSHOT_STORE,
  ApprovedSnapshotModule,
} from '../approved-snapshot/approved-snapshot.module';
import { ApprovedSnapshotService } from '../approved-snapshot/approved-snapshot-service';
import type { ApprovedSnapshotStore } from '../approved-snapshot/approved-snapshot.types';
import { DatabaseModule, POSTGRES_DATABASE } from '../database/database.module';
import type { SqlDatabase } from '../database/postgres-database';
import { AuthModule } from '../identity/auth.module';
import {
  secureReportIdGenerator,
  systemReportClock,
  type ReportArtifactObjectStore,
  type ReportClock,
  type ReportGenerationStore,
  type ReportIdGenerator,
} from './report-generation.types';
import { ReportGenerationController } from './report-generation.controller';
import { ReportGenerationService } from './report-generation-service';
import { ReportGenerationWorker } from './report-generation-worker';
import { UnconfiguredReportGenerationStore } from './report-generation-store';
import { PostgresReportGenerationStore } from './postgres-report-generation-store';
import { reportArtifactObjectStoreFromEnvironment } from './local-private-report-object-store';
import { PlaywrightReportRenderer } from './report-renderer';

export const REPORT_GENERATION_STORE = Symbol('REPORT_GENERATION_STORE');
export const REPORT_OBJECT_STORE = Symbol('REPORT_OBJECT_STORE');
export const REPORT_RENDERER = Symbol('REPORT_RENDERER');
export const REPORT_CLOCK = Symbol('REPORT_CLOCK');
export const REPORT_ID_GENERATOR = Symbol('REPORT_ID_GENERATOR');

@Module({
  imports: [DatabaseModule, AuthModule, ApprovedSnapshotModule],
  controllers: [ReportGenerationController],
  providers: [
    {
      provide: REPORT_GENERATION_STORE,
      useFactory: (database: SqlDatabase | undefined): ReportGenerationStore =>
        database
          ? new PostgresReportGenerationStore(database)
          : new UnconfiguredReportGenerationStore(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: REPORT_OBJECT_STORE,
      useFactory: (): ReportArtifactObjectStore =>
        reportArtifactObjectStoreFromEnvironment(),
    },
    { provide: REPORT_RENDERER, useClass: PlaywrightReportRenderer },
    { provide: REPORT_CLOCK, useValue: systemReportClock },
    { provide: REPORT_ID_GENERATOR, useValue: secureReportIdGenerator },
    {
      provide: ReportGenerationService,
      useFactory: (
        snapshots: ApprovedSnapshotService,
        store: ReportGenerationStore,
        objects: ReportArtifactObjectStore,
        clock: ReportClock,
        idGenerator: ReportIdGenerator,
      ) =>
        new ReportGenerationService({
          snapshots,
          store,
          objects,
          clock,
          idGenerator,
        }),
      inject: [
        // The token is exported from the approval module, but report creation
        // uses the service so current membership and tenant checks are retained.
        ApprovedSnapshotService,
        REPORT_GENERATION_STORE,
        REPORT_OBJECT_STORE,
        REPORT_CLOCK,
        REPORT_ID_GENERATOR,
      ],
    },
    {
      provide: ReportGenerationWorker,
      useFactory: (
        store: ReportGenerationStore,
        snapshots: ApprovedSnapshotStore,
        objects: ReportArtifactObjectStore,
        renderer: PlaywrightReportRenderer,
        clock: ReportClock,
        idGenerator: ReportIdGenerator,
      ) =>
        new ReportGenerationWorker({
          store,
          snapshots,
          photoReader: objects,
          objects,
          renderer,
          clock,
          idGenerator,
        }),
      inject: [
        REPORT_GENERATION_STORE,
        APPROVED_SNAPSHOT_STORE,
        REPORT_OBJECT_STORE,
        REPORT_RENDERER,
        REPORT_CLOCK,
        REPORT_ID_GENERATOR,
      ],
    },
  ],
  exports: [ReportGenerationService, ReportGenerationWorker],
})
export class ReportGenerationModule {}
