import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { SiteRegisterModule } from '../site-register/site-register.module';
import { SiteRegisterService } from '../site-register/site-register-service';
import { JobWorkflowController } from './job-workflow.controller';
import {
  NoopJobWorkflowAuditSink,
  secureJobWorkflowIdGenerator,
  systemJobWorkflowClock,
  type JobWorkflowAuditSink,
  type JobWorkflowClock,
  type JobWorkflowIdGenerator,
  type JobWorkflowMemberDirectory,
  type JobWorkflowSiteDirectory,
  type JobWorkflowStore,
  UnconfiguredJobWorkflowMemberDirectory,
} from './job-workflow.types';
import { UnconfiguredJobWorkflowStore } from './job-workflow-store';
import {
  PostgresJobWorkflowMemberDirectory,
  PostgresJobWorkflowStore,
} from './postgres-job-workflow-store';
import { JobWorkflowService } from './job-workflow-service';
import { DatabaseModule, POSTGRES_DATABASE } from '../database/database.module';
import { PostgresAuditSink } from '../database/postgres-audit-sink';
import type { SqlDatabase } from '../database/postgres-database';

export const JOB_WORKFLOW_STORE = Symbol('JOB_WORKFLOW_STORE');
export const JOB_WORKFLOW_MEMBER_DIRECTORY = Symbol(
  'JOB_WORKFLOW_MEMBER_DIRECTORY',
);
export const JOB_WORKFLOW_AUDIT_SINK = Symbol('JOB_WORKFLOW_AUDIT_SINK');
export const JOB_WORKFLOW_CLOCK = Symbol('JOB_WORKFLOW_CLOCK');
export const JOB_WORKFLOW_ID_GENERATOR = Symbol('JOB_WORKFLOW_ID_GENERATOR');

@Module({
  imports: [AuthModule, SiteRegisterModule, DatabaseModule],
  controllers: [JobWorkflowController],
  providers: [
    {
      provide: JOB_WORKFLOW_STORE,
      useFactory: (database: SqlDatabase | undefined): JobWorkflowStore =>
        database
          ? new PostgresJobWorkflowStore(database)
          : new UnconfiguredJobWorkflowStore(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: JOB_WORKFLOW_MEMBER_DIRECTORY,
      useFactory: (
        database: SqlDatabase | undefined,
      ): JobWorkflowMemberDirectory =>
        database
          ? new PostgresJobWorkflowMemberDirectory(database)
          : new UnconfiguredJobWorkflowMemberDirectory(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: JOB_WORKFLOW_AUDIT_SINK,
      useFactory: (database: SqlDatabase | undefined): JobWorkflowAuditSink =>
        database
          ? new PostgresAuditSink(database)
          : new NoopJobWorkflowAuditSink(),
      inject: [POSTGRES_DATABASE],
    },
    { provide: JOB_WORKFLOW_CLOCK, useValue: systemJobWorkflowClock },
    {
      provide: JOB_WORKFLOW_ID_GENERATOR,
      useValue: secureJobWorkflowIdGenerator,
    },
    {
      provide: JobWorkflowService,
      useFactory: (
        store: JobWorkflowStore,
        memberDirectory: JobWorkflowMemberDirectory,
        siteDirectory: JobWorkflowSiteDirectory,
        auditSink: JobWorkflowAuditSink,
        clock: JobWorkflowClock,
        idGenerator: JobWorkflowIdGenerator,
      ) =>
        new JobWorkflowService({
          store,
          memberDirectory,
          siteDirectory,
          auditSink,
          clock,
          idGenerator,
        }),
      inject: [
        JOB_WORKFLOW_STORE,
        JOB_WORKFLOW_MEMBER_DIRECTORY,
        SiteRegisterService,
        JOB_WORKFLOW_AUDIT_SINK,
        JOB_WORKFLOW_CLOCK,
        JOB_WORKFLOW_ID_GENERATOR,
      ],
    },
  ],
  exports: [JobWorkflowService],
})
export class JobWorkflowModule {}
