import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { SiteRegisterController } from './site-register.controller';
import {
  NoopSiteRegisterAuditSink,
  secureSiteRegisterIdGenerator,
  systemSiteRegisterClock,
  type SiteRegisterAuditSink,
  type SiteRegisterClock,
  type SiteRegisterIdGenerator,
  type SiteRegisterStore,
} from './site-register.types';
import { UnconfiguredSiteRegisterStore } from './site-register-store';
import { PostgresSiteRegisterStore } from './postgres-site-register-store';
import { SiteRegisterService } from './site-register-service';
import { DatabaseModule, POSTGRES_DATABASE } from '../database/database.module';
import { PostgresAuditSink } from '../database/postgres-audit-sink';
import type { SqlDatabase } from '../database/postgres-database';

export const SITE_REGISTER_STORE = Symbol('SITE_REGISTER_STORE');
export const SITE_REGISTER_AUDIT_SINK = Symbol('SITE_REGISTER_AUDIT_SINK');
export const SITE_REGISTER_CLOCK = Symbol('SITE_REGISTER_CLOCK');
export const SITE_REGISTER_ID_GENERATOR = Symbol('SITE_REGISTER_ID_GENERATOR');

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [SiteRegisterController],
  providers: [
    {
      provide: SITE_REGISTER_STORE,
      useFactory: (database: SqlDatabase | undefined): SiteRegisterStore =>
        database
          ? new PostgresSiteRegisterStore(database)
          : new UnconfiguredSiteRegisterStore(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: SITE_REGISTER_AUDIT_SINK,
      useFactory: (database: SqlDatabase | undefined): SiteRegisterAuditSink =>
        database
          ? new PostgresAuditSink(database)
          : new NoopSiteRegisterAuditSink(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: SITE_REGISTER_CLOCK,
      useValue: systemSiteRegisterClock,
    },
    {
      provide: SITE_REGISTER_ID_GENERATOR,
      useValue: secureSiteRegisterIdGenerator,
    },
    {
      provide: SiteRegisterService,
      useFactory: (
        store: SiteRegisterStore,
        auditSink: SiteRegisterAuditSink,
        clock: SiteRegisterClock,
        idGenerator: SiteRegisterIdGenerator,
      ) => new SiteRegisterService({ store, auditSink, clock, idGenerator }),
      inject: [
        SITE_REGISTER_STORE,
        SITE_REGISTER_AUDIT_SINK,
        SITE_REGISTER_CLOCK,
        SITE_REGISTER_ID_GENERATOR,
      ],
    },
  ],
  exports: [SiteRegisterService],
})
export class SiteRegisterModule {}
