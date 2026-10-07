import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { AuthModule } from './identity/auth.module';
import { ApprovedSnapshotModule } from './approved-snapshot/approved-snapshot.module';
import { JobWorkflowModule } from './job-workflow/job-workflow.module';
import { SiteRegisterModule } from './site-register/site-register.module';
import { SyncModule } from './sync/sync.module';
import { DatabaseModule } from './database/database.module';
import { ReviewModule } from './review/review.module';
import { ReportGenerationModule } from './reports/report-generation.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    ApprovedSnapshotModule,
    SiteRegisterModule,
    JobWorkflowModule,
    SyncModule,
    ReviewModule,
    ReportGenerationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
